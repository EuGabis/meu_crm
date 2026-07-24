import type { Prioridade, Tarefa, TipoAtividade } from "@/lib/types";

export interface DbTaskRow {
  id: string;
  titulo: string;
  concluida: boolean;
  prioridade: string;
  vencimento: string;
  tipo: string;
  contact_id: string | null;
  responsavel_nome: string;
}

export function mapTaskRow(row: DbTaskRow): Tarefa {
  return {
    id: row.id,
    titulo: row.titulo,
    concluida: row.concluida,
    prioridade: row.prioridade as Prioridade,
    vencimento: row.vencimento,
    tipo: row.tipo as TipoAtividade,
    contatoId: row.contact_id ?? undefined,
    responsavelId: row.responsavel_nome,
  };
}
