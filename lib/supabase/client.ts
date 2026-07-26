import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para uso no browser (client components).
 * Usa a chave anon — nunca a service_role. A sessão fica em cookies
 * gerenciados pelo @supabase/ssr.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
