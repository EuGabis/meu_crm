import type { Contato, ContatoStatus, Origem } from "@/lib/types";

export interface DbContatoRow {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  empresa: string;
  cargo: string;
  status: string;
  origem: string;
  valor_estimado: number;
  owner_nome: string;
  criado_em: string;
  ultimo_contato: string;
}

export function mapContatoRow(row: DbContatoRow): Contato {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    telefone: row.telefone,
    empresa: row.empresa,
    cargo: row.cargo,
    status: row.status as ContatoStatus,
    origem: row.origem as Origem,
    valorEstimado: row.valor_estimado,
    criadoEm: row.criado_em,
    ultimoContato: row.ultimo_contato,
    ownerId: row.owner_nome,
  };
}
