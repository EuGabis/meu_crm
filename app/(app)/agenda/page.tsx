"use client";

import { useState } from "react";
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
import {
  EVENTOS,
  HOJE_INDICE,
  TIPO_LABEL,
  type EventoTipo,
} from "@/lib/agenda-data";
import { cn } from "@/lib/utils";

const HOJE = new Date(2026, 6, 24); // sex, 24 jul 2026
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
function fmtHora(dec: number) {
  const h = Math.floor(dec);
  const m = Math.round((dec - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function AgendaPage() {
  const [weekOffset, setWeekOffset] = useState(0);

  const baseMonday = mondayOf(HOJE);
  const monday = addDays(baseMonday, weekOffset * 7);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const dias: DiaSemana[] = weekDates.map((dt, i) => ({
    label: LABELS[i],
    num: dt.getDate(),
    isToday: weekOffset === 0 && sameDay(dt, HOJE),
  }));

  const eventos = weekOffset === 0 ? EVENTOS : [];
  const mesRaw = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(monday);
  const mesLabel = mesRaw.charAt(0).toUpperCase() + mesRaw.slice(1);

  const proximos = [...EVENTOS]
    .filter((e) => e.dia >= HOJE_INDICE)
    .sort((a, b) => a.dia - b.dia || a.inicio - b.inicio)
    .slice(0, 5);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Topbar title="Agenda" description="Reuniões e compromissos" />

      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6">
        {/* Banner: agenda de exemplo */}
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-elevated px-3 py-2">
          <CalendarClock className="size-4 shrink-0 text-brand" />
          <p className="text-xs text-muted-foreground">
            Você está vendo uma agenda de exemplo.
          </p>
          <Link
            href="/configuracoes/integracoes"
            className="text-xs font-medium text-brand hover:underline"
          >
            Conectar Google Agenda
          </Link>
        </div>

        {/* Toolbar */}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekOffset(0)}
            >
              Hoje
            </Button>
            <h2 className="font-display text-sm font-semibold tracking-tight">
              {mesLabel}
            </h2>
          </div>
          <Button variant="brand" size="sm" className="gap-1.5">
            <Plus className="size-4" />
            Novo evento
          </Button>
        </div>

        {/* Grade + lateral */}
        <div className="flex min-h-0 flex-1 gap-4">
          <WeekView dias={dias} eventos={eventos} showNow={weekOffset === 0} />

          <aside className="hidden w-72 shrink-0 space-y-4 overflow-y-auto xl:block">
            <div className="rounded-lg border border-border bg-card p-3 panel-sm">
              <MiniMonth
                viewDate={monday}
                weekDates={weekDates}
                today={HOJE}
              />
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
                  const dt = addDays(baseMonday, e.dia);
                  return (
                    <li key={e.id} className="flex gap-2.5 p-3">
                      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-elevated">
                        <Icon className="size-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {e.titulo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {LABELS[e.dia]} {dt.getDate()} · {fmtHora(e.inicio)}
                        </p>
                      </div>
                    </li>
                  );
                })}
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
    </div>
  );
}
