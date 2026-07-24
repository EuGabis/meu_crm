"use client";

import { useState } from "react";
import { Plus, ArrowRight, Zap } from "lucide-react";

import { Topbar } from "@/components/app/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AUTOMACOES } from "@/lib/mock-data";
import type { Automacao } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

export default function AutomacoesPage() {
  const [automacoes, setAutomacoes] = useState<Automacao[]>(AUTOMACOES);

  function alternar(id: string) {
    setAutomacoes((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ativa: !a.ativa } : a))
    );
  }

  const ativas = automacoes.filter((a) => a.ativa).length;
  const execucoes = automacoes.reduce((s, a) => s + a.execucoes, 0);

  return (
    <>
      <Topbar
        title="Automações"
        description={`${ativas} ativas · ${execucoes} execuções no total`}
      />

      <div className="space-y-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Regras que disparam ações a partir de eventos no CRM.
          </p>
          <Button variant="brand" className="gap-1.5">
            <Plus className="size-4" />
            Nova automação
          </Button>
        </div>

        <div className="reveal divide-y divide-border overflow-hidden rounded-lg border border-border bg-card panel-sm">
          {automacoes.map((a) => (
            <div
              key={a.id}
              className="flex flex-col gap-3 p-4 transition-colors hover:bg-elevated/50 sm:flex-row sm:items-center"
            >
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-md border transition-colors",
                  a.ativa
                    ? "border-brand/30 bg-brand-muted text-brand"
                    : "border-border bg-muted text-muted-foreground"
                )}
              >
                <Zap className="size-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{a.nome}</p>
                  <Badge variant={a.ativa ? "won" : "default"}>
                    {a.ativa ? "Ativa" : "Pausada"}
                  </Badge>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="rounded-sm bg-muted px-1.5 py-0.5 text-foreground">
                    {a.gatilho}
                  </span>
                  <ArrowRight className="size-3" />
                  <span className="rounded-sm bg-muted px-1.5 py-0.5 text-foreground">
                    {a.acao}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-6 sm:gap-8">
                <div className="text-right">
                  <p className="tabular font-display text-sm font-semibold">
                    {a.execucoes}
                  </p>
                  <p className="text-[11px] text-muted-foreground">execuções</p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="tabular text-sm">{formatDate(a.criadaEm)}</p>
                  <p className="text-[11px] text-muted-foreground">criada</p>
                </div>
                <Switch
                  checked={a.ativa}
                  onCheckedChange={() => alternar(a.id)}
                  label={`Ativar ${a.nome}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Switch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: () => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onCheckedChange}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200",
        checked ? "border-brand bg-brand" : "border-border bg-input"
      )}
    >
      <span
        className={cn(
          "inline-block size-3.5 rounded-full transition-transform duration-200",
          checked ? "translate-x-4 bg-brand-foreground" : "translate-x-0.5 bg-subtle"
        )}
      />
    </button>
  );
}
