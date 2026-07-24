"use client";

import { useState } from "react";
import {
  Bell,
  UserPlus,
  TrendingUp,
  Bot,
  CheckSquare,
  Info,
  type LucideIcon,
} from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NOTIFICACOES } from "@/lib/notificacoes-data";
import type { Notificacao, NotifTipo } from "@/lib/types";
import { cn } from "@/lib/utils";

const TIPO_ICON: Record<NotifTipo, LucideIcon> = {
  lead: UserPlus,
  negocio: TrendingUp,
  agente: Bot,
  tarefa: CheckSquare,
  sistema: Info,
};

export function NotificationBell() {
  const [notifs, setNotifs] = useState<Notificacao[]>(NOTIFICACOES);

  const naoLidas = notifs.filter((n) => !n.lida).length;

  function marcarTodas() {
    setNotifs((prev) => prev.map((n) => ({ ...n, lida: true })));
  }
  function marcarUma(id: string) {
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label={`Notificações${naoLidas ? `, ${naoLidas} não lidas` : ""}`}
          className="relative flex size-9 items-center justify-center rounded-md border border-input bg-transparent text-foreground transition-colors hover:bg-muted"
        >
          <Bell className="size-4" />
          {naoLidas > 0 ? (
            <span className="tabular absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-brand-foreground">
              {naoLidas}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border p-3">
          <p className="font-display text-sm font-semibold tracking-tight">
            Notificações
          </p>
          {naoLidas > 0 ? (
            <button
              onClick={marcarTodas}
              className="text-xs font-medium text-brand hover:underline"
            >
              Marcar todas como lidas
            </button>
          ) : null}
        </div>

        <ul className="max-h-96 divide-y divide-border overflow-y-auto">
          {notifs.map((n) => {
            const Icon = TIPO_ICON[n.tipo];
            return (
              <li key={n.id}>
                <button
                  onClick={() => marcarUma(n.id)}
                  className={cn(
                    "flex w-full gap-3 p-3 text-left transition-colors hover:bg-muted",
                    !n.lida && "bg-brand-muted/40"
                  )}
                >
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-elevated">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <p className="flex-1 text-sm font-medium leading-snug">
                        {n.titulo}
                      </p>
                      {!n.lida ? (
                        <span className="mt-1 size-2 shrink-0 rounded-full bg-brand" />
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                      {n.descricao}
                    </p>
                    <p className="mt-1 text-[11px] text-subtle">{n.hora}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-border p-2">
          <button className="w-full rounded-md py-1.5 text-center text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            Ver todas as notificações
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
