import "server-only";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

/**
 * Id do usuário logado (revalida o JWT no Supabase via getUser).
 * Retorna null se não houver sessão válida.
 */
export async function currentUserId(): Promise<string | null> {
  const auth = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  return user?.id ?? null;
}
