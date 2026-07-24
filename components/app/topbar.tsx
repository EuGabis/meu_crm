"use client";

import { Search, Plus, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/app/notification-bell";
import { useSidebar } from "@/components/app/sidebar-context";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { USUARIO_ATUAL } from "@/lib/mock-data";
import { initials } from "@/lib/utils";

interface TopbarProps {
  title: string;
  description?: string;
}

export function Topbar({ title, description }: TopbarProps) {
  const { collapsed, toggle } = useSidebar();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border-strong bg-surface/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/80 md:gap-4 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        aria-pressed={collapsed}
        className="shrink-0 max-md:hidden"
      >
        {collapsed ? (
          <PanelLeftOpen className="size-4" />
        ) : (
          <PanelLeftClose className="size-4" />
        )}
      </Button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-base font-semibold tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="truncate text-xs text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      <div className="hidden items-center sm:flex">
        <label className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Buscar contatos, negócios…"
            aria-label="Buscar"
            className="h-9 w-56 rounded-md border border-input bg-background pl-8 pr-3 text-sm transition-colors placeholder:text-muted-foreground hover:border-border-strong lg:w-72"
          />
        </label>
      </div>

      <Button variant="brand" size="sm" className="gap-1.5">
        <Plus className="size-4" />
        <span className="hidden sm:inline">Novo</span>
      </Button>

      <NotificationBell />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 rounded-md outline-none"
            aria-label="Menu do usuário"
          >
            <Avatar>
              <AvatarFallback>{initials(USUARIO_ATUAL.nome)}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <div className="normal-case">
              <p className="text-sm font-medium text-foreground">
                {USUARIO_ATUAL.nome}
              </p>
              <p className="text-xs font-normal tracking-normal text-muted-foreground">
                {USUARIO_ATUAL.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Perfil</DropdownMenuItem>
          <DropdownMenuItem>Configurações</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Sair</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
