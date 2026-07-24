"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Users, Plug, Bot, Bell, type LucideIcon } from "lucide-react";

import { Topbar } from "@/components/app/topbar";
import { cn } from "@/lib/utils";

const SECOES: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/configuracoes/conta", label: "Conta", icon: User },
  { href: "/configuracoes/equipe", label: "Equipe & permissões", icon: Users },
  { href: "/configuracoes/integracoes", label: "Integrações", icon: Plug },
  { href: "/configuracoes/agentes", label: "Agentes de IA", icon: Bot },
  { href: "/configuracoes/notificacoes", label: "Notificações", icon: Bell },
];

export default function ConfiguracoesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <>
      <Topbar
        title="Configurações"
        description="Conta, equipe, integrações e agentes de IA"
      />

      <div className="p-4 md:p-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Sub-menu */}
          <nav className="shrink-0 lg:w-60">
            <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {SECOES.map((s) => {
                const active = pathname === s.href;
                const Icon = s.icon;
                return (
                  <li key={s.href}>
                    <Link
                      href={s.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-brand-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-4 shrink-0 transition-colors",
                          active
                            ? "text-brand"
                            : "text-subtle group-hover:text-foreground"
                        )}
                      />
                      {s.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Conteúdo da seção */}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </>
  );
}
