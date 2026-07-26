import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  erroObservacoesAusente,
  mapContatoRow,
  type DbContatoRow,
} from "@/lib/contatos/mapper";

const STATUS_VALIDOS = ["lead", "ativo", "cliente", "inativo"];
const ORIGENS_VALIDAS = [
  "site",
  "indicacao",
  "anuncio",
  "evento",
  "outbound",
  "whatsapp",
  "outro",
];
const LIMITE = 2000;

type LinhaEntrada = Record<string, unknown>;

function texto(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const entrada: LinhaEntrada[] = Array.isArray(body.contatos)
    ? body.contatos
    : [];

  if (entrada.length === 0) {
    return NextResponse.json(
      { error: "Nenhum contato para importar." },
      { status: 400 }
    );
  }
  if (entrada.length > LIMITE) {
    return NextResponse.json(
      { error: `Importação limitada a ${LIMITE} contatos por vez.` },
      { status: 400 }
    );
  }

  const statusPadrao = STATUS_VALIDOS.includes(texto(body.status))
    ? texto(body.status)
    : "lead";
  const origemPadrao = ORIGENS_VALIDAS.includes(texto(body.origem))
    ? texto(body.origem)
    : "outbound";

  const linhas: Record<string, unknown>[] = [];
  let ignorados = 0;

  for (const item of entrada) {
    const nome = texto(item.nome);
    if (!nome) {
      // Sem nome não há contato — pula em vez de derrubar o lote inteiro.
      ignorados += 1;
      continue;
    }
    linhas.push({
      nome,
      email: texto(item.email),
      telefone: texto(item.telefone),
      empresa: texto(item.empresa),
      cargo: texto(item.cargo),
      observacoes: texto(item.observacoes),
      status: statusPadrao,
      origem: origemPadrao,
    });
  }

  if (linhas.length === 0) {
    return NextResponse.json(
      { error: "Nenhuma linha válida: todas estão sem nome.", ignorados },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();
  let { data, error } = await supabase.from("contacts").insert(linhas).select();

  // Compatível com o banco antes da migração de `observacoes`.
  if (erroObservacoesAusente(error)) {
    const semObs = linhas.map(({ observacoes: _omit, ...resto }) => {
      void _omit;
      return resto;
    });
    ({ data, error } = await supabase.from("contacts").insert(semObs).select());
  }

  if (error) {
    console.error("[contatos/import]", error);
    return NextResponse.json(
      { error: "Não foi possível importar os contatos." },
      { status: 500 }
    );
  }

  const contatos = (data as DbContatoRow[]).map(mapContatoRow);
  return NextResponse.json({
    criados: contatos.length,
    ignorados,
    contatos,
  });
}
