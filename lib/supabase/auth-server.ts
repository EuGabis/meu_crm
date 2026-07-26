import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Cliente Supabase ligado à sessão do usuário (chave anon + cookies).
 * Use em Server Components, layouts, route handlers de auth e no middleware
 * (indiretamente). Decisões de acesso devem usar `.auth.getUser()`, que
 * revalida o JWT no servidor do Supabase — não confie só no cookie.
 */
export async function createSupabaseAuthServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chamado de um Server Component (cookies read-only). O middleware
            // é quem persiste a renovação da sessão — pode ignorar aqui.
          }
        },
      },
    }
  );
}
