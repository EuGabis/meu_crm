"use client";

import Link from "next/link";
import { Mail, Phone, Building2, ExternalLink, Plus, CalendarPlus } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getContato, NEGOCIOS } from "@/lib/mock-data";
import {
  CONTATO_STATUS_LABEL,
  STAGES,
  type Conversa,
} from "@/lib/types";
import { cn, formatBRL, initials } from "@/lib/utils";

export function ContactPanel({
  conversa,
  className,
}: {
  conversa: Conversa;
  className?: string;
}) {
  const contato = getContato(conversa.contatoId);
  const negocios = NEGOCIOS.filter((n) => n.contatoId === conversa.contatoId);

  return (
    <aside className={cn("flex min-h-0 flex-col overflow-y-auto bg-surface", className)}>
      <div className="flex flex-col items-center gap-2 border-b border-border p-5 text-center">
        <Avatar className="size-16 text-lg">
          <AvatarFallback>{initials(conversa.nome)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-display font-semibold tracking-tight">
            {conversa.nome}
          </p>
          {contato ? (
            <p className="text-xs text-muted-foreground">
              {contato.cargo} · {contato.empresa}
            </p>
          ) : null}
        </div>
        {contato ? (
          <Badge variant="outline">
            {CONTATO_STATUS_LABEL[contato.status]}
          </Badge>
        ) : null}
      </div>

      {/* Dados */}
      <div className="space-y-2.5 border-b border-border p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Dados
        </p>
        <InfoRow icon={<Phone className="size-4" />} texto={conversa.telefone} />
        {contato ? (
          <>
            <InfoRow icon={<Mail className="size-4" />} texto={contato.email} />
            <InfoRow
              icon={<Building2 className="size-4" />}
              texto={contato.empresa}
            />
          </>
        ) : null}
      </div>

      {/* Negócios */}
      <div className="space-y-2.5 border-b border-border p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Negócios ({negocios.length})
        </p>
        {negocios.length > 0 ? (
          negocios.map((n) => {
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
          <p className="text-xs text-muted-foreground">
            Nenhum negócio vinculado.
          </p>
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
        <Button variant="outline" className="w-full justify-start gap-2">
          <Plus className="size-4" />
          Criar negócio
        </Button>
        <Button variant="outline" className="w-full justify-start gap-2">
          <CalendarPlus className="size-4" />
          Agendar reunião
        </Button>
      </div>
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
