import type {
  Atividade,
  Automacao,
  Contato,
  Negocio,
  Usuario,
} from "@/lib/types";

/**
 * Dados mockados. Substituíveis por queries do Supabase sem tocar na UI —
 * as telas consomem apenas os selectors exportados no fim deste arquivo.
 */

export const USUARIO_ATUAL: Usuario = {
  id: "u1",
  nome: "Gabriel Pereira",
  email: "gabriel@empresa.com.br",
  cargo: "Head de Vendas",
};

export const USUARIOS: Usuario[] = [
  USUARIO_ATUAL,
  { id: "u2", nome: "Marina Costa", email: "marina@empresa.com.br", cargo: "SDR" },
  { id: "u3", nome: "Rafael Lima", email: "rafael@empresa.com.br", cargo: "Closer" },
];

export const CONTATOS: Contato[] = [
  { id: "c1", nome: "Fernanda Albuquerque", email: "fernanda@tecnova.com.br", telefone: "(11) 98812-4471", empresa: "TecNova Sistemas", cargo: "Diretora de TI", status: "cliente", origem: "indicacao", valorEstimado: 84000, criadoEm: "2026-02-11", ultimoContato: "2026-07-18", observacoes: "", ownerId: "u3" },
  { id: "c2", nome: "Bruno Menezes", email: "bruno@lojaverde.com", telefone: "(21) 99145-8820", empresa: "Loja Verde", cargo: "Sócio", status: "ativo", origem: "site", valorEstimado: 32000, criadoEm: "2026-04-02", ultimoContato: "2026-07-20", observacoes: "", ownerId: "u2" },
  { id: "c3", nome: "Patrícia Nunes", email: "patricia@constrular.com.br", telefone: "(31) 98410-1190", empresa: "ConstruLar", cargo: "Gerente Comercial", status: "lead", origem: "anuncio", valorEstimado: 51000, criadoEm: "2026-06-19", ultimoContato: "2026-07-15", observacoes: "", ownerId: "u2" },
  { id: "c4", nome: "Diego Ferreira", email: "diego@agilfrete.com", telefone: "(41) 99628-3312", empresa: "Ágil Frete", cargo: "CEO", status: "ativo", origem: "outbound", valorEstimado: 120000, criadoEm: "2026-03-27", ultimoContato: "2026-07-21", observacoes: "", ownerId: "u3" },
  { id: "c5", nome: "Camila Rocha", email: "camila@bellacosmeticos.com.br", telefone: "(11) 97733-0021", empresa: "Bella Cosméticos", cargo: "Head de Marketing", status: "cliente", origem: "evento", valorEstimado: 67000, criadoEm: "2026-01-15", ultimoContato: "2026-07-19", observacoes: "", ownerId: "u3" },
  { id: "c6", nome: "Henrique Barros", email: "henrique@ativapharma.com", telefone: "(51) 98122-7745", empresa: "Ativa Pharma", cargo: "Diretor Financeiro", status: "lead", origem: "site", valorEstimado: 29000, criadoEm: "2026-07-05", ultimoContato: "2026-07-12", observacoes: "", ownerId: "u2" },
  { id: "c7", nome: "Larissa Teixeira", email: "larissa@estudioform.com", telefone: "(48) 99880-1234", empresa: "Estúdio Form", cargo: "Proprietária", status: "ativo", origem: "indicacao", valorEstimado: 18000, criadoEm: "2026-05-08", ultimoContato: "2026-07-17", observacoes: "", ownerId: "u2" },
  { id: "c8", nome: "Anderson Prado", email: "anderson@maxlog.com.br", telefone: "(62) 99450-6612", empresa: "MaxLog", cargo: "COO", status: "inativo", origem: "outbound", valorEstimado: 95000, criadoEm: "2025-11-22", ultimoContato: "2026-05-30", observacoes: "", ownerId: "u3" },
  { id: "c9", nome: "Juliana Moreira", email: "juliana@vitrinedigital.com", telefone: "(11) 98005-7781", empresa: "Vitrine Digital", cargo: "Fundadora", status: "cliente", origem: "evento", valorEstimado: 43000, criadoEm: "2026-02-28", ultimoContato: "2026-07-22", observacoes: "", ownerId: "u3" },
  { id: "c10", nome: "Thiago Souza", email: "thiago@nortecafe.com.br", telefone: "(85) 99711-3308", empresa: "Norte Café", cargo: "Diretor", status: "lead", origem: "anuncio", valorEstimado: 22000, criadoEm: "2026-07-09", ultimoContato: "2026-07-14", observacoes: "", ownerId: "u2" },
  { id: "c11", nome: "Beatriz Cardoso", email: "beatriz@plenaseg.com.br", telefone: "(11) 98890-4523", empresa: "Plena Seguros", cargo: "Gerente de Operações", status: "ativo", origem: "indicacao", valorEstimado: 74000, criadoEm: "2026-04-16", ultimoContato: "2026-07-20", observacoes: "", ownerId: "u3" },
  { id: "c12", nome: "Marcelo Dias", email: "marcelo@urbanmoveis.com", telefone: "(19) 99342-8890", empresa: "Urban Móveis", cargo: "Sócio-diretor", status: "lead", origem: "site", valorEstimado: 38000, criadoEm: "2026-06-30", ultimoContato: "2026-07-11", observacoes: "", ownerId: "u2" },
  { id: "c13", nome: "Renata Farias", email: "renata@clinicasorriso.com.br", telefone: "(71) 98221-5567", empresa: "Clínica Sorriso", cargo: "Administradora", status: "cliente", origem: "indicacao", valorEstimado: 26000, criadoEm: "2026-03-04", ultimoContato: "2026-07-16", observacoes: "", ownerId: "u3" },
  { id: "c14", nome: "Gustavo Almeida", email: "gustavo@fortetech.com", telefone: "(11) 99604-7712", empresa: "Forte Tech", cargo: "CTO", status: "ativo", origem: "outbound", valorEstimado: 158000, criadoEm: "2026-05-21", ultimoContato: "2026-07-21", observacoes: "", ownerId: "u3" },
];

