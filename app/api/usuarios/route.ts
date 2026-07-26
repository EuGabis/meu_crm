import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { exigirAdmin } from "@/lib/auth/admin-guard";
import type { UsuarioAcesso } from "@/lib/types";

const MIN_SENHA = 8;

function mapUsuario(u: User): UsuarioAcesso {
  return {
    id: u.id,
    nome:
      (u.user_metadata?.nome as string | undefined)?.trim() || (u.email ?? ""),
    email: u.email ?? "",
    confirmado: Boolean(u.email_confirmed_at),
    criadoEm: u.created_at,
    ultimoAcesso: u.last_sign_in_at ?? null,
  };
}

export async function GET() {
  const auth = await exigirAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Sem permissão." }, { status: auth.status });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 });

  if (error) {
    console.error("[usuarios/get]", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os usuários." },
      { status: 500 }
    );
  }

  const usuarios = data.users
    .map(mapUsuario)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return NextResponse.json({ usuarios });
}

export async function POST(req: NextRequest) {
  const auth = await exigirAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Sem permissão." }, { status: auth.status });
  }

  const body = await req.json().catch(() => ({}));
  const nome = typeof body.nome === "string" ? body.nome.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const senha = typeof body.senha === "string" ? body.senha : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
  }
  if (senha.length < MIN_SENHA) {
    return NextResponse.json(
      { error: `A senha precisa ter ao menos ${MIN_SENHA} caracteres.` },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true, // criado pelo admin: já nasce confirmado
    user_metadata: { nome: nome || email },
  });

  if (error) {
    console.error("[usuarios/post]", error);
    const jaExiste = /already been registered|already exists/i.test(error.message);
    return NextResponse.json(
      {
        error: jaExiste
          ? "Já existe um usuário com esse e-mail."
          : "Não foi possível criar o acesso.",
      },
      { status: jaExiste ? 409 : 500 }
    );
  }

  return NextResponse.json({ usuario: mapUsuario(data.user) });
}
