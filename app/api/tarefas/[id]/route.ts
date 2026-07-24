import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapTaskRow, type DbTaskRow } from "@/lib/tarefas/mapper";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.titulo === "string") update.titulo = body.titulo;
  if (typeof body.prioridade === "string") update.prioridade = body.prioridade;
  if (typeof body.vencimento === "string") update.vencimento = body.vencimento;
  if (typeof body.tipo === "string") update.tipo = body.tipo;
  if (typeof body.concluida === "boolean") update.concluida = body.concluida;
  if ("contatoId" in body) update.contact_id = body.contatoId || null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[tarefas/patch]", error);
    return NextResponse.json(
      { error: "Não foi possível atualizar a tarefa." },
      { status: 500 }
    );
  }

  return NextResponse.json({ tarefa: mapTaskRow(data as DbTaskRow) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) {
    console.error("[tarefas/delete]", error);
    return NextResponse.json(
      { error: "Não foi possível excluir a tarefa." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
