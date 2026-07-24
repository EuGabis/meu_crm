"use client";

import { useCallback, useEffect, useState } from "react";

import { Topbar } from "@/components/app/topbar";
import { ConversationList } from "@/components/app/inbox/conversation-list";
import { MessageThread } from "@/components/app/inbox/message-thread";
import { ContactPanel } from "@/components/app/inbox/contact-panel";
import type { Contato, Conversa, Negocio } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function InboxPage() {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"lista" | "thread">("lista");

  const carregar = useCallback(async () => {
    const [resConversas, resContatos, resNegocios] = await Promise.all([
      fetch("/api/whatsapp/conversas", { cache: "no-store" }),
      fetch("/api/contatos", { cache: "no-store" }),
      fetch("/api/negocios", { cache: "no-store" }),
    ]);
    if (resConversas.ok) {
      const { conversas: novas } = (await resConversas.json()) as {
        conversas: Conversa[];
      };
      setConversas(novas);
      // ?conversa=<id> permite abrir o Inbox já com uma conversa selecionada
      // (ex: vindo do "Enviar mensagem" na tela de Contatos).
      const desejada = new URLSearchParams(window.location.search).get("conversa");
      setSelId(
        (atual) =>
          atual ??
          (desejada && novas.some((c) => c.id === desejada) ? desejada : null) ??
          novas[0]?.id ??
          null
      );
      if (desejada) {
        setMobileView("thread");
        // Limpa o parâmetro para o polling não reaplicar a seleção.
        window.history.replaceState(null, "", "/inbox");
      }
    }
    if (resContatos.ok) {
      const { contatos: lista } = await resContatos.json();
      setContatos(lista ?? []);
    }
    if (resNegocios.ok) {
      const { negocios: lista } = await resNegocios.json();
      setNegocios(lista ?? []);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carrega as conversas assim que a página monta
    carregar();
    const id = setInterval(carregar, 4000);
    return () => clearInterval(id);
  }, [carregar]);

  const sel = conversas.find((c) => c.id === selId) ?? null;

  function selecionar(id: string) {
    setSelId(id);
    setMobileView("thread");
    setConversas((prev) => prev.map((c) => (c.id === id ? { ...c, naoLidas: 0 } : c)));
    fetch(`/api/whatsapp/conversas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unreadCount: 0 }),
    });
  }

  async function enviar(texto: string) {
    if (!selId) return;
    const res = await fetch(`/api/whatsapp/conversas/${selId}/mensagens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto }),
    });

    if (!res.ok) {
      await carregar();
      return;
    }

    const { mensagem } = await res.json();
    setConversas((prev) =>
      prev.map((c) =>
        c.id === selId
          ? {
              ...c,
              atendidoPor: "humano",
              ultimaHora: mensagem.hora,
              mensagens: [...c.mensagens, mensagem],
            }
          : c
      )
    );
  }

  function assumir() {
    if (!selId) return;
    setConversas((prev) =>
      prev.map((c) => (c.id === selId ? { ...c, atendidoPor: "humano" } : c))
    );
    fetch(`/api/whatsapp/conversas/${selId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ atendidoPor: "humano" }),
    });
  }

  async function trocarContato(contatoId: string) {
    if (!selId) return;
    setConversas((prev) =>
      prev.map((c) => (c.id === selId ? { ...c, contatoId } : c))
    );
    await fetch(`/api/whatsapp/conversas/${selId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contatoId }),
    });
  }

  function aoNegocioCriado(negocio: Negocio) {
    setNegocios((prev) => [...prev, negocio]);
  }

  function mudarStatus(status: "aberta" | "encerrada") {
    if (!selId) return;
    setConversas((prev) =>
      prev.map((c) => (c.id === selId ? { ...c, status } : c))
    );
    fetch(`/api/whatsapp/conversas/${selId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...(status === "encerrada" ? { unreadCount: 0 } : {}) }),
    });
  }

  // Prefere o nome do contato vinculado ao nome de perfil do WhatsApp.
  const conversasExibicao = conversas.map((c) => {
    const contato = c.contatoId
      ? contatos.find((x) => x.id === c.contatoId)
      : undefined;
    return contato ? { ...c, nome: contato.nome } : c;
  });

  if (!sel) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <Topbar title="Inbox" description="Conversas do WhatsApp" />
        <div className="flex flex-1 items-center justify-center px-8 text-center text-sm text-muted-foreground">
          Nenhuma conversa ainda. Assim que chegar uma mensagem no WhatsApp
          conectado, ela aparece aqui.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Topbar title="Inbox" description="Conversas do WhatsApp" />

      <div className="flex min-h-0 flex-1">
        <ConversationList
          conversas={conversasExibicao}
          selId={sel.id}
          onSelect={selecionar}
          className={cn(
            "w-full shrink-0 border-border md:w-80 md:border-r",
            mobileView === "thread" && "hidden md:flex"
          )}
        />

        <MessageThread
          conversa={conversasExibicao.find((c) => c.id === sel.id) ?? sel}
          onEnviar={enviar}
          onAssumir={assumir}
          onEncerrar={() => mudarStatus("encerrada")}
          onReabrir={() => mudarStatus("aberta")}
          onVoltar={() => setMobileView("lista")}
          className={cn(
            "min-w-0 flex-1",
            mobileView === "lista" && "hidden md:flex"
          )}
        />

        <ContactPanel
          conversa={sel}
          contatos={contatos}
          negocios={negocios}
          onTrocarContato={trocarContato}
          onNegocioCriado={aoNegocioCriado}
          className="hidden w-80 shrink-0 border-l border-border xl:flex"
        />
      </div>
    </div>
  );
}
