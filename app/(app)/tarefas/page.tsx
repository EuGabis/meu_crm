"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Circle,
  CheckCircle2,
  Phone,
  Mail,
  Video,
  StickyNote,
  CheckSquare,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

import { Topbar } from "@/components/app/topbar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NovaTarefaDialog } from "@/components/app/tarefas/nova-tarefa-dialog";
import { EditarTarefaDialog } from "@/components/app/tarefas/editar-tarefa-dialog";
import {
  PRIORIDADE_LABEL,
  type Contato,
  type Prioridade,
  type Tarefa,
  type TipoAtividade,
} from "@/lib/types";
import { cn, formatDate, initials } from "@/lib/utils";

const RESPONSAVEL_ATUAL = "Gabriel Pereira";

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

function diasDeHoje(iso: string, hoje: Date) {
  const d = new Date(iso + "T00:00:00");
  return Math.round((d.getTime() - hoje.getTime()) / 86400000);
}

export default function TarefasPage() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [editando, setEditando] = useState<Tarefa | null>(null);

  const hoje = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  useEffect(() => {
    fetch("/api/tarefas", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { tarefas: [] }))
      .then(({ tarefas: lista }) => setTarefas(lista ?? []));
    fetch("/api/contatos", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { contatos: [] }))
      .then(({ contatos: lista }) => setContatos(lista ?? []));
  }, []);

  function getContato(id?: string) {
    return id ? contatos.find((c) => c.id === id) : undefined;
  }

  async function alternar(t: Tarefa) {
    const concluida = !t.concluida;
    setTarefas((prev) => prev.map((x) => (x.id === t.id ? { ...x, concluida } : x)));
    await fetch(`/api/tarefas/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concluida }),
    });
  }

  function aoCriar(tarefa: Tarefa) {
    setTarefas((prev) => [...prev, tarefa]);
  }

  function aoSalvarEdicao(tarefa: Tarefa) {
    setTarefas((prev) => prev.map((t) => (t.id === tarefa.id ? tarefa : t)));
  }

  async function excluir(tarefa: Tarefa) {
    if (!window.confirm(`Excluir "${tarefa.titulo}" permanentemente?`)) return;
    const res = await fetch(`/api/tarefas/${tarefa.id}`, { method: "DELETE" });
    if (!res.ok) return;
    setTarefas((prev) => prev.filter((t) => t.id !== tarefa.id));
  }

  const filtradas = useMemo(
    () =>
      tarefas.filter((t) => {
        if (filtro === "minhas") return t.responsavelId === RESPONSAVEL_ATUAL;
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
        const d = diasDeHoje(t.vencimento, hoje);
        if (d < 0) g.atrasadas.push(t);
        else if (d === 0) g.hoje.push(t);
        else g.proximas.push(t);
      }
    }
    return g;
  }, [filtradas, hoje]);

  const atrasadas = grupos.atrasadas.length;
  const hojeCount = grupos.hoje.length;

  const SECOES: { key: keyof typeof grupos; label: string }[] = [
    { key: "atrasadas", label: "Atrasadas" },
    { key: "hoje", label: "Hoje" },
    { key: "proximas", label: "Próximas" },
    { key: "concluidas", label: "Concluídas" },
  ];

  return (
    <>
      <Topbar
        title="Tarefas & lembretes"
        description={`${atrasadas} atrasadas · ${hojeCount} para hoje`}
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
          <NovaTarefaDialog contatos={contatos} onCriada={aoCriar} />
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
                    <TarefaRow
                      key={t.id}
                      tarefa={t}
                      contato={getContato(t.contatoId)}
                      hoje={hoje}
                      onToggle={() => alternar(t)}
                      onEditar={() => setEditando(t)}
                      onExcluir={() => excluir(t)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <EditarTarefaDialog
        tarefa={editando}
        contatos={contatos}
        onOpenChange={(open) => {
          if (!open) setEditando(null);
        }}
        onSalvo={aoSalvarEdicao}
      />
    </>
  );
}

function TarefaRow({
  tarefa: t,
  contato,
  hoje,
  onToggle,
  onEditar,
  onExcluir,
}: {
  tarefa: Tarefa;
  contato: Contato | undefined;
  hoje: Date;
  onToggle: () => void;
  onEditar: () => void;
  onExcluir: () => void;
}) {
  const Icon = TIPO_ICON[t.tipo];
  const atrasada = !t.concluida && diasDeHoje(t.vencimento, hoje) < 0;

  return (
    <div className="flex items-center gap-3 p-3">
      <span
        className={cn("h-8 w-0.5 shrink-0 rounded-full", PRIO_BARRA[t.prioridade])}
        aria-hidden
      />
      <button
        onClick={onToggle}
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

      <Avatar className="size-7 shrink-0">
        <AvatarFallback className="text-[10px]">
          {initials(t.responsavelId)}
        </AvatarFallback>
      </Avatar>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Ações de ${t.titulo}`}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEditar}>Editar</DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={onExcluir}
          >
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
