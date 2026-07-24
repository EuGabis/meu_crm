/**
 * Tipos de domínio do CRM.
 * Desenhados para espelhar o schema futuro do Supabase — quando o backend
 * entrar, estes tipos viram as linhas das tabelas quase sem mudança.
 */

import type { EventoTipo } from "@/lib/agenda-data";

export type ContatoStatus = "lead" | "ativo" | "cliente" | "inativo";

export type Origem =
  | "site"
  | "indicacao"
  | "anuncio"
  | "evento"
  | "outbound"
  | "whatsapp"
  | "outro";

export interface Contato {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  empresa: string;
  cargo: string;
  status: ContatoStatus;
  origem: Origem;
  valorEstimado: number;
  criadoEm: string; // ISO
  ultimoContato: string; // ISO
  ownerId: string;
}

export type PipelineStage =
  | "lead"
  | "qualificado"
  | "proposta"
  | "negociacao"
  | "ganho"
  | "perdido";

export interface Negocio {
  id: string;
  titulo: string;
  contatoId: string;
  empresa: string;
  valor: number;
  stage: PipelineStage;
  probabilidade: number; // 0-100
  criadoEm: string; // ISO
  fechamentoPrevisto: string; // ISO
  ownerId: string;
}

export type TipoAtividade =
  | "ligacao"
  | "email"
  | "reuniao"
  | "nota"
  | "tarefa";

export interface Atividade {
  id: string;
  tipo: TipoAtividade;
  descricao: string;
  contatoId: string;
  data: string; // ISO
  ownerId: string;
}

export interface Automacao {
  id: string;
  nome: string;
  gatilho: string;
  acao: string;
  ativa: boolean;
  execucoes: number;
  criadaEm: string; // ISO
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  cargo: string;
}

/** Rótulos e cores de cada estágio do pipeline (a única cor "de dado"). */
export const STAGES: {
  id: PipelineStage;
  label: string;
  variant: "default" | "won" | "lost" | "open" | "progress";
}[] = [
  { id: "lead", label: "Lead", variant: "default" },
  { id: "qualificado", label: "Qualificado", variant: "open" },
  { id: "proposta", label: "Proposta", variant: "progress" },
  { id: "negociacao", label: "Negociação", variant: "progress" },
  { id: "ganho", label: "Ganho", variant: "won" },
  { id: "perdido", label: "Perdido", variant: "lost" },
];

export const CONTATO_STATUS_LABEL: Record<ContatoStatus, string> = {
  lead: "Lead",
  ativo: "Ativo",
  cliente: "Cliente",
  inativo: "Inativo",
};

export const ORIGEM_LABEL: Record<Origem, string> = {
  site: "Site",
  indicacao: "Indicação",
  anuncio: "Anúncio",
  evento: "Evento",
  outbound: "Outbound",
  whatsapp: "WhatsApp",
  outro: "Outro",
};

export const ATIVIDADE_LABEL: Record<TipoAtividade, string> = {
  ligacao: "Ligação",
  email: "E-mail",
  reuniao: "Reunião",
  nota: "Nota",
  tarefa: "Tarefa",
};

// ---------------------------------------------------------------------------
// Configurações
// ---------------------------------------------------------------------------

export type AgenteFuncao = "atendimento" | "reuniao" | "suporte" | "duvidas";
export type CanalAgente = "whatsapp" | "site" | "email";

export interface Agente {
  id: string;
  nome: string;
  funcao: AgenteFuncao;
  descricao: string;
  ativo: boolean;
  modelo: string;
  persona: string;
  canais: CanalAgente[];
  escalaHumano: boolean;
  horario: string;
  conversas: number; // atendidas no mês
  resolucao: number; // % resolvidas sem humano
}

export const CANAL_LABEL: Record<CanalAgente, string> = {
  whatsapp: "WhatsApp",
  site: "Chat do site",
  email: "E-mail",
};

/** Modelos open source disponíveis (fase inicial). */
export const MODELOS_IA = [
  "Llama 3.1 8B",
  "Llama 3.1 70B",
  "Mistral Large",
  "Mixtral 8x7B",
] as const;

export type IntegracaoStatus = "conectado" | "desconectado" | "erro";

export interface Integracao {
  id: string;
  nome: string;
  provedor: string;
  categoria: string;
  descricao: string;
  status: IntegracaoStatus;
  ultimaSync?: string;
  escopos: string[];
  seguranca: string;
}

export const INTEGRACAO_STATUS_LABEL: Record<IntegracaoStatus, string> = {
  conectado: "Conectado",
  desconectado: "Desconectado",
  erro: "Erro",
};

export type PapelEquipe = "admin" | "gestor" | "vendedor";
export type MembroStatus = "ativo" | "convidado";

export interface Membro {
  id: string;
  nome: string;
  email: string;
  papel: PapelEquipe;
  status: MembroStatus;
  ultimoAcesso: string;
}

export const PAPEL_LABEL: Record<PapelEquipe, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  vendedor: "Vendedor",
};

// ---------------------------------------------------------------------------
// Inbox (conversas)
// ---------------------------------------------------------------------------

export type MsgAutor = "cliente" | "atendente" | "agente";

export interface Mensagem {
  id: string;
  autor: MsgAutor;
  texto: string;
  hora: string; // "14:32"
}

export type AtendidoPor = "humano" | "agente" | "aguardando";

export interface Conversa {
  id: string;
  contatoId: string;
  nome: string;
  telefone: string;
  ultimaHora: string;
  naoLidas: number;
  atendidoPor: AtendidoPor;
  agenteNome?: string;
  online?: boolean;
  mensagens: Mensagem[];
}

// ---------------------------------------------------------------------------
// Tarefas, Notificações e Metas
// ---------------------------------------------------------------------------

export type Prioridade = "alta" | "media" | "baixa";

export interface Tarefa {
  id: string;
  titulo: string;
  concluida: boolean;
  prioridade: Prioridade;
  vencimento: string; // ISO date
  tipo: TipoAtividade;
  contatoId?: string;
  responsavelId: string;
}

export const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export interface EventoAgenda {
  id: string;
  titulo: string;
  inicio: string; // ISO
  fim: string; // ISO
  tipo: EventoTipo;
  local: string;
  contatoId?: string;
}

export type NotifTipo = "lead" | "negocio" | "agente" | "tarefa" | "sistema";

export interface Notificacao {
  id: string;
  tipo: NotifTipo;
  titulo: string;
  descricao: string;
  hora: string;
  lida: boolean;
}

export interface Meta {
  id: string;
  usuarioId: string;
  alvoReceita: number;
  realizadoReceita: number;
  alvoNegocios: number;
  realizadoNegocios: number;
}
