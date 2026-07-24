import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapDealRow, type DbDealRow } from "@/lib/negocios/mapper";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.titulo === "string") update.titulo = body.titulo;
  if (typeof body.empresa === "string") update.empresa = body.empresa;
  if (typeof body.stage === "string") update.stage = body.stage;
  if (typeof body.valor === "number") update.valor = body.valor;
  if (typeof body.probabilidade === "number") update.probabilidade = body.probabilidade;
  if (typeof body.fechamentoPrevisto === "string") {
    update.fechamento_previsto = body.fechamentoPrevisto || null;
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("deals")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[negocios/patch]", error);
    return NextResponse.json(
      { error: "Não foi possível atualizar o negócio." },
      { status: 500 }
    );
  }

  return NextResponse.json({ negocio: mapDealRow(data as DbDealRow) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("deals").delete().eq("id", id);

  if (error) {
    console.error("[negocios/delete]", error);
    return NextResponse.json(
      { error: "Não foi possível excluir o negócio." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
