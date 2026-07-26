import "server-only";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

/**
 * Autoriza operações de gestão de usuários.
 *
 * Como ainda não há papéis (v1 "só login"), o padrão é: qualquer usuário
 * autenticado pode gerenciar acessos. Se a env `ADMIN_EMAILS` estiver definida
 * (lista separada por vírgula), a gestão passa a exigir que o e-mail logado
 * esteja nela — um trinco opcional até papéis existirem.
 */
export async function exigirAdmin(): Promise<
  { ok: true; email: string; id: string } | { ok: false; status: 401 | 403 }
> {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, status: 401 };

  const lista = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (lista.length > 0 && !lista.includes((user.email ?? "").toLowerCase())) {
    return { ok: false, status: 403 };
  }

  return { ok: true, email: user.email ?? "", id: user.id };
}
