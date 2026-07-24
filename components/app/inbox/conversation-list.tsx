"use client";

import { useMemo, useState } from "react";
import { Search, Bot } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import type { Conversa } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

type Filtro = "abertas" | "naolidas" | "encerradas";

const FILTROS: { id: Filtro; label: string }[] = [
  { id: "abertas", label: "Abertas" },
  { id: "naolidas", label: "Não lidas" },
  { id: "encerradas", label: "Encerradas" },
];

export function ConversationList({
  conversas,
  selId,
  onSelect,
  className,
}: {
  conversas: Conversa[];
  selId: string;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("abertas");

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return conversas.filter((c) => {
      const matchBusca =
        !q || c.nome.toLowerCase().includes(q) || c.telefone.includes(q);
      const matchFiltro =
        (filtro === "abertas" && c.status !== "encerrada") ||
        (filtro === "naolidas" && c.naoLidas > 0 && c.status !== "encerrada") ||
        (filtro === "encerradas" && c.status === "encerrada");
      return matchBusca && matchFiltro;
    });
  }, [conversas, busca, filtro]);

  const naoLidasTotal = conversas.reduce((s, c) => s + c.naoLidas, 0);

  return (
    <div className={cn("flex min-h-0 flex-col bg-surface", className)}>
      <div className="space-y-3 border-b border-border p-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold tracking-tight">
            Conversas
          </h2>
          {naoLidasTotal > 0 ? (
            <span className="tabular rounded-sm bg-brand-muted px-1.5 py-0.5 text-[11px] font-medium text-brand">
              {naoLidasTotal} não lidas
            </span>
          ) : null}
        </div>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar conversa"
            className="h-8 pl-8"
          />
        </label>
        <div className="flex gap-1">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              aria-pressed={filtro === f.id}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                filtro === f.id
                  ? "bg-brand-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {lista.map((c) => {
          const ativa = c.id === selId;
          const ultima = c.mensagens[c.mensagens.length - 1];
          const prefixo =
            ultima?.autor === "cliente"
              ? ""
              : ultima?.autor === "agente"
                ? "🤖 "
                : "Você: ";
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={cn(
                "flex w-full items-start gap-3 border-b border-border p-3 text-left transition-colors",
                ativa ? "bg-brand-muted" : "hover:bg-muted"
              )}
            >
              <div className="relative shrink-0">
                <Avatar>
                  <AvatarFallback>{initials(c.nome)}</AvatarFallback>
                </Avatar>
                {c.online ? (
                  <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-surface bg-status-won" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{c.nome}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {c.ultimaHora}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-muted-foreground">
                    {prefixo}
                    {ultima?.texto}
                  </p>
                  {c.naoLidas > 0 ? (
                    <span className="tabular flex size-4 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-brand-foreground">
                      {c.naoLidas}
                    </span>
                  ) : null}
                </div>
                {c.status === "encerrada" ? (
                  <span className="mt-1 inline-flex items-center rounded-sm bg-status-lost-surface px-1.5 py-0.5 text-[10px] text-status-lost">
                    Encerrada
                  </span>
                ) : c.atendidoPor === "agente" ? (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-sm bg-elevated px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    <Bot className="size-3 text-brand" />
                    {c.agenteNome} respondendo
                  </span>
                ) : c.atendidoPor === "aguardando" ? (
                  <span className="mt-1 inline-flex items-center rounded-sm bg-status-open-surface px-1.5 py-0.5 text-[10px] text-status-open">
                    Aguardando resposta
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}

        {lista.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Nenhuma conversa encontrada.
          </p>
        ) : null}
      </div>
    </div>
  );
}
