import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { fetchGroups } from "@/lib/evolution/client";
import type { DbGrupoRow } from "../data/mapper";
import type { GrupoEvolution } from "../types";

async function usuarioAtualId(): Promise<string | null> {
  const auth = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  return user?.id ?? null;
}

/**
 * Lista os grupos do WhatsApp conectado (via Evolution) e marca quais já estão
 * cadastrados para o usuário — para a tela oferecer "adicionar com 1 clique".
 */
export async function GET() {
  const userId = await usuarioAtualId();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let grupos;
  try {
    grupos = await fetchGroups();
  } catch (error) {
    console.error("[grupos/sincronizar]", error);
    return NextResponse.json(
      {
        error:
          "Não foi possível buscar os grupos na Evolution API. Verifique se o WhatsApp está conectado.",
      },
      { status: 502 }
    );
  }

  const supabase = createSupabaseServerClient();
  const { data: cadastrados } = await supabase
    .from("whatsapp_groups")
    .select("identificador_grupo")
    .eq("user_id", userId);

  const jaCadastrados = new Set(
    ((cadastrados as Pick<DbGrupoRow, "identificador_grupo">[]) ?? []).map(
      (g) => g.identificador_grupo
    )
  );

  const resultado: GrupoEvolution[] = grupos.map((g) => ({
    id: g.id,
    nome: g.subject,
    participantes: g.size,
    jaCadastrado: jaCadastrados.has(g.id),
  }));

  return NextResponse.json({ grupos: resultado });
}
