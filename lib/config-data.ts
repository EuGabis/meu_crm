import type { Agente, Integracao, Membro } from "@/lib/types";

/** Dados mock de configuração. Trocáveis por Supabase sem alterar as telas. */

export const AGENTES: Agente[] = [
  {
    id: "ag1",
    nome: "Ana — Atendimento",
    funcao: "atendimento",
    descricao: "Primeiro contato: qualifica leads e responde no WhatsApp e no chat.",
    ativo: true,
    modelo: "Llama 3.1 70B",
    persona:
      "Você é a Ana, atendente comercial. Seja cordial e objetiva, responda em português do Brasil, qualifique o lead (necessidade, orçamento, prazo) e agende uma conversa quando fizer sentido. Nunca invente preços — encaminhe para um humano se não souber.",
    canais: ["whatsapp", "site"],
    escalaHumano: true,
    horario: "24/7",
    conversas: 312,
    resolucao: 68,
  },
  {
    id: "ag2",
    nome: "Rê — Reuniões",
    funcao: "reuniao",
    descricao: "Agenda, confirma e faz resumo das reuniões junto à agenda.",
    ativo: true,
    modelo: "Mistral Large",
    persona:
      "Você é a Rê, assistente de reuniões. Proponha horários com base na agenda, confirme presença, envie lembretes e gere um resumo com os próximos passos após cada reunião.",
    canais: ["whatsapp", "email"],
    escalaHumano: false,
    horario: "Seg–Sex, 08h–19h",
    conversas: 87,
    resolucao: 91,
  },
  {
    id: "ag3",
    nome: "Léo — Suporte",
    funcao: "suporte",
    descricao: "Resolve dúvidas de clientes existentes e abre chamados quando preciso.",
    ativo: false,
    modelo: "Llama 3.1 8B",
    persona:
      "Você é o Léo, do suporte. Ajude clientes com dúvidas de uso, seja claro e paciente. Se for um problema técnico, colete os detalhes e abra um chamado para o time.",
    canais: ["whatsapp", "site", "email"],
    escalaHumano: true,
    horario: "Seg–Sex, 09h–18h",
    conversas: 143,
    resolucao: 74,
  },
  {
    id: "ag4",
    nome: "Duda — Dúvidas",
    funcao: "duvidas",
    descricao: "Responde dúvidas frequentes sobre produtos, planos e a empresa.",
    ativo: true,
    modelo: "Mixtral 8x7B",
    persona:
      "Você é a Duda. Responda dúvidas frequentes com base na central de ajuda. Seja breve e direta; se a pergunta fugir do escopo, encaminhe para o atendimento.",
    canais: ["site"],
    escalaHumano: true,
    horario: "24/7",
    conversas: 521,
    resolucao: 83,
  },
];

export const INTEGRACOES: Integracao[] = [
  {
    id: "int-whatsapp",
    nome: "WhatsApp Business",
    provedor: "Meta",
    categoria: "Mensagens",
    descricao: "Receba e responda conversas do WhatsApp direto na Inbox.",
    status: "desconectado",
    escopos: ["Ler mensagens", "Enviar mensagens", "Gerenciar contatos"],
    seguranca:
      "Conexão oficial via WhatsApp Business Platform (Meta). A autorização é feita por OAuth e os tokens ficam no servidor — nunca no navegador.",
  },
  {
    id: "int-google",
    nome: "Google Agenda",
    provedor: "Google",
    categoria: "Calendário",
    descricao: "Sincronize reuniões e compromissos com o Google Calendar.",
    status: "desconectado",
    escopos: ["Ler eventos", "Criar e editar eventos"],
    seguranca:
      "Autorização por OAuth 2.0 do Google, com escopos mínimos. Você pode revogar o acesso a qualquer momento.",
  },
  {
    id: "int-gmail",
    nome: "E-mail (Gmail)",
    provedor: "Google",
    categoria: "Mensagens",
    descricao: "Envie e registre e-mails vinculados aos contatos.",
    status: "conectado",
    ultimaSync: "2026-07-24T09:12:00",
    escopos: ["Enviar e-mails", "Ler metadados"],
    seguranca: "OAuth 2.0 com escopos mínimos. Tokens criptografados no servidor.",
  },
  {
    id: "int-meta-ads",
    nome: "Meta Ads",
    provedor: "Meta",
    categoria: "Campanhas",
    descricao: "Rastreie campanhas e a origem dos leads (planejado).",
    status: "desconectado",
    escopos: ["Ler campanhas", "Ler leads"],
    seguranca:
      "Exigirá parceria oficial e revisão do app pela Meta antes de ir para produção.",
  },
];

export const EQUIPE: Membro[] = [
  {
    id: "u1",
    nome: "Gabriel Pereira",
    email: "gabriel@empresa.com.br",
    papel: "admin",
    status: "ativo",
    ultimoAcesso: "2026-07-24T08:40:00",
  },
  {
    id: "u2",
    nome: "Marina Costa",
    email: "marina@empresa.com.br",
    papel: "vendedor",
    status: "ativo",
    ultimoAcesso: "2026-07-23T17:05:00",
  },
  {
    id: "u3",
    nome: "Rafael Lima",
    email: "rafael@empresa.com.br",
    papel: "vendedor",
    status: "ativo",
    ultimoAcesso: "2026-07-24T07:22:00",
  },
  {
    id: "u4",
    nome: "Carla Souza",
    email: "carla@empresa.com.br",
    papel: "gestor",
    status: "convidado",
    ultimoAcesso: "—",
  },
];

/** Preferências de notificação (categoria → canais). */
export interface PrefNotificacao {
  id: string;
  titulo: string;
  descricao: string;
  email: boolean;
  push: boolean;
}

export const PREFS_NOTIFICACAO: PrefNotificacao[] = [
  {
    id: "novo-lead",
    titulo: "Novo lead",
    descricao: "Quando um contato é criado ou entra pelo WhatsApp.",
    email: true,
    push: true,
  },
  {
    id: "negocio-ganho",
    titulo: "Negócio ganho ou perdido",
    descricao: "Quando um negócio muda para Ganho ou Perdido.",
    email: true,
    push: true,
  },
  {
    id: "negocio-parado",
    titulo: "Negócio parado",
    descricao: "Quando um negócio fica 14 dias na mesma etapa.",
    email: false,
    push: true,
  },
  {
    id: "agente-escala",
    titulo: "Agente escalou para humano",
    descricao: "Quando um agente de IA transfere uma conversa para a equipe.",
    email: true,
    push: true,
  },
  {
    id: "resumo-diario",
    titulo: "Resumo diário",
    descricao: "Um resumo do dia com os principais números às 18h.",
    email: true,
    push: false,
  },
];
