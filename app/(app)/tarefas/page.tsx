"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Circle,
  CheckCircle2,
  Phone,
  Mail,
  Video,
  StickyNote,
  CheckSquare,
  type LucideIcon,
} from "lucide-react";

import { Topbar } from "@/components/app/topbar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TAREFAS } from "@/lib/tarefas-data";
import { getContato, getUsuario, USUARIO_ATUAL } from "@/lib/mock-data";
import {
  PRIORIDADE_LABEL,
  type Prioridade,
  type Tarefa,
  type TipoAtividade,
} from "@/lib/types";
import { cn, formatDate, initials } from "@/lib/utils";

const HOJE = new Date(2026, 6, 24);

const TIPO_ICON: Record<TipoAtividade, LucideIcon> = {
  ligacao: Phone,
  email: Mail,
  reuniao: Video,
  nota: StickyNote,
  tarefa: CheckSquare,
};

const PRIO_BARRA: Record<Prioridade, string> = {
  alta: "bg-foreground",
  media: "bg-subtle",
  baixa: "bg-border",
};

type Filtro = "todas" | "minhas" | "alta";
const FILTROS: { id: Filtro; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "minhas", label: "Minhas" },
  { id: "alta", label: "Alta prioridade" },
];

function diasDeHoje(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return Math.round((d.getTime() - HOJE.getTime()) / 86400000);
}

export default function TarefasPage() {
  const [tarefas, setTarefas] = useState<Tarefa[]>(TAREFAS);
  const [filtro, setFiltro] = useState<Filtro>("todas");

  function alternar(id: string) {
    setTarefas((prev) =>
      prev.map((t) => (t.id === id ? { ...t, concluida: !t.concluida } : t))
    );
  }

  const filtradas = useMemo(
    () =>
      tarefas.filter((t) => {
        if (filtro === "minhas") return t.responsavelId === USUARIO_ATUAL.id;
        if (filtro === "alta") return t.prioridade === "alta";
        return true;
      }),
    [tarefas, filtro]
  );

  const grupos = useMemo(() => {
    const g = {
      atrasadas: [] as Tarefa[],
      hoje: [] as Tarefa[],
      proximas: [] as Tarefa[],
      concluidas: [] as Tarefa[],
    };
    for (const t of filtradas) {
      if (t.concluida) g.concluidas.push(t);
      else {
        const d = diasDeHoje(t.vencimento);
        if (d < 0) g.atrasadas.push(t);
        else if (d === 0) g.hoje.push(t);
        else g.proximas.push(t);
      }
    }
    return g;
  }, [filtradas]);

  const atrasadas = grupos.atrasadas.length;
  const hoje = grupos.hoje.length;

  const SECOES: { key: keyof typeof grupos; label: string; forte?: boolean }[] =
    [
      { key: "atrasadas", label: "Atrasadas", forte: true },
      { key: "hoje", label: "Hoje" },
      { key: "proximas", label: "Próximas" },
      { key: "concluidas", label: "Concluídas" },
    ];

  return (
    <>
      <Topbar
        title="Tarefas & lembretes"
        description={`${atrasadas} atrasadas · ${hoje} para hoje`}
      />

      <div className="space-y-4 p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                aria-pressed={filtro === f.id}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  filtro === f.id
                    ? "bg-brand-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Button variant="brand" className="gap-1.5">
            <Plus className="size-4" />
            Nova tarefa
          </Button>
        </div>

        <div className="mx-auto max-w-3xl space-y-5">
          {SECOES.map((s) => {
            const itens = grupos[s.key];
            if (itens.length === 0) return null;
            return (
              <section key={s.key}>
                <div className="mb-2 flex items-center gap-2">
                  <h2 className="font-display text-sm font-semibold tracking-tight">
                    {s.label}
                  </h2>
                  <span className="tabular rounded-sm bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {itens.length}
                  </span>
                </div>
                <div className="overflow-hidden rounded-lg border border-border bg-card divide-y divide-border panel-sm">
                  {itens.map((t) => (
                    <TarefaRow key={t.id} tarefa={t} onToggle={alternar} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}

function TarefaRow({
  tarefa: t,
  onToggle,
}: {
  tarefa: Tarefa;
  onToggle: (id: string) => void;
}) {
  const Icon = TIPO_ICON[t.tipo];
  const contato = t.contatoId ? getContato(t.contatoId) : undefined;
  const resp = getUsuario(t.responsavelId);
  const atrasada = !t.concluida && diasDeHoje(t.vencimento) < 0;

  return (
    <div className="flex items-center gap-3 p-3">
      <span
        className={cn("h-8 w-0.5 shrink-0 rounded-full", PRIO_BARRA[t.prioridade])}
        aria-hidden
      />
      <button
        onClick={() => onToggle(t.id)}
        aria-label={t.concluida ? "Reabrir tarefa" : "Concluir tarefa"}
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      >
        {t.concluida ? (
          <CheckCircle2 className="size-5 text-brand" />
        ) : (
          <Circle className="size-5" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-medium",
            t.concluida && "text-muted-foreground line-through"
          )}
        >
          {t.titulo}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Icon className="size-3" />
            {PRIORIDADE_LABEL[t.prioridade]}
          </span>
          {contato ? <span>· {contato.empresa}</span> : null}
          <span
            className={cn("tabular", atrasada && "font-semibold text-foreground")}
          >
            · {formatDate(t.vencimento)}
            {atrasada ? " · atrasada" : ""}
          </span>
        </div>
      </div>

      {resp ? (
        <Avatar className="size-7 shrink-0">
          <AvatarFallback className="text-[10px]">
            {initials(resp.nome)}
          </AvatarFallback>
        </Avatar>
      ) : null}
    </div>
  );
}
