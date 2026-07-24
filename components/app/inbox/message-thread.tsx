"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Bot,
  Phone,
  MoreVertical,
  Paperclip,
  SendHorizontal,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Conversa, Mensagem } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

export function MessageThread({
  conversa,
  onEnviar,
  onAssumir,
  onVoltar,
  className,
}: {
  conversa: Conversa;
  onEnviar: (texto: string) => void;
  onAssumir: () => void;
  onVoltar?: () => void;
  className?: string;
}) {
  const [texto, setTexto] = useState("");

  function enviar() {
    const t = texto.trim();
    if (!t) return;
    onEnviar(t);
    setTexto("");
  }

  return (
    <div className={cn("flex min-h-0 flex-col bg-background", className)}>
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-2.5">
        {onVoltar ? (
          <button
            onClick={onVoltar}
            aria-label="Voltar"
            className="text-muted-foreground hover:text-foreground md:hidden"
          >
            <ArrowLeft className="size-5" />
          </button>
        ) : null}
        <Avatar className="size-9">
          <AvatarFallback>{initials(conversa.nome)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{conversa.nome}</p>
          <p className="truncate text-xs text-muted-foreground">
            {conversa.online ? "Online agora" : "WhatsApp"} · {conversa.telefone}
          </p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Ligar">
          <Phone className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Mais">
          <MoreVertical className="size-4" />
        </Button>
      </div>

      {/* Banner de agente */}
      {conversa.atendidoPor === "agente" ? (
        <div className="flex items-center gap-2 border-b border-border bg-elevated px-4 py-2">
          <Bot className="size-4 shrink-0 text-brand" />
          <p className="flex-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {conversa.agenteNome}
            </span>{" "}
            está respondendo automaticamente.
          </p>
          <Button variant="outline" size="sm" onClick={onAssumir}>
            Assumir conversa
          </Button>
        </div>
      ) : null}

      {/* Mensagens */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        <p className="mx-auto w-fit rounded-full bg-elevated px-2.5 py-1 text-[11px] text-muted-foreground">
          Conversa iniciada no WhatsApp
        </p>
        {conversa.mensagens.map((m) => (
          <Bubble key={m.id} mensagem={m} agenteNome={conversa.agenteNome} />
        ))}
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-surface p-3">
        <div className="flex items-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Anexar"
            className="shrink-0"
          >
            <Paperclip className="size-4" />
          </Button>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviar();
              }
            }}
            rows={1}
            placeholder="Escreva uma mensagem…"
            className="max-h-32 min-h-9 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
          />
          <Button
            variant="brand"
            size="icon"
            aria-label="Enviar"
            onClick={enviar}
            disabled={!texto.trim()}
            className="shrink-0"
          >
            <SendHorizontal className="size-4" />
          </Button>
        </div>
        <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
          Enter envia · Shift+Enter quebra linha
        </p>
      </div>
    </div>
  );
}

function Bubble({
  mensagem,
  agenteNome,
}: {
  mensagem: Mensagem;
  agenteNome?: string;
}) {
  const daEmpresa = mensagem.autor !== "cliente";
  const agente = mensagem.autor === "agente";

  return (
    <div className={cn("flex", daEmpresa ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[78%] sm:max-w-[70%]")}>
        {agente ? (
          <p className="mb-1 flex items-center gap-1 pl-1 text-[11px] text-muted-foreground">
            <Bot className="size-3 text-brand" />
            {agenteNome} · agente
          </p>
        ) : null}
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-sm leading-snug",
            !daEmpresa && "rounded-tl-sm border-border bg-elevated",
            daEmpresa && !agente && "rounded-tr-sm border-white/10 bg-white/[0.08]",
            agente && "rounded-tr-sm border-brand/25 bg-brand-muted"
          )}
        >
          {mensagem.texto}
        </div>
        <p
          className={cn(
            "mt-1 px-1 text-[10px] text-muted-foreground",
            daEmpresa ? "text-right" : "text-left"
          )}
        >
          {mensagem.hora}
        </p>
      </div>
    </div>
  );
}
