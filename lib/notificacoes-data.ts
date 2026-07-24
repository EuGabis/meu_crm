import type { Notificacao } from "@/lib/types";

/** Notificações mock (central do sino). */

export const NOTIFICACOES: Notificacao[] = [
  { id: "n1", tipo: "lead", titulo: "Novo lead pelo WhatsApp", descricao: "Patrícia Nunes (ConstruLar) iniciou uma conversa.", hora: "há 8 min", lida: false },
  { id: "n2", tipo: "agente", titulo: "Ana escalou uma conversa", descricao: "Patrícia pediu uma proposta — precisa de você.", hora: "há 12 min", lida: false },
  { id: "n3", tipo: "negocio", titulo: "Negócio movido para Ganho", descricao: "Projeto vitrine e-commerce — Vitrine Digital (R$ 43.000).", hora: "há 1 h", lida: false },
  { id: "n4", tipo: "tarefa", titulo: "Tarefa vencendo hoje", descricao: "Preparar contrato — TecNova.", hora: "há 2 h", lida: true },
  { id: "n5", tipo: "negocio", titulo: "Negócio parado há 14 dias", descricao: "Licenças anuais — Forte Tech continua em Proposta.", hora: "há 5 h", lida: true },
  { id: "n6", tipo: "sistema", titulo: "Resumo diário disponível", descricao: "8 negócios abertos · R$ 508.000 em pipeline.", hora: "ontem", lida: true },
];