export const NEGOCIOS: Negocio[] = [
  { id: "n1", titulo: "Implantação plano Enterprise", contatoId: "c4", empresa: "Ágil Frete", valor: 120000, stage: "negociacao", probabilidade: 70, criadoEm: "2026-05-02", fechamentoPrevisto: "2026-08-10", ownerId: "u3" },
  { id: "n2", titulo: "Licenças anuais — 40 assentos", contatoId: "c14", empresa: "Forte Tech", valor: 158000, stage: "proposta", probabilidade: 55, criadoEm: "2026-06-01", fechamentoPrevisto: "2026-08-25", ownerId: "u3" },
  { id: "n3", titulo: "Pacote Marketing + Automação", contatoId: "c5", empresa: "Bella Cosméticos", valor: 67000, stage: "ganho", probabilidade: 100, criadoEm: "2026-04-11", fechamentoPrevisto: "2026-07-05", ownerId: "u3" },
  { id: "n4", titulo: "Consultoria de processos", contatoId: "c11", empresa: "Plena Seguros", valor: 74000, stage: "negociacao", probabilidade: 65, criadoEm: "2026-05-18", fechamentoPrevisto: "2026-08-15", ownerId: "u3" },
  { id: "n5", titulo: "Plano Pro anual", contatoId: "c2", empresa: "Loja Verde", valor: 32000, stage: "qualificado", probabilidade: 40, criadoEm: "2026-06-20", fechamentoPrevisto: "2026-09-01", ownerId: "u2" },
  { id: "n6", titulo: "Migração de sistema", contatoId: "c1", empresa: "TecNova Sistemas", valor: 84000, stage: "ganho", probabilidade: 100, criadoEm: "2026-03-15", fechamentoPrevisto: "2026-06-28", ownerId: "u3" },
  { id: "n7", titulo: "Piloto — 3 meses", contatoId: "c3", empresa: "ConstruLar", valor: 51000, stage: "proposta", probabilidade: 45, criadoEm: "2026-06-25", fechamentoPrevisto: "2026-09-10", ownerId: "u2" },
  { id: "n8", titulo: "Upgrade infraestrutura", contatoId: "c8", empresa: "MaxLog", valor: 95000, stage: "perdido", probabilidade: 0, criadoEm: "2026-02-10", fechamentoPrevisto: "2026-05-20", ownerId: "u3" },
  { id: "n9", titulo: "Assinatura Starter", contatoId: "c6", empresa: "Ativa Pharma", valor: 29000, stage: "lead", probabilidade: 20, criadoEm: "2026-07-06", fechamentoPrevisto: "2026-09-30", ownerId: "u2" },
  { id: "n10", titulo: "Projeto vitrine e-commerce", contatoId: "c9", empresa: "Vitrine Digital", valor: 43000, stage: "ganho", probabilidade: 100, criadoEm: "2026-04-01", fechamentoPrevisto: "2026-07-12", ownerId: "u3" },
  { id: "n11", titulo: "Plano Pro — 12 meses", contatoId: "c7", empresa: "Estúdio Form", valor: 18000, stage: "qualificado", probabilidade: 35, criadoEm: "2026-06-12", fechamentoPrevisto: "2026-08-30", ownerId: "u2" },
  { id: "n12", titulo: "Expansão de contrato", contatoId: "c13", empresa: "Clínica Sorriso", valor: 26000, stage: "lead", probabilidade: 25, criadoEm: "2026-07-10", fechamentoPrevisto: "2026-09-15", ownerId: "u3" },
];

