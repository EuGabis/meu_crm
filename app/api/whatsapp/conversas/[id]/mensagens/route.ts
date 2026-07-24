import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendTextMessage } from "@/lib/evolution/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const texto = typeof body.texto === "string" ? body.texto.trim() : "";

  if (!texto) {
    return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
  }

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
        hora: new Date(sentAt).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
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
