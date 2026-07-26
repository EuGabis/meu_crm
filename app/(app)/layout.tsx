import { redirect } from "next/navigation";

import { Sidebar } from "@/components/app/sidebar";
import { MobileNav } from "@/components/app/mobile-nav";
import { SidebarProvider } from "@/components/app/sidebar-context";
import { UsuarioProvider } from "@/components/app/user-context";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Defesa em profundidade: além do middleware, revalida a sessão no servidor.
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const usuario = {
    nome:
      (user.user_metadata?.nome as string | undefined)?.trim() ||
      user.email ||
      "Usuário",
    email: user.email ?? "",
  };

  return (
    <UsuarioProvider usuario={usuario}>
      <SidebarProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
              {children}
            </main>
          </div>
          <MobileNav />
        </div>
      </SidebarProvider>
    </UsuarioProvider>
  );
}
