import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.unreadCount === "number") update.unread_count = body.unreadCount;
  if (typeof body.atendidoPor === "string") update.atendido_por = body.atendidoPor;
  if (typeof body.contatoId === "string" && body.contatoId) {
    update.contact_id = body.contatoId;
  }
  if (body.status === "aberta" || body.status === "encerrada") {
    update.status = body.status;
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("whatsapp_conversations")
    .update(update)
    .eq("id", id);

  if (error) {
    console.error("[whatsapp/conversas/patch]", error);
    return NextResponse.json(
      { error: "Não foi possível atualizar a conversa." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
