import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapEventRow, type DbEventRow } from "@/lib/eventos/mapper";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.titulo === "string") update.titulo = body.titulo;
  if (typeof body.inicio === "string") update.inicio = body.inicio;
  if (typeof body.fim === "string") update.fim = body.fim;
  if (typeof body.tipo === "string") update.tipo = body.tipo;
  if (typeof body.local === "string") update.local = body.local;
  if ("contatoId" in body) update.contact_id = body.contatoId || null;

  if (
    typeof update.inicio === "string" &&
    typeof update.fim === "string" &&
    new Date(update.fim).getTime() <= new Date(update.inicio).getTime()
  ) {
    return NextResponse.json(
      { error: "O fim precisa ser depois do início." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[eventos/patch]", error);
    return NextResponse.json(
      { error: "Não foi possível atualizar o evento." },
      { status: 500 }
    );
  }

  return NextResponse.json({ evento: mapEventRow(data as DbEventRow) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("events").delete().eq("id", id);

  if (error) {
    console.error("[eventos/delete]", error);
    return NextResponse.json(
      { error: "Não foi possível excluir o evento." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
