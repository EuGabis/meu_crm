"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  Bot,
  Phone,
  MoreVertical,
  Paperclip,
  SendHorizontal,
  Mic,
  X,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Conversa, Mensagem } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

function labelDoDia(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);
  if (d.toDateString() === hoje.toDateString()) return "Hoje";
  if (d.toDateString() === ontem.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR");
}

function melhorMimeAudio(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidatos = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidatos.find((m) => MediaRecorder.isTypeSupported(m));
}

function extDeMime(mime: string): string {
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("mpeg")) return "mp3";
  return "webm";
}

function formatDur(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function MessageThread({
  conversa,
  onEnviar,
  onEnviarMidia,
  onAssumir,
  onEncerrar,
  onReabrir,
  onVoltar,
  className,
}: {
  conversa: Conversa;
  onEnviar: (texto: string) => void;
  onEnviarMidia: (
    arquivo: Blob,
    tipo: "imagem" | "audio",
    nomeArquivo: string
  ) => void;
  onAssumir: () => void;
  onEncerrar: () => void;
  onReabrir: () => void;
  onVoltar?: () => void;
  className?: string;
}) {
  const [texto, setTexto] = useState("");
  const [gravando, setGravando] = useState(false);
  const [duracao, setDuracao] = useState(0);
  const mensagensRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelandoRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const encerrada = conversa.status === "encerrada";
  const telDigitos = conversa.telefone.replace(/\D/g, "");

  useEffect(() => {
    const el = mensagensRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [conversa.id, conversa.mensagens.length]);

  function enviar() {
    const t = texto.trim();
    if (!t) return;
    onEnviar(t);
    setTexto("");
  }

  function aoEscolherArquivo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const tipo = file.type.startsWith("audio") ? "audio" : "imagem";
    onEnviarMidia(file, tipo, file.name);
  }

  async function iniciarGravacao() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = melhorMimeAudio();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      cancelandoRef.current = false;
      rec.ondataavailable = (ev) => {
        if (ev.data.size) chunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) window.clearInterval(timerRef.current);
        if (!cancelandoRef.current && chunksRef.current.length) {
          const tipoBlob = rec.mimeType || "audio/webm";
          const blob = new Blob(chunksRef.current, { type: tipoBlob });
          onEnviarMidia(blob, "audio", `nota-de-voz.${extDeMime(tipoBlob)}`);
        }
        setGravando(false);
        setDuracao(0);
      };
      recorderRef.current = rec;
      rec.start();
      setGravando(true);
      setDuracao(0);
      timerRef.current = window.setInterval(
        () => setDuracao((d) => d + 1),
        1000
      );
    } catch {
      window.alert("Não foi possível acessar o microfone.");
    }
  }

  function pararEEnviar() {
    recorderRef.current?.stop();
  }
  function cancelarGravacao() {
    cancelandoRef.current = true;
    recorderRef.current?.stop();
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
            WhatsApp · {conversa.telefone}
            {encerrada ? " · encerrada" : ""}
          </p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Ligar" asChild>
          <a href={`tel:+${telDigitos}`}>
            <Phone className="size-4" />
          </a>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Mais ações">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {encerrada ? (
              <DropdownMenuItem onClick={onReabrir}>
                <RotateCcw className="size-4" />
                Reabrir conversa
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={onEncerrar}>
                <CheckCircle2 className="size-4" />
                Encerrar conversa
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Banner de agente */}
      {!encerrada && conversa.atendidoPor === "agente" ? (
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
      <div
        ref={mensagensRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
      >
        <p className="mx-auto w-fit rounded-full bg-elevated px-2.5 py-1 text-[11px] text-muted-foreground">
          Conversa iniciada no WhatsApp
        </p>
        {conversa.mensagens.map((m, i) => {
          const anterior = conversa.mensagens[i - 1];
          const mostrarDia =
            m.dataISO &&
            (!anterior?.dataISO ||
              new Date(anterior.dataISO).toDateString() !==
                new Date(m.dataISO).toDateString());
          return (
            <div key={m.id} className="space-y-3">
              {mostrarDia ? (
                <p className="mx-auto w-fit rounded-full bg-elevated px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  {labelDoDia(m.dataISO!)}
                </p>
              ) : null}
              <Bubble mensagem={m} agenteNome={conversa.agenteNome} />
            </div>
          );
        })}
      </div>

      {/* Composer / banner de encerrada */}
      {encerrada ? (
        <div className="flex items-center justify-between gap-3 border-t border-border bg-surface p-3">
          <p className="text-sm text-muted-foreground">
            Esta conversa foi encerrada.
          </p>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onReabrir}>
            <RotateCcw className="size-4" />
            Reabrir
          </Button>
        </div>
      ) : (
        <div className="border-t border-border bg-surface p-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,audio/*"
            className="hidden"
            onChange={aoEscolherArquivo}
          />
          <div className="flex items-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Anexar imagem ou áudio"
              className="shrink-0"
              onClick={() => fileRef.current?.click()}
              disabled={gravando}
            >
              <Paperclip className="size-4" />
            </Button>

            {gravando ? (
              <div className="flex h-9 flex-1 items-center gap-2 rounded-md border border-input bg-background px-3">
                <span className="size-2 animate-pulse rounded-full bg-destructive" />
                <span className="tabular text-sm text-muted-foreground">
                  Gravando… {formatDur(duracao)}
                </span>
                <button
                  onClick={cancelarGravacao}
                  aria-label="Cancelar gravação"
                  className="ml-auto text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
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
            )}

            {gravando ? (
              <Button
                variant="brand"
                size="icon"
                aria-label="Enviar áudio"
                onClick={pararEEnviar}
                className="shrink-0"
              >
                <SendHorizontal className="size-4" />
              </Button>
            ) : texto.trim() ? (
              <Button
                variant="brand"
                size="icon"
                aria-label="Enviar"
                onClick={enviar}
                className="shrink-0"
              >
                <SendHorizontal className="size-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Gravar áudio"
                onClick={iniciarGravacao}
                className="shrink-0"
              >
                <Mic className="size-4" />
              </Button>
            )}
          </div>
          <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
            {gravando
              ? "Toque no enviar para mandar a nota de voz"
              : "Enter envia · Shift+Enter quebra linha"}
          </p>
        </div>
      )}
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
  const ehImagem = mensagem.tipo === "imagem" && !!mensagem.mediaUrl;
  const ehAudio = mensagem.tipo === "audio" && !!mensagem.mediaUrl;
  const temMedia = ehImagem || ehAudio;

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
            "overflow-hidden rounded-lg border text-sm leading-snug",
            temMedia ? "p-1" : "whitespace-pre-wrap px-3 py-2",
            !daEmpresa && "rounded-tl-sm border-border bg-elevated",
            daEmpresa && !agente && "rounded-tr-sm border-white/10 bg-white/[0.08]",
            agente && "rounded-tr-sm border-brand/25 bg-brand-muted",
            mensagem.falhou && "border-destructive/50 opacity-80"
          )}
        >
          {ehImagem ? (
            <a href={mensagem.mediaUrl} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mensagem.mediaUrl}
                alt={mensagem.texto || "Imagem"}
                className="max-h-72 w-full rounded-[5px] object-cover"
              />
            </a>
          ) : null}
          {ehAudio ? (
            <audio
              controls
              src={mensagem.mediaUrl}
              className="h-10 w-56 max-w-full"
            />
          ) : null}
          {mensagem.texto ? (
            <div className={cn(temMedia && "px-2 pb-1 pt-1.5")}>
              {mensagem.texto}
            </div>
          ) : null}
        </div>
        <p
          className={cn(
            "mt-1 flex items-center gap-1 px-1 text-[10px] text-muted-foreground",
            daEmpresa ? "justify-end text-right" : "justify-start text-left"
          )}
        >
          {mensagem.falhou ? (
            <span className="inline-flex items-center gap-0.5 font-medium text-destructive">
              <AlertCircle className="size-3" />
              não entregue ·
            </span>
          ) : null}
          {mensagem.hora}
        </p>
      </div>
    </div>
  );
}
