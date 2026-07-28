import type { EventoAgenda } from "@/lib/types";
import type { EventoTipo } from "../types";

export interface DbEventRow {
  id: string;
  titulo: string;
  inicio: string;
  fim: string;
  tipo: string;
  local: string;
  contact_id: string | null;
}

export function mapEventRow(row: DbEventRow): EventoAgenda {
  return {
    id: row.id,
    titulo: row.titulo,
    inicio: row.inicio,
    fim: row.fim,
    tipo: row.tipo as EventoTipo,
    local: row.local,
    contatoId: row.contact_id ?? undefined,
  };
}
