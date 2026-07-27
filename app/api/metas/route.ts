import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface DbMetaRow {
  id: string;
  alvo_receita: number;
  alvo_negocios: number;
}

const META_PADRAO = { alvoReceita: 0, alvoNegocios: 0 };

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("metas")
    .select("*")
    .limit(1)
    .maybeSingle();

  // Tabela ausente (migração não rodada) → devolve padrão em vez de quebrar.
  if (error) return NextResponse.json({ meta: META_PADRAO });

  const row = data as DbMetaRow | null;
  return NextResponse.json({
    meta: row
      ? { alvoReceita: Number(row.alvo_receita) || 0, alvoNegocios: row.alvo_negocios || 0 }
      : META_PADRAO,
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const alvoReceita =
    typeof body.alvoReceita === "number" && body.alvoReceita >= 0
      ? Math.round(body.alvoReceita)
      : 0;
  const alvoNegocios =
    typeof body.alvoNegocios === "number" && body.alvoNegocios >= 0
      ? Math.round(body.alvoNegocios)
      : 0;

  const supabase = createSupabaseServerClient();
  const { data: existente } = await supabase
    .from("metas")
    .select("id")
    .limit(1)
    .maybeSingle();

  const valores = {
    alvo_receita: alvoReceita,
    alvo_negocios: alvoNegocios,
    atualizado_em: new Date().toISOString(),
  };

  const resultado = existente
    ? await supabase.from("metas").update(valores).eq("id", (existente as { id: string }).id).select().single()
    : await supabase.from("metas").insert(valores).select().single();

  if (resultado.error) {
    console.error("[metas/put]", resultado.error);
    return NextResponse.json(
      {
        error:
          "Não foi possível salvar a meta. Confirme que a tabela `metas` existe (rode docs/sql/2026-07-27-metas.sql).",
      },
      { status: 500 }
    );
  }

  const row = resultado.data as DbMetaRow;
  return NextResponse.json({
    meta: { alvoReceita: Number(row.alvo_receita) || 0, alvoNegocios: row.alvo_negocios || 0 },
  });
}
