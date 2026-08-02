import type { Grupo } from "../types";

export interface DbGrupoRow {
  id: string;
  user_id: string;
  nome: string;
  identificador_grupo: string;
  ativo: boolean;
  criado_em: string;
}

export function mapGrupoRow(row: DbGrupoRow): Grupo {
  return {
    id: row.id,
    nome: row.nome,
    identificadorGrupo: row.identificador_grupo,
    ativo: row.ativo,
    criadoEm: row.criado_em,
  };
}
