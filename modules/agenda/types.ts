/** Tipos e constantes de exibição da agenda semanal (usados pelo WeekView). */

export type EventoTipo = "reuniao" | "call" | "tarefa" | "pessoal";

export interface Evento {
  id: string;
  titulo: string;
  dia: number; // 0 = segunda … 6 = domingo
  inicio: number; // hora decimal (ex.: 9.5 = 09:30)
  fim: number;
  tipo: EventoTipo;
  contatoId?: string;
  local?: string;
}

export const TIPO_LABEL: Record<EventoTipo, string> = {
  reuniao: "Reunião",
  call: "Ligação",
  tarefa: "Tarefa",
  pessoal: "Pessoal",
};

/** Faixa de horas exibida na grade. */
export const HORA_INICIO = 8;
export const HORA_FIM = 20;
