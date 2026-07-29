import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  sendTextMessage,
  sendMediaMessage,
  sendAudioMessage,
} from "@/lib/evolution/client";
import { uploadWhatsappMedia } from "@/lib/whatsapp/media-store";

function horaDe(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createSupabaseServerClient();

  const { data: conversation, error: convError } = await supabase
    .from("whatsapp_conversations")
    .select("id, remote_jid")
    .eq("id", id)
    .single();

  if (convError || !conversation) {
    return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  }

  const sentAt = new Date().toISOString();
  const contentType = req.headers.get("content-type") ?? "";

  // ------------------------------------------------------------------ MÍDIA
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("arquivo");
    const ehAudio = form.get("tipo") === "audio";
    const caption =
      typeof form.get("texto") === "string" ? String(form.get("texto")) : "";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo ausente." }, { status: 400 });
    }

    const mime = file.type || (ehAudio ? "audio/webm" : "image/jpeg");
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mediaType = ehAudio ? "audio" : "image";

    try {
      const path = await uploadWhatsappMedia(supabase, conversation.id, base64, mime);

      const { evolutionMessageId } = ehAudio
        ? await sendAudioMessage(conversation.remote_jid, base64)
        : await sendMediaMessage(conversation.remote_jid, {
            mediatype: "image",
            mimetype: mime,
            base64,
            fileName: file.name || `foto.${mime.split("/")[1] ?? "jpg"}`,
            caption,
          });

      const { data: message, error: msgError } = await supabase
        .from("whatsapp_messages")
        .insert({
          conversation_id: conversation.id,
          evolution_message_id: evolutionMessageId,
          direction: "outbound",
          sender: "atendente",
          body: caption,
          status: "sent",
          sent_at: sentAt,
          media_type: mediaType,
          media_path: path,
          mime_type: mime,
        })
        .select()
        .single();

      if (msgError) throw msgError;

      await supabase
        .from("whatsapp_conversations")
        .update({ last_message_at: sentAt, atendido_por: "humano", updated_at: sentAt })
        .eq("id", conversation.id);

      return NextResponse.json({
        mensagem: {
          id: message.id,
          autor: "atendente",
          texto: caption,
          hora: horaDe(sentAt),
          dataISO: sentAt,
          tipo: ehAudio ? "audio" : "imagem",
          mediaUrl: `/api/whatsapp/media?path=${encodeURIComponent(path)}`,
          mimeType: mime,
        },
      });
    } catch (error) {
      console.error("[whatsapp/enviar-midia]", error);
      return NextResponse.json(
        { error: "Falha ao enviar a mídia pelo WhatsApp." },
        { status: 502 }
      );
    }
  }

  // ------------------------------------------------------------------ TEXTO
  const body = await req.json().catch(() => ({}));
  const texto = typeof body.texto === "string" ? body.texto.trim() : "";

  if (!texto) {
    return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
  }

  try {
    const { evolutionMessageId } = await sendTextMessage(conversation.remote_jid, texto);

    const { data: message, error: msgError } = await supabase
      .from("whatsapp_messages")
      .insert({
        conversation_id: conversation.id,
        evolution_message_id: evolutionMessageId,
        direction: "outbound",
        sender: "atendente",
        body: texto,
        status: "sent",
        sent_at: sentAt,
      })
      .select()
      .single();

    if (msgError) throw msgError;

    await supabase
      .from("whatsapp_conversations")
      .update({ last_message_at: sentAt, atendido_por: "humano", updated_at: sentAt })
      .eq("id", conversation.id);

    return NextResponse.json({
      mensagem: {
        id: message.id,
        autor: "atendente",
        texto,
        hora: horaDe(sentAt),
        dataISO: sentAt,
        tipo: "texto",
      },
    });
  } catch (error) {
    console.error("[whatsapp/enviar]", error);

    await supabase.from("whatsapp_messages").insert({
      conversation_id: conversation.id,
      evolution_message_id: `failed-${crypto.randomUUID()}`,
      direction: "outbound",
      sender: "atendente",
      body: texto,
      status: "failed",
      sent_at: sentAt,
    });

    return NextResponse.json(
      { error: "Falha ao enviar mensagem pelo WhatsApp." },
      { status: 502 }
    );
  }
}
