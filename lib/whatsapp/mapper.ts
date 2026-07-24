import type {
  AtendidoPor,
  Conversa,
  ConversaStatus,
  Mensagem,
  MsgAutor,
} from "@/lib/types";

export interface DbMessageRow {
  id: string;
  direction: "inbound" | "outbound";
  sender: string;
  body: string;
  status: string | null;
  sent_at: string;
}

export interface DbConversationRow {
  id: string;
  phone_number: string;
  display_name: string | null;
  atendido_por: string;
  unread_count: number;
  contact_id: string | null;
  status?: string | null;
  whatsapp_messages: DbMessageRow[];
}

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function mapConversationRow(row: DbConversationRow): Conversa {
  const mensagens: Mensagem[] = [...row.whatsapp_messages]
    .sort((a, b) => a.sent_at.localeCompare(b.sent_at))
    .map((m) => ({
      id: m.id,
      autor: m.sender as MsgAutor,
      texto: m.body,
      hora: formatHora(m.sent_at),
      dataISO: m.sent_at,
      falhou: m.status === "failed",
    }));

  return {
    id: row.id,
    contatoId: row.contact_id ?? "",
    nome: row.display_name || row.phone_number,
    telefone: row.phone_number,
    ultimaHora: mensagens[mensagens.length - 1]?.hora ?? "",
    naoLidas: row.unread_count,
    atendidoPor: row.atendido_por as AtendidoPor,
    status: (row.status ?? "aberta") as ConversaStatus,
    mensagens,
  };
}