export const ATIVIDADES: Atividade[] = [
  { id: "a1", tipo: "reuniao", descricao: "Demo do produto para o time comercial", contatoId: "c14", data: "2026-07-21T14:00:00", ownerId: "u3" },
  { id: "a2", tipo: "ligacao", descricao: "Follow-up sobre a proposta enviada", contatoId: "c4", data: "2026-07-21T10:30:00", ownerId: "u3" },
  { id: "a3", tipo: "email", descricao: "Enviada proposta comercial revisada", contatoId: "c2", data: "2026-07-20T16:45:00", ownerId: "u2" },
  { id: "a4", tipo: "nota", descricao: "Cliente pediu para retomar em agosto", contatoId: "c11", data: "2026-07-20T09:15:00", ownerId: "u3" },
  { id: "a5", tipo: "tarefa", descricao: "Preparar contrato de fechamento", contatoId: "c1", data: "2026-07-19T11:00:00", ownerId: "u3" },
  { id: "a6", tipo: "reuniao", descricao: "Kickoff de onboarding", contatoId: "c9", data: "2026-07-22T15:30:00", ownerId: "u3" },
  { id: "a7", tipo: "ligacao", descricao: "Qualificação inicial do lead", contatoId: "c3", data: "2026-07-15T13:20:00", ownerId: "u2" },
  { id: "a8", tipo: "email", descricao: "Material de apresentação enviado", contatoId: "c6", data: "2026-07-12T08:50:00", ownerId: "u2" },
];

export const AUTOMACOES: Automacao[] = [
  { id: "au1", nome: "Boas-vindas a novo lead", gatilho: "Contato criado com status Lead", acao: "Enviar e-mail de boas-vindas", ativa: true, execucoes: 142, criadaEm: "2026-02-01" },
  { id: "au2", nome: "Follow-up de proposta", gatilho: "Negócio movido para Proposta", acao: "Criar tarefa de follow-up em 3 dias", ativa: true, execucoes: 58, criadaEm: "2026-03-12" },
  { id: "au3", nome: "Reativação de inativos", gatilho: "Contato sem interação há 60 dias", acao: "Notificar responsável + e-mail", ativa: false, execucoes: 23, criadaEm: "2026-04-20" },
  { id: "au4", nome: "Alerta de negócio parado", gatilho: "Negócio na mesma etapa há 14 dias", acao: "Notificar responsável no painel", ativa: true, execucoes: 37, criadaEm: "2026-05-09" },
  { id: "au5", nome: "Pós-venda automático", gatilho: "Negócio movido para Ganho", acao: "Criar checklist de onboarding", ativa: true, execucoes: 19, criadaEm: "2026-06-02" },
];

// ---------------------------------------------------------------------------
// Selectors — a UI só depende destes; troque a fonte por Supabase depois.
// ---------------------------------------------------------------------------

export function getContato(id: string): Contato | undefined {
  return CONTATOS.find((c) => c.id === id);
}

export function getUsuario(id: string): Usuario | undefined {
  return USUARIOS.find((u) => u.id === id);
}

export function negociosPorStage(stage: Negocio["stage"]): Negocio[] {
  return NEGOCIOS.filter((n) => n.stage === stage);
}
