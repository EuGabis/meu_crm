import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapEventRow, type DbEventRow } from "../data/mapper";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("inicio", { ascending: true });

  if (error) {
    console.error("[eventos/get]", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os eventos." },
      { status: 500 }
    );
  }

  const eventos = (data as DbEventRow[]).map(mapEventRow);
  return NextResponse.json({ eventos });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const titulo = typeof body.titulo === "string" ? body.titulo.trim() : "";
  const inicio = typeof body.inicio === "string" ? body.inicio : "";
  const fim = typeof body.fim === "string" ? body.fim : "";
  const tipo = typeof body.tipo === "string" ? body.tipo : "reuniao";
  const local = typeof body.local === "string" ? body.local.trim() : "";
  const contatoId =
    typeof body.contatoId === "string" && body.contatoId ? body.contatoId : null;

  if (!titulo || !inicio || !fim) {
    return NextResponse.json(
      { error: "Título, início e fim são obrigatórios." },
      { status: 400 }
    );
  }

  if (new Date(fim).getTime() <= new Date(inicio).getTime()) {
    return NextResponse.json(
      { error: "O fim precisa ser depois do início." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .insert({ titulo, inicio, fim, tipo, local, contact_id: contatoId })
    .select()
    .single();

  if (error) {
    console.error("[eventos/post]", error);
    return NextResponse.json(
      { error: "Não foi possível criar o evento." },
      { status: 500 }
    );
  }

  return NextResponse.json({ evento: mapEventRow(data as DbEventRow) });
}
