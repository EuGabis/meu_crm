import type { Tarefa } from "@/lib/types";

/** Tarefas mock. Referência de "hoje": 24/07/2026. */

export const TAREFAS: Tarefa[] = [
  { id: "t1", titulo: "Ligar para Ágil Frete sobre o fechamento", concluida: false, prioridade: "alta", vencimento: "2026-07-22", tipo: "ligacao", contatoId: "c4", responsavelId: "u3" },
  { id: "t2", titulo: "Enviar proposta revisada — ConstruLar", concluida: false, prioridade: "alta", vencimento: "2026-07-23", tipo: "email", contatoId: "c3", responsavelId: "u2" },
  { id: "t3", titulo: "Preparar contrato — TecNova", concluida: false, prioridade: "alta", vencimento: "2026-07-24", tipo: "tarefa", contatoId: "c1", responsavelId: "u3" },
  { id: "t4", titulo: "Follow-up com Bruno (Loja Verde)", concluida: false, prioridade: "media", vencimento: "2026-07-24", tipo: "ligacao", contatoId: "c2", responsavelId: "u2" },
  { id: "t5", titulo: "Confirmar demo com Forte Tech", concluida: false, prioridade: "media", vencimento: "2026-07-25", tipo: "reuniao", contatoId: "c14", responsavelId: "u3" },
  { id: "t6", titulo: "Responder dúvida da Ativa Pharma", concluida: false, prioridade: "baixa", vencimento: "2026-07-25", tipo: "email", contatoId: "c6", responsavelId: "u2" },
  { id: "t7", titulo: "Onboarding — Vitrine Digital", concluida: false, prioridade: "media", vencimento: "2026-07-27", tipo: "reuniao", contatoId: "c9", responsavelId: "u3" },
  { id: "t8", titulo: "Revisar metas do mês com o time", concluida: false, prioridade: "media", vencimento: "2026-07-29", tipo: "tarefa", responsavelId: "u1" },
  { id: "t9", titulo: "Atualizar cadastro da Plena Seguros", concluida: false, prioridade: "baixa", vencimento: "2026-07-30", tipo: "nota", contatoId: "c11", responsavelId: "u3" },
  { id: "t10", titulo: "Enviar material — Norte Café", concluida: true, prioridade: "baixa", vencimento: "2026-07-23", tipo: "email", contatoId: "c10", responsavelId: "u2" },
  { id: "t11", titulo: "Qualificar lead — Urban Móveis", concluida: true, prioridade: "media", vencimento: "2026-07-22", tipo: "ligacao", contatoId: "c12", responsavelId: "u2" },
];
