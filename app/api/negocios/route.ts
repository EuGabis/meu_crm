import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapDealRow, type DbDealRow } from "@/lib/negocios/mapper";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("[negocios/get]", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os negócios." },
      { status: 500 }
    );
  }

  const negocios = (data as DbDealRow[]).map(mapDealRow);
  return NextResponse.json({ negocios });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const titulo = typeof body.titulo === "string" ? body.titulo.trim() : "";
  const contatoId = typeof body.contatoId === "string" ? body.contatoId.trim() : "";
  const empresa = typeof body.empresa === "string" ? body.empresa.trim() : "";
  const valor = typeof body.valor === "number" ? body.valor : 0;
  const fechamentoPrevisto =
    typeof body.fechamentoPrevisto === "string" && body.fechamentoPrevisto
      ? body.fechamentoPrevisto
      : null;

  if (!titulo || !contatoId) {
    return NextResponse.json(
      { error: "Título e contato são obrigatórios." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("deals")
    .insert({
      titulo,
      contact_id: contatoId,
      empresa,
      valor,
      fechamento_previsto: fechamentoPrevisto,
    })
    .select()
    .single();

  if (error) {
    console.error("[negocios/post]", error);
    return NextResponse.json(
      { error: "Não foi possível criar o negócio." },
      { status: 500 }
    );
  }

  return NextResponse.json({ negocio: mapDealRow(data as DbDealRow) });
}
