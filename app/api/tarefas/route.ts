import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapTaskRow, type DbTaskRow } from "@/lib/tarefas/mapper";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("vencimento", { ascending: true });

  if (error) {
    console.error("[tarefas/get]", error);
    return NextResponse.json(
      { error: "Não foi possível carregar as tarefas." },
      { status: 500 }
    );
  }

  const tarefas = (data as DbTaskRow[]).map(mapTaskRow);
  return NextResponse.json({ tarefas });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const titulo = typeof body.titulo === "string" ? body.titulo.trim() : "";
  const prioridade = typeof body.prioridade === "string" ? body.prioridade : "media";
  const vencimento = typeof body.vencimento === "string" ? body.vencimento : "";
  const tipo = typeof body.tipo === "string" ? body.tipo : "tarefa";
  const contatoId =
    typeof body.contatoId === "string" && body.contatoId ? body.contatoId : null;

  if (!titulo || !vencimento) {
    return NextResponse.json(
      { error: "Título e vencimento são obrigatórios." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({ titulo, prioridade, vencimento, tipo, contact_id: contatoId })
    .select()
    .single();

  if (error) {
    console.error("[tarefas/post]", error);
    return NextResponse.json(
      { error: "Não foi possível criar a tarefa." },
      { status: 500 }
    );
  }

  return NextResponse.json({ tarefa: mapTaskRow(data as DbTaskRow) });
}
