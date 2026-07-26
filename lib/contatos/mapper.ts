import type { PostgrestError } from "@supabase/supabase-js";
import type { Contato, ContatoStatus, Origem } from "@/lib/types";

/**
 * Detecta o erro do PostgREST/Postgres quando a coluna `observacoes` ainda não
 * existe na tabela (migração `docs/sql/2026-07-25-observacoes-contatos.sql` não
 * rodada). Permite às rotas regravarem sem esse campo em vez de quebrar.
 */
export function erroObservacoesAusente(error: PostgrestError | null): boolean {
  if (!error) return false;
  // PGRST204 = coluna não encontrada no schema cache; 42703 = undefined_column.
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    /observacoes/i.test(error.message ?? "")
  );
}

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
  observacoes: string;
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
    observacoes: row.observacoes ?? "",
    criadoEm: row.criado_em,
    ultimoContato: row.ultimo_contato,
    ownerId: row.owner_nome,
  };
}
