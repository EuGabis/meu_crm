"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mail,
  Phone,
  Building2,
  ExternalLink,
  Plus,
  CalendarPlus,
  ArrowLeftRight,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NovoNegocioDialog } from "@/components/app/negocios/novo-negocio-dialog";
import { NovoEventoDialog } from "@/components/app/agenda/novo-evento-dialog";
import {
  CONTATO_STATUS_LABEL,
  STAGES,
  type Contato,
  type Conversa,
  type Negocio,
} from "@/lib/types";
import { cn, formatBRL, initials } from "@/lib/utils";

export function ContactPanel({
  conversa,
  contatos,
  negocios,
  onTrocarContato,
  onNegocioCriado,
  className,
}: {
  conversa: Conversa;
  contatos: Contato[];
  negocios: Negocio[];
  onTrocarContato: (contatoId: string) => void;
  onNegocioCriado: (negocio: Negocio) => void;
  className?: string;
}) {
  const [negocioAberto, setNegocioAberto] = useState(false);
  const [reuniaoAberta, setReuniaoAberta] = useState(false);
  const [trocando, setTrocando] = useState(false);

  const contato = conversa.contatoId
    ? contatos.find((c) => c.id === conversa.contatoId)
    : undefined;
  const negociosDoContato = contato
    ? negocios.filter((n) => n.contatoId === contato.id)
    : [];

  return (
    <aside className={cn("flex min-h-0 flex-col overflow-y-auto bg-surface", className)}>
      <div className="flex flex-col items-center gap-2 border-b border-border p-5 text-center">
        <Avatar className="size-16 text-lg">
          <AvatarFallback>{initials(contato?.nome ?? conversa.nome)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-display font-semibold tracking-tight">
            {contato?.nome ?? conversa.nome}
          </p>
          {contato && (contato.cargo || contato.empresa) ? (
            <p className="text-xs text-muted-foreground">
              {[contato.cargo, contato.empresa].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
        {contato ? (
          <Badge variant="outline">{CONTATO_STATUS_LABEL[contato.status]}</Badge>
        ) : null}
      </div>

      {/* Dados */}
      <div className="space-y-2.5 border-b border-border p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Dados
        </p>
        <InfoRow icon={<Phone className="size-4" />} texto={conversa.telefone} />
        {contato?.email ? (
          <InfoRow icon={<Mail className="size-4" />} texto={contato.email} />
        ) : null}
        {contato?.empresa ? (
          <InfoRow icon={<Building2 className="size-4" />} texto={contato.empresa} />
        ) : null}
      </div>

      {/* Negócios */}
      <div className="space-y-2.5 border-b border-border p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Negócios ({negociosDoContato.length})
        </p>
        {negociosDoContato.length > 0 ? (
          negociosDoContato.map((n) => {
            const stage = STAGES.find((s) => s.id === n.stage)!;
            return (
              <div
                key={n.id}
                className="rounded-md border border-border bg-elevated p-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{n.titulo}</p>
                  <span className="tabular shrink-0 text-sm font-medium">
                    {formatBRL(n.valor)}
                  </span>
                </div>
                <div className="mt-1.5">
                  <Badge variant={stage.variant}>{stage.label}</Badge>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-xs text-muted-foreground">Nenhum negócio vinculado.</p>
        )}
      </div>

      {/* Ações */}
      <div className="space-y-2 p-4">
        {contato ? (
          <Button variant="outline" className="w-full justify-start gap-2" asChild>
            <Link href="/contatos">
              <ExternalLink className="size-4" />
              Ver contato completo
            </Link>
          </Button>
        ) : null}
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          disabled={!contato}
          onClick={() => setNegocioAberto(true)}
        >
          <Plus className="size-4" />
          Criar negócio
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          disabled={!contato}
          onClick={() => setReuniaoAberta(true)}
        >
          <CalendarPlus className="size-4" />
          Agendar reunião
        </Button>

        {trocando ? (
          <Select
            value={contato?.id ?? ""}
            onValueChange={(v) => {
              onTrocarContato(v);
              setTrocando(false);
            }}
          >
            <SelectTrigger aria-label="Escolher contato">
              <SelectValue placeholder="Escolha um contato" />
            </SelectTrigger>
            <SelectContent>
              {contatos.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome} — {c.telefone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <button
            onClick={() => setTrocando(true)}
            className="flex w-full items-center gap-1.5 px-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftRight className="size-3" />
            Trocar contato vinculado
          </button>
        )}
      </div>

      {contato ? (
        <NovoNegocioDialog
          open={negocioAberto}
          onOpenChange={setNegocioAberto}
          contatos={contatos}
          contatoFixo={contato}
          onCriado={onNegocioCriado}
        />
      ) : null}

      {contato ? (
        <NovoEventoDialog
          open={reuniaoAberta}
          onOpenChange={setReuniaoAberta}
          contatos={contatos}
          diaSelecionado={new Date()}
          contatoInicialId={contato.id}
          onCriado={() => {}}
        />
      ) : null}
    </aside>
  );
}

function InfoRow({ icon, texto }: { icon: React.ReactNode; texto: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <span className="text-subtle">{icon}</span>
      <span className="min-w-0 truncate">{texto}</span>
    </div>
  );
}
