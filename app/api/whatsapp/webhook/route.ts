import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { refreshInstanceFromEvolution, setInstanceStatus } from "@/lib/whatsapp/instance-store";
import { resolveOrCreateContact } from "@/lib/whatsapp/contact-link";
import { getMediaBase64 } from "@/lib/evolution/client";
import { uploadWhatsappMedia } from "@/lib/whatsapp/media-store";

interface EvolutionWebhookBody {
  event: string;
  instance: string;
  data: Record<string, unknown>;
}

function extractText(message: Record<string, unknown> | undefined): string | null {
  if (!message) return null;
  const conversation = message["conversation"];
  if (typeof conversation === "string") return conversation;
  const extended = message["extendedTextMessage"] as { text?: string } | undefined;
  if (extended?.text) return extended.text;
  return null;
}

function extractMedia(
  message: Record<string, unknown> | undefined
): { tipo: "image" | "audio"; mimetype: string; caption: string } | null {
  if (!message) return null;
  const img = message["imageMessage"] as
    | { mimetype?: string; caption?: string }
    | undefined;
  if (img) {
    return { tipo: "image", mimetype: img.mimetype ?? "image/jpeg", caption: img.caption ?? "" };
  }
  const aud = message["audioMessage"] as { mimetype?: string } | undefined;
  if (aud) {
    return { tipo: "audio", mimetype: aud.mimetype ?? "audio/ogg", caption: "" };
  }
  return null;
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("apikey");
  if (!token || token !== process.env.EVOLUTION_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  let body: EvolutionWebhookBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!body?.event) {
    return NextResponse.json({ error: "Evento ausente." }, { status: 400 });
  }

  try {
    if (body.event === "connection.update") {
      await handleConnectionUpdate(body.data ?? {});
    } else if (body.event === "messages.upsert") {
      await handleMessagesUpsert(body.data ?? {});
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[whatsapp/webhook]", error);
    return NextResponse.json({ error: "Erro ao processar webhook." }, { status: 500 });
  }
}

async function handleConnectionUpdate(data: Record<string, unknown>) {
  const state = (data?.state as string) ?? "close";
  if (state === "open") {
    await refreshInstanceFromEvolution();
  } else {
    await setInstanceStatus(state);
  }
}

async function handleMessagesUpsert(data: Record<string, unknown>) {
  const key = data?.key as { remoteJid?: string; fromMe?: boolean; id?: string } | undefined;
  const remoteJid = key?.remoteJid;
  if (!remoteJid || remoteJid.endsWith("@g.us")) return; // ignora grupos

  const message = data?.message as Record<string, unknown> | undefined;
  const text = extractText(message);
  const midia = extractMedia(message);
  if (!text && !midia) return; // ignora tipos ainda não suportados

  const messageId = key?.id;
  if (!messageId) return;

  const fromMe = key?.fromMe === true;
  const pushName = (data?.pushName as string) ?? null;
  const timestampRaw = data?.messageTimestamp as number | string | undefined;
  const sentAt = timestampRaw
    ? new Date(Number(timestampRaw) * 1000).toISOString()
    : new Date().toISOString();

  const supabase = createSupabaseServerClient();
  const phoneNumber = remoteJid.split("@")[0];

  const { data: conversation, error: convError } = await supabase
    .from("whatsapp_conversations")
    .upsert(
      {
        remote_jid: remoteJid,
        phone_number: phoneNumber,
        display_name: pushName,
        last_message_at: sentAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "remote_jid" }
    )
    .select()
    .single();

  if (convError) throw convError;

  if (!fromMe) {
    await supabase
      .from("whatsapp_conversations")
      .update({ unread_count: (conversation.unread_count ?? 0) + 1 })
      .eq("id", conversation.id);

    // Cliente respondeu: conversa encerrada volta a ficar aberta.
    await supabase
      .from("whatsapp_conversations")
      .update({ status: "aberta" })
      .eq("id", conversation.id);
  }

  if (!conversation.contact_id) {
    try {
      const contactId = await resolveOrCreateContact(supabase, phoneNumber, pushName);
      await supabase
        .from("whatsapp_conversations")
        .update({ contact_id: contactId })
        .eq("id", conversation.id);
    } catch (error) {
      console.error("[whatsapp/webhook] vínculo de contato falhou", error);
      // não bloqueia a gravação da mensagem
    }
  }

  let mediaType: string | null = null;
  let mediaPath: string | null = null;
  let mimeType: string | null = null;
  let body = text ?? "";

  if (midia) {
    mediaType = midia.tipo;
    mimeType = midia.mimetype;
    body = midia.caption;

    // Com base64:true no webhook, a Evolution manda o arquivo direto;
    // se não vier, buscamos sob demanda.
    let b64 =
      (message?.["base64"] as string | undefined) ??
      (data?.["base64"] as string | undefined) ??
      null;
    let mime = midia.mimetype;

    if (!b64) {
      const baixado = await getMediaBase64({ id: messageId, remoteJid, fromMe });
      if (baixado) {
        b64 = baixado.base64;
        mime = baixado.mimetype;
      }
    }

    if (b64) {
      try {
        mediaPath = await uploadWhatsappMedia(supabase, conversation.id, b64, mime);
        mimeType = mime;
      } catch (error) {
        console.error("[whatsapp/webhook] upload de mídia falhou", error);
      }
    }
  }

  const { error: msgError } = await supabase.from("whatsapp_messages").upsert(
    {
      conversation_id: conversation.id,
      evolution_message_id: messageId,
      direction: fromMe ? "outbound" : "inbound",
      sender: fromMe ? "atendente" : "cliente",
      body,
      status: "delivered",
      sent_at: sentAt,
      media_type: mediaType,
      media_path: mediaPath,
      mime_type: mimeType,
    },
    { onConflict: "evolution_message_id", ignoreDuplicates: true }
  );

  if (msgError) throw msgError;
}
