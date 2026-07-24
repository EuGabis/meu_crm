"use client";

import { useState } from "react";
import { Bot, MessageSquareText, Play, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AGENTES } from "@/lib/config-data";
import {
  CANAL_LABEL,
  MODELOS_IA,
  type Agente,
  type CanalAgente,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const CANAIS: CanalAgente[] = ["whatsapp", "site", "email"];

export default function AgentesPage() {
  const [agentes, setAgentes] = useState<Agente[]>(AGENTES);
  const [selId, setSelId] = useState(AGENTES[0].id);

  const sel = agentes.find((a) => a.id === selId)!;

  function atualizar(patch: Partial<Agente>) {
    setAgentes((prev) =>
      prev.map((a) => (a.id === selId ? { ...a, ...patch } : a))
    );
  }

  function toggleCanal(canal: CanalAgente) {
    const canais = sel.canais.includes(canal)
      ? sel.canais.filter((c) => c !== canal)
      : [...sel.canais, canal];
    atualizar({ canais });
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Agentes de IA
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure os agentes que atendem, agendam e tiram dúvidas
          automaticamente.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Lista de agentes */}
        <div className="space-y-2 lg:col-span-1">
          {agentes.map((a) => {
            const ativo = a.id === selId;
            return (
              <button
                key={a.id}
                onClick={() => setSelId(a.id)}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition-colors",
                  ativo
                    ? "border-brand/50 bg-brand-muted"
                    : "border-border bg-card hover:border-border-strong"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-elevated">
                    <Bot className="size-4 text-brand" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.nome}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.modelo}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      a.ativo ? "bg-status-won" : "bg-subtle"
                    )}
                    aria-label={a.ativo ? "Ativo" : "Pausado"}
                  />
                </div>
                <div className="mt-2.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="tabular">
                    {a.conversas} conversas/mês
                  </span>
                  <span className="tabular">{a.resolucao}% resolvidas</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Painel de configuração */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border bg-card panel-sm">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between gap-3 border-b border-border p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-display font-semibold tracking-tight">
                    {sel.nome}
                  </h3>
                  <Badge variant={sel.ativo ? "won" : "default"}>
                    {sel.ativo ? "Ativo" : "Pausado"}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {sel.descricao}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">Ativo</span>
                <Switch
                  checked={sel.ativo}
                  onCheckedChange={(v) => atualizar({ ativo: v })}
                  aria-label="Ativar agente"
                />
              </div>
            </div>

            <div className="space-y-5 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="ag-nome">Nome do agente</Label>
                  <Input
                    id="ag-nome"
                    value={sel.nome}
                    onChange={(e) => atualizar({ nome: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Modelo</Label>
                  <Select
                    value={sel.modelo}
                    onValueChange={(v) => atualizar({ modelo: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODELOS_IA.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-1.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-brand" />
                  <Label htmlFor="ag-persona">Persona & instruções</Label>
                </div>
                <Textarea
                  id="ag-persona"
                  value={sel.persona}
                  onChange={(e) => atualizar({ persona: e.target.value })}
                  className="min-h-32"
                />
                <p className="text-[11px] text-muted-foreground">
                  Define o tom e as regras do agente. Seja específico sobre o
                  que ele pode e não pode fazer.
                </p>
              </div>

              <div className="grid gap-1.5">
                <Label>Canais</Label>
                <div className="flex flex-wrap gap-2">
                  {CANAIS.map((c) => {
                    const on = sel.canais.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCanal(c)}
                        aria-pressed={on}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors",
                          on
                            ? "border-brand/50 bg-brand-muted text-foreground"
                            : "border-border bg-surface text-muted-foreground hover:border-border-strong"
                        )}
                      >
                        <MessageSquareText className="size-3.5" />
                        {CANAL_LABEL[c]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="ag-horario">Horário de atendimento</Label>
                  <Input
                    id="ag-horario"
                    value={sel.horario}
                    onChange={(e) => atualizar({ horario: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-elevated px-3">
                  <div className="py-2">
                    <p className="text-sm font-medium">Escalar para humano</p>
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      Transfere quando não souber resolver.
                    </p>
                  </div>
                  <Switch
                    checked={sel.escalaHumano}
                    onCheckedChange={(v) => atualizar({ escalaHumano: v })}
                    aria-label="Escalar para humano"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border p-4">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Play className="size-4" />
                Testar agente
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">
                  Descartar
                </Button>
                <Button variant="brand" size="sm">
                  Salvar agente
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
