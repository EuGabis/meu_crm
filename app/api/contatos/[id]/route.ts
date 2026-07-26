import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  erroObservacoesAusente,
  mapContatoRow,
  type DbContatoRow,
} from "@/lib/contatos/mapper";

const CAMPOS_TEXTO = ["nome", "email", "telefone", "empresa", "cargo", "status", "origem", "observacoes"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const campo of CAMPOS_TEXTO) {
    if (typeof body[campo] === "string") update[campo] = body[campo];
  }
  if (typeof body.valorEstimado === "number") update.valor_estimado = body.valorEstimado;

  const supabase = createSupabaseServerClient();
  let { data, error } = await supabase
    .from("contacts")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  // Compatível com o banco antes da migração de `observacoes`.
  if (erroObservacoesAusente(error)) {
    const { observacoes: _omit, ...semObs } = update;
    void _omit;
    ({ data, error } = await supabase
      .from("contacts")
      .update(semObs)
      .eq("id", id)
      .select()
      .single());
  }

  if (error) {
    console.error("[contatos/patch]", error);
    return NextResponse.json(
      { error: "Não foi possível atualizar o contato." },
      { status: 500 }
    );
  }

  return NextResponse.json({ contato: mapContatoRow(data as DbContatoRow) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("contacts").delete().eq("id", id);

  if (error) {
    console.error("[contatos/delete]", error);
    return NextResponse.json(
      { error: "Não foi possível excluir o contato." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
