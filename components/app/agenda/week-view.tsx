"use client";

import { Video, Phone, CheckSquare, User, type LucideIcon } from "lucide-react";

import {
  HORA_FIM,
  HORA_INICIO,
  TIPO_LABEL,
  type Evento,
  type EventoTipo,
} from "@/lib/agenda-data";
import { cn } from "@/lib/utils";

export interface DiaSemana {
  label: string;
  num: number;
  isToday: boolean;
}

const HORA_ALTURA = 56; // px por hora

const TIPO_ICON: Record<EventoTipo, LucideIcon> = {
  reuniao: Video,
  call: Phone,
  tarefa: CheckSquare,
  pessoal: User,
};

const TIPO_CLASSE: Record<EventoTipo, string> = {
  reuniao: "border-l-2 border-l-brand border-border bg-elevated",
  call: "border-l-2 border-l-subtle border-border bg-elevated",
  tarefa: "border-dashed border-border bg-muted",
  pessoal: "border-border bg-muted text-muted-foreground",
};

function fmtHora(dec: number): string {
  const h = Math.floor(dec);
  const m = Math.round((dec - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function WeekView({
  dias,
  eventos,
  showNow,
  agoraHora,
  onSelecionar,
}: {
  dias: DiaSemana[];
  eventos: Evento[];
  showNow: boolean;
  agoraHora: number;
  onSelecionar?: (evento: Evento) => void;
}) {
  const horas = Array.from(
    { length: HORA_FIM - HORA_INICIO },
    (_, i) => HORA_INICIO + i
  );
  const alturaTotal = (HORA_FIM - HORA_INICIO) * HORA_ALTURA;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card panel-sm">
      {/* Cabeçalho dos dias */}
      <div className="flex border-b border-border-strong">
        <div className="w-14 shrink-0" />
        {dias.map((d) => (
          <div
            key={d.label}
            className="flex flex-1 items-center justify-center gap-1.5 border-l border-border py-2"
          >
            <span
              className={cn(
                "text-xs font-medium uppercase tracking-wide",
                d.isToday ? "text-brand" : "text-muted-foreground"
              )}
            >
              {d.label}
            </span>
            <span
              className={cn(
                "tabular flex size-6 items-center justify-center rounded-full text-sm font-semibold",
                d.isToday
                  ? "bg-brand text-brand-foreground"
                  : "text-foreground"
              )}
            >
              {d.num}
            </span>
          </div>
        ))}
      </div>

      {/* Grade */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex" style={{ height: alturaTotal }}>
          {/* Régua de horas */}
          <div className="w-14 shrink-0">
            {horas.map((h) => (
              <div
                key={h}
                style={{ height: HORA_ALTURA }}
                className="relative"
              >
                <span className="absolute -top-2 right-2 text-[11px] tabular text-muted-foreground">
                  {h}:00
                </span>
              </div>
            ))}
          </div>

          {/* Colunas dos dias */}
          {dias.map((d, i) => (
            <div
              key={d.label}
              className="relative flex-1 border-l border-border"
            >
              {/* Linhas de hora */}
              {horas.map((h) => (
                <div
                  key={h}
                  style={{ top: (h - HORA_INICIO) * HORA_ALTURA }}
                  className="absolute inset-x-0 border-t border-border/50"
                />
              ))}

              {/* Linha "agora" */}
              {d.isToday && showNow ? (
                <div
                  style={{ top: (agoraHora - HORA_INICIO) * HORA_ALTURA }}
                  className="absolute inset-x-0 z-20 flex items-center"
                >
                  <span className="-ml-1 size-2 rounded-full bg-brand" />
                  <span className="h-px flex-1 bg-brand" />
                </div>
              ) : null}

              {/* Eventos */}
              {eventos
                .filter((e) => e.dia === i)
                .map((e) => {
                  const Icon = TIPO_ICON[e.tipo];
                  const top = (e.inicio - HORA_INICIO) * HORA_ALTURA;
                  const altura = (e.fim - e.inicio) * HORA_ALTURA;
                  const curto = altura < 44;
                  return (
                    <button
                      key={e.id}
                      onClick={() => onSelecionar?.(e)}
                      style={{ top: top + 1, height: altura - 2 }}
                      className={cn(
                        "absolute inset-x-1 z-10 overflow-hidden rounded-md border p-1.5 text-left transition-colors hover:border-brand/50",
                        TIPO_CLASSE[e.tipo]
                      )}
                      title={`${TIPO_LABEL[e.tipo]} · ${fmtHora(e.inicio)}–${fmtHora(e.fim)}`}
                    >
                      <div className="flex items-center gap-1">
                        <Icon className="size-3 shrink-0" />
                        <span className="truncate text-xs font-medium">
                          {e.titulo}
                        </span>
                      </div>
                      {!curto ? (
                        <p className="truncate text-[11px] text-muted-foreground">
                          {fmtHora(e.inicio)}–{fmtHora(e.fim)}
                          {e.local ? ` · ${e.local}` : ""}
                        </p>
                      ) : null}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
