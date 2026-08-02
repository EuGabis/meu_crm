import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { mapGrupoRow, type DbGrupoRow } from "../data/mapper";

async function usuarioAtualId(): Promise<string | null> {
  const auth = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  return user?.id ?? null;
}

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const userId = await usuarioAtualId();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const patch: Record<string, unknown> = {};
  if (typeof body.nome === "string" && body.nome.trim()) {
    patch.nome = body.nome.trim();
  }
  if (typeof body.ativo === "boolean") {
    patch.ativo = body.ativo;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("whatsapp_groups")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId) // isolamento por usuário
    .select()
    .single();

  if (error || !data) {
    console.error("[grupo/patch]", error);
    return NextResponse.json(
      { error: "Não foi possível atualizar o grupo." },
      { status: 500 }
    );
  }

  return NextResponse.json({ grupo: mapGrupoRow(data as DbGrupoRow) });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const userId = await usuarioAtualId();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const { id } = await params;

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("whatsapp_groups")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("[grupo/delete]", error);
    return NextResponse.json(
      { error: "Não foi possível excluir o grupo." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
