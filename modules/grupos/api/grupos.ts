import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { mapGrupoRow, type DbGrupoRow } from "../data/mapper";

/** Id do usuário logado (revalida o JWT no Supabase). */
async function usuarioAtualId(): Promise<string | null> {
  const auth = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  return user?.id ?? null;
}

export async function GET() {
  const userId = await usuarioAtualId();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("whatsapp_groups")
    .select("*")
    .eq("user_id", userId)
    .order("nome", { ascending: true });

  if (error) {
    console.error("[grupos/get]", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os grupos." },
      { status: 500 }
    );
  }

  const grupos = (data as DbGrupoRow[]).map(mapGrupoRow);
  return NextResponse.json({ grupos });
}

export async function POST(req: NextRequest) {
  const userId = await usuarioAtualId();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const nome = typeof body.nome === "string" ? body.nome.trim() : "";
  const identificadorGrupo =
    typeof body.identificadorGrupo === "string"
      ? body.identificadorGrupo.trim()
      : "";
  const ativo = typeof body.ativo === "boolean" ? body.ativo : true;

  if (!nome || !identificadorGrupo) {
    return NextResponse.json(
      { error: "Nome e identificador do grupo são obrigatórios." },
      { status: 400 }
    );
  }

  // Aceita tanto o JID completo quanto só o número — normaliza para @g.us.
  const jid = identificadorGrupo.includes("@")
    ? identificadorGrupo
    : `${identificadorGrupo}@g.us`;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("whatsapp_groups")
    .insert({
      user_id: userId,
      nome,
      identificador_grupo: jid,
      ativo,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Esse grupo já está cadastrado." },
        { status: 409 }
      );
    }
    console.error("[grupos/post]", error);
    return NextResponse.json(
      { error: "Não foi possível cadastrar o grupo." },
      { status: 500 }
    );
  }

  return NextResponse.json({ grupo: mapGrupoRow(data as DbGrupoRow) });
}
