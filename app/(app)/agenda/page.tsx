"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarClock,
  Video,
  Phone,
  CheckSquare,
  User,
  type LucideIcon,
} from "lucide-react";

import { Topbar } from "@/components/app/topbar";
import { Button } from "@/components/ui/button";
import { WeekView, type DiaSemana } from "@/components/app/agenda/week-view";
import { MiniMonth } from "@/components/app/agenda/mini-month";
import { NovoEventoDialog } from "@/components/app/agenda/novo-evento-dialog";
import { EditarEventoDialog } from "@/components/app/agenda/editar-evento-dialog";
import { TIPO_LABEL, type Evento, type EventoTipo } from "@/lib/agenda-data";
import type { Contato, EventoAgenda } from "@/lib/types";
import { cn } from "@/lib/utils";

const LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const TIPO_ICON: Record<EventoTipo, LucideIcon> = {
  reuniao: Video,
  call: Phone,
  tarefa: CheckSquare,
  pessoal: User,
};

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function mondayOf(d: Date) {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function paraEventoSemana(ev: EventoAgenda, weekDates: Date[]): Evento | null {
  const inicio = new Date(ev.inicio);
  const fim = new Date(ev.fim);
  const diaIndex = weekDates.findIndex((d) => sameDay(d, inicio));
  if (diaIndex === -1) return null;
  return {
    id: ev.id,
    titulo: ev.titulo,
    dia: diaIndex,
    inicio: inicio.getHours() + inicio.getMinutes() / 60,
    fim: fim.getHours() + fim.getMinutes() / 60,
    tipo: ev.tipo,
    contatoId: ev.contatoId,
    local: ev.local,
  };
}

export default function AgendaPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [novoAberto, setNovoAberto] = useState(false);
  const [editando, setEditando] = useState<EventoAgenda | null>(null);

  const hoje = useMemo(() => new Date(), []);

  useEffect(() => {
    fetch("/api/eventos", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { eventos: [] }))
      .then(({ eventos: lista }) => setEventos(lista ?? []));
    fetch("/api/contatos", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { contatos: [] }))
      .then(({ contatos: lista }) => setContatos(lista ?? []));
  }, []);

  function aoCriar(evento: EventoAgenda) {
    setEventos((prev) => [...prev, evento]);
  }

  function aoSalvarEdicao(evento: EventoAgenda) {
    setEventos((prev) => prev.map((e) => (e.id === evento.id ? evento : e)));
  }

  const baseMonday = mondayOf(hoje);
  const monday = addDays(baseMonday, weekOffset * 7);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const dias: DiaSemana[] = weekDates.map((dt, i) => ({
    label: LABELS[i],
    num: dt.getDate(),
    isToday: sameDay(dt, hoje),
  }));

  const eventosSemana = eventos
    .map((e) => paraEventoSemana(e, weekDates))
    .filter((e): e is Evento => e !== null);

  const agoraHora = hoje.getHours() + hoje.getMinutes() / 60;
  const mostrarAgora = weekDates.some((d) => sameDay(d, hoje));

  const mesRaw = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(monday);
  const mesLabel = mesRaw.charAt(0).toUpperCase() + mesRaw.slice(1);

  const proximos = [...eventos]
    .filter((e) => new Date(e.inicio).getTime() >= hoje.getTime())
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
    .slice(0, 5);

  function selecionarEvento(evView: Evento) {
    const original = eventos.find((e) => e.id === evView.id);
    if (original) setEditando(original);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Topbar title="Agenda" description="Reuniões e compromissos" />

      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-elevated px-3 py-2">
          <CalendarClock className="size-4 shrink-0 text-brand" />
          <p className="text-xs text-muted-foreground">Agenda nativa do CRM.</p>
          <Link
            href="/configuracoes/integracoes"
            className="text-xs font-medium text-brand hover:underline"
          >
            Conectar Google Agenda
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md border border-border">
              <button
                onClick={() => setWeekOffset((w) => w - 1)}
                aria-label="Semana anterior"
                className="flex size-8 items-center justify-center rounded-l-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={() => setWeekOffset((w) => w + 1)}
                aria-label="Próxima semana"
                className="flex size-8 items-center justify-center rounded-r-md border-l border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
              Hoje
            </Button>
            <h2 className="font-display text-sm font-semibold tracking-tight">
              {mesLabel}
            </h2>
          </div>
          <Button
            variant="brand"
            size="sm"
            className="gap-1.5"
            onClick={() => setNovoAberto(true)}
          >
            <Plus className="size-4" />
            Novo evento
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 gap-4">
          <WeekView
            dias={dias}
            eventos={eventosSemana}
            showNow={mostrarAgora}
            agoraHora={agoraHora}
            onSelecionar={selecionarEvento}
          />

          <aside className="hidden w-72 shrink-0 space-y-4 overflow-y-auto xl:block">
            <div className="rounded-lg border border-border bg-card p-3 panel-sm">
              <MiniMonth viewDate={monday} weekDates={weekDates} today={hoje} />
            </div>

            <div className="rounded-lg border border-border bg-card panel-sm">
              <header className="border-b border-border p-3">
                <h3 className="font-display text-sm font-medium tracking-tight">
                  Próximos compromissos
                </h3>
              </header>
              <ul className="divide-y divide-border">
                {proximos.map((e) => {
                  const Icon = TIPO_ICON[e.tipo];
                  const dt = new Date(e.inicio);
                  return (
                    <li key={e.id} className="flex gap-2.5 p-3">
                      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-elevated">
                        <Icon className="size-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{e.titulo}</p>
                        <p className="text-xs text-muted-foreground">
                          {dt.toLocaleDateString("pt-BR", {
                            weekday: "short",
                            day: "numeric",
                          })}{" "}
                          ·{" "}
                          {dt.toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </li>
                  );
                })}
                {proximos.length === 0 ? (
                  <li className="p-3 text-xs text-muted-foreground">
                    Nenhum compromisso futuro.
                  </li>
                ) : null}
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-card p-3 panel-sm">
              <h3 className="mb-2.5 font-display text-sm font-medium tracking-tight">
                Tipos
              </h3>
              <ul className="space-y-2">
                {(Object.keys(TIPO_LABEL) as EventoTipo[]).map((t) => {
                  const Icon = TIPO_ICON[t];
                  return (
                    <li
                      key={t}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <span
                        className={cn(
                          "flex size-5 items-center justify-center rounded-sm border",
                          t === "reuniao" && "border-l-2 border-l-brand border-border",
                          t === "call" && "border-l-2 border-l-subtle border-border",
                          t === "tarefa" && "border-dashed border-border",
                          t === "pessoal" && "border-border bg-muted"
                        )}
                      >
                        <Icon className="size-3" />
                      </span>
                      {TIPO_LABEL[t]}
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      </div>

      <NovoEventoDialog
        open={novoAberto}
        onOpenChange={setNovoAberto}
        contatos={contatos}
        diaSelecionado={monday}
        onCriado={aoCriar}
      />

      <EditarEventoDialog
        evento={editando}
        contatos={contatos}
        onOpenChange={(open) => {
          if (!open) setEditando(null);
        }}
        onSalvo={aoSalvarEdicao}
        onExcluido={(id) => setEventos((prev) => prev.filter((e) => e.id !== id))}
      />
    </div>
  );
}
