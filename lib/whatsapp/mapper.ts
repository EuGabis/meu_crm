import type { AtendidoPor, Conversa, Mensagem, MsgAutor } from "@/lib/types";

export interface DbMessageRow {
  id: string;
  direction: "inbound" | "outbound";
  sender: string;
  body: string;
  sent_at: string;
}

export interface DbConversationRow {
  id: string;
  phone_number: string;
  display_name: string | null;
  atendido_por: string;
  unread_count: number;
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
    }));

  return {
    id: row.id,
    contatoId: "",
    nome: row.display_name || row.phone_number,
    telefone: row.phone_number,
    ultimaHora: mensagens[mensagens.length - 1]?.hora ?? "",
    naoLidas: row.unread_count,
    atendidoPor: row.atendido_por as AtendidoPor,
    mensagens,
  };
}
