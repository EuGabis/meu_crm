import type {
  DispatchSettings,
  DispatchLogItem,
  DispatchStatus,
} from "../types";

export interface DbSettingsRow {
  id: string;
  msgs_por_minuto: number;
  msgs_por_hora: number;
  intervalo_ms: number;
  pausado: boolean;
  atualizado_em: string;
}

export function mapSettingsRow(row: DbSettingsRow): DispatchSettings {
  return {
    msgsPorMinuto: row.msgs_por_minuto,
    msgsPorHora: row.msgs_por_hora,
    intervaloMs: row.intervalo_ms,
    pausado: row.pausado,
    atualizadoEm: row.atualizado_em,
  };
}

export interface DbDispatchLogRow {
  id: string;
  content_id: string;
  group_id: string;
  enviado_em: string;
  status: string;
  erro: string | null;
  // join opcional com whatsapp_groups
  whatsapp_groups?: { nome: string } | null;
}

export function mapDispatchLogRow(row: DbDispatchLogRow): DispatchLogItem {
  return {
    id: row.id,
    contentId: row.content_id,
    groupId: row.group_id,
    grupoNome: row.whatsapp_groups?.nome ?? "—",
    enviadoEm: row.enviado_em,
    status: row.status as DispatchStatus,
    erro: row.erro,
  };
}
