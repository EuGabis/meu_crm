"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageCircle,
  Users,
  Columns3,
  CalendarDays,
  ListChecks,
  Target,
  BarChart3,
  Workflow,
  Settings,
  Users2,
  type LucideIcon,
} from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSidebar } from "@/components/app/sidebar-context";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: "/painel", label: "Painel", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: MessageCircle },
  { href: "/grupos", label: "Grupos", icon: Users2 },
  { href: "/contatos", label: "Contatos", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: Columns3 },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/tarefas", label: "Tarefas", icon: ListChecks },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/automacoes", label: "Automações", icon: Workflow },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed } = useSidebar();

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-300 ease-out md:flex",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Marca */}
        <div
          className={cn(
            "flex h-14 items-center gap-2.5 border-b border-border",
            collapsed ? "justify-center px-0" : "px-4"
          )}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-brand/30 bg-brand-muted font-display text-sm font-bold text-brand glow-brand">
            V
          </div>
          {!collapsed ? (
            <div className="leading-none">
              <div className="font-display text-sm font-semibold tracking-tight">
                CRM Vendas
              </div>
              <div className="text-[11px] text-muted-foreground">Comercial</div>
            </div>
          ) : null}
        </div>

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2">
          {!collapsed ? (
            <p className="px-2 pb-1.5 pt-2 text-[11px] font-medium uppercase tracking-wide text-subtle">
              Menu
            </p>
          ) : (
            <div className="h-3" />
          )}
          <ul className="flex flex-col gap-0.5">
            {NAV.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <NavLink item={item} active={active} collapsed={collapsed} />
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Rodapé: card de agentes (só quando expandida) */}
        {!collapsed ? (
          <div className="border-t border-border p-2">
            <div className="rounded-md border border-border bg-elevated p-2.5 panel-sm">
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-brand" />
                <p className="text-xs font-medium">Agentes de IA</p>
                <span className="ml-auto rounded-sm bg-brand-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand">
                  Em breve
                </span>
              </div>
              <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                Atendimento e suporte automáticos direto no CRM.
              </p>
            </div>
          </div>
        ) : null}
      </aside>
    </TooltipProvider>
  );
}

function NavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center rounded-md py-2 text-sm font-medium transition-colors duration-150",
        collapsed ? "justify-center px-0" : "gap-2.5 px-2.5",
        active
          ? "bg-brand-muted text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {active ? (
        <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand" />
      ) : null}
      <Icon
        className={cn(
          "size-4 shrink-0 transition-colors",
          active ? "text-brand" : "text-subtle group-hover:text-foreground"
        )}
      />
      {!collapsed ? item.label : null}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}
