import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  erroObservacoesAusente,
  mapContatoRow,
  type DbContatoRow,
} from "@/lib/contatos/mapper";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .order("nome", { ascending: true });

  if (error) {
    console.error("[contatos/get]", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os contatos." },
      { status: 500 }
    );
  }

  const contatos = (data as DbContatoRow[]).map(mapContatoRow);
  return NextResponse.json({ contatos });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const nome = typeof body.nome === "string" ? body.nome.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const telefone = typeof body.telefone === "string" ? body.telefone.trim() : "";
  const empresa = typeof body.empresa === "string" ? body.empresa.trim() : "";
  const cargo = typeof body.cargo === "string" ? body.cargo.trim() : "";
  const observacoes =
    typeof body.observacoes === "string" ? body.observacoes.trim() : "";

  if (!nome) {
    return NextResponse.json(
      { error: "O nome do contato é obrigatório." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();
  const base = { nome, email, telefone, empresa, cargo };
  let { data, error } = await supabase
    .from("contacts")
    .insert({ ...base, observacoes })
    .select()
    .single();

  // Compatível com o banco antes da migração de `observacoes`.
  if (erroObservacoesAusente(error)) {
    ({ data, error } = await supabase
      .from("contacts")
      .insert(base)
      .select()
      .single());
  }

  if (error) {
    console.error("[contatos/post]", error);
    return NextResponse.json(
      { error: "Não foi possível criar o contato." },
      { status: 500 }
    );
  }

  return NextResponse.json({ contato: mapContatoRow(data as DbContatoRow) });
}
