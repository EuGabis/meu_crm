"use client";

import { useState } from "react";

import { Topbar } from "@/components/app/topbar";
import { ConversationList } from "@/components/app/inbox/conversation-list";
import { MessageThread } from "@/components/app/inbox/message-thread";
import { ContactPanel } from "@/components/app/inbox/contact-panel";
import { CONVERSAS } from "@/lib/inbox-data";
import type { Conversa } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function InboxPage() {
  const [conversas, setConversas] = useState<Conversa[]>(CONVERSAS);
  const [selId, setSelId] = useState(CONVERSAS[0].id);
  const [mobileView, setMobileView] = useState<"lista" | "thread">("lista");

  const sel = conversas.find((c) => c.id === selId)!;

  function selecionar(id: string) {
    setSelId(id);
    setMobileView("thread");
    setConversas((prev) =>
      prev.map((c) => (c.id === id ? { ...c, naoLidas: 0 } : c))
    );
  }

  function enviar(texto: string) {
    const hora = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setConversas((prev) =>
      prev.map((c) =>
        c.id === selId
          ? {
              ...c,
              atendidoPor: "humano",
              ultimaHora: hora,
              naoLidas: 0,
              mensagens: [
                ...c.mensagens,
                { id: `m-${Date.now()}`, autor: "atendente", texto, hora },
              ],
            }
          : c
      )
    );
  }

  function assumir() {
    setConversas((prev) =>
      prev.map((c) => (c.id === selId ? { ...c, atendidoPor: "humano" } : c))
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Topbar title="Inbox" description="Conversas do WhatsApp" />

      <div className="flex min-h-0 flex-1">
        <ConversationList
          conversas={conversas}
          selId={selId}
          onSelect={selecionar}
          className={cn(
            "w-full shrink-0 border-border md:w-80 md:border-r",
            mobileView === "thread" && "hidden md:flex"
          )}
        />

        <MessageThread
          conversa={sel}
          onEnviar={enviar}
          onAssumir={assumir}
          onVoltar={() => setMobileView("lista")}
          className={cn(
            "min-w-0 flex-1",
            mobileView === "lista" && "hidden md:flex"
          )}
        />

        <ContactPanel
          conversa={sel}
          className="hidden w-80 shrink-0 border-l border-border xl:flex"
        />
      </div>
    </div>
  );
}
