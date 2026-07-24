/** Dados mock da agenda. Semana base: 20–26 jul 2026 (hoje = sex, 24, índice 4). */

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

/** "Agora" fixo para o mock (sex 24, 14:20). */
export const HOJE_INDICE = 4;
export const AGORA_HORA = 14 + 20 / 60;

export const EVENTOS: Evento[] = [
  { id: "e1", titulo: "Daily do comercial", dia: 0, inicio: 9, fim: 9.5, tipo: "reuniao" },
  { id: "e2", titulo: "Call — Ágil Frete", dia: 0, inicio: 11, fim: 12, tipo: "call", contatoId: "c4", local: "Google Meet" },
  { id: "e3", titulo: "Enviar propostas pendentes", dia: 0, inicio: 15, fim: 16, tipo: "tarefa" },

  { id: "e4", titulo: "Demo — Forte Tech", dia: 1, inicio: 10, fim: 11, tipo: "reuniao", contatoId: "c14", local: "Google Meet" },
  { id: "e5", titulo: "Follow-up ConstruLar", dia: 1, inicio: 14, fim: 14.5, tipo: "call", contatoId: "c3" },

  { id: "e6", titulo: "Reunião de pipeline", dia: 2, inicio: 9, fim: 10, tipo: "reuniao" },
  { id: "e7", titulo: "Almoço com parceiro", dia: 2, inicio: 12, fim: 13.5, tipo: "pessoal", local: "Restaurante" },
  { id: "e8", titulo: "Negociação — Plena Seguros", dia: 2, inicio: 16, fim: 17, tipo: "reuniao", contatoId: "c11" },

  { id: "e9", titulo: "Onboarding — Vitrine Digital", dia: 3, inicio: 10, fim: 11, tipo: "reuniao", contatoId: "c9", local: "Google Meet" },
  { id: "e10", titulo: "Revisar metas do mês", dia: 3, inicio: 15, fim: 16, tipo: "tarefa" },

  { id: "e11", titulo: "Call — Bella Cosméticos", dia: 4, inicio: 9.5, fim: 10, tipo: "call", contatoId: "c5" },
  { id: "e12", titulo: "Fechamento — Ágil Frete", dia: 4, inicio: 11, fim: 12, tipo: "reuniao", contatoId: "c4", local: "Google Meet" },
  { id: "e13", titulo: "Preparar contrato", dia: 4, inicio: 16, fim: 17, tipo: "tarefa", contatoId: "c1" },

  { id: "e14", titulo: "Planejamento semanal", dia: 6, inicio: 18, fim: 19, tipo: "pessoal" },
];
