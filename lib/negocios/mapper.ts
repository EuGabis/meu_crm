import type { Negocio, PipelineStage } from "@/lib/types";

export interface DbDealRow {
  id: string;
  titulo: string;
  contact_id: string;
  empresa: string;
  valor: number;
  stage: string;
  probabilidade: number;
  fechamento_previsto: string | null;
  owner_nome: string;
  criado_em: string;
}

export function mapDealRow(row: DbDealRow): Negocio {
  return {
    id: row.id,
    titulo: row.titulo,
    contatoId: row.contact_id,
    empresa: row.empresa,
    valor: row.valor,
    stage: row.stage as PipelineStage,
    probabilidade: row.probabilidade,
    criadoEm: row.criado_em,
    fechamentoPrevisto: row.fechamento_previsto ?? "",
    ownerId: row.owner_nome,
  };
}
