"use client";

import { useState } from "react";
import {
  MessageCircle,
  Calendar,
  Mail,
  Megaphone,
  ShieldCheck,
  Check,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { INTEGRACOES } from "@/lib/config-data";
import {
  INTEGRACAO_STATUS_LABEL,
  type Integracao,
  type IntegracaoStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONES: Record<string, LucideIcon> = {
  "int-whatsapp": MessageCircle,
  "int-google": Calendar,
  "int-gmail": Mail,
  "int-meta-ads": Megaphone,
};

const STATUS_VARIANT: Record<IntegracaoStatus, "won" | "lost" | "default"> = {
  conectado: "won",
  erro: "lost",
  desconectado: "default",
};

export default function IntegracoesPage() {
  const [itens, setItens] = useState<Integracao[]>(INTEGRACOES);

  function alternar(id: string) {
    setItens((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              status: i.status === "conectado" ? "desconectado" : "conectado",
            }
          : i
      )
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Integrações
        </h2>
        <p className="text-sm text-muted-foreground">
          Conecte serviços externos. A autorização é feita por OAuth e os
          segredos ficam no servidor — nunca no navegador.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {itens.map((i) => {
          const Icon = ICONES[i.id] ?? MessageCircle;
          const conectado = i.status === "conectado";
          return (
            <div
              key={i.id}
              className="flex flex-col rounded-lg border border-border bg-card panel-sm"
            >
              <div className="flex items-start gap-3 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-elevated">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{i.nome}</p>
                    <Badge variant="outline">{i.categoria}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    por {i.provedor}
                  </p>
                </div>
                <Badge
                  variant={STATUS_VARIANT[i.status]}
                  className="shrink-0 gap-1"
                >
                  {conectado ? <Check className="size-3" /> : null}
                  {INTEGRACAO_STATUS_LABEL[i.status]}
                </Badge>
              </div>

              <div className="flex-1 space-y-3 px-4">
                <p className="text-sm text-muted-foreground">{i.descricao}</p>
                <div className="flex flex-wrap gap-1.5">
                  {i.escopos.map((e) => (
                    <span
                      key={e}
                      className="rounded-sm bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {e}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 rounded-md border border-border bg-elevated p-2.5">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" />
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    {i.seguranca}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4">
                <span className="text-xs text-muted-foreground">
                  {conectado && i.ultimaSync
                    ? "Sincronizado agora há pouco"
                    : "Não conectado"}
                </span>
                <Button
                  variant={conectado ? "outline" : "brand"}
                  size="sm"
                  onClick={() => alternar(i.id)}
                  className={cn(conectado && "text-muted-foreground")}
                >
                  {conectado ? "Desconectar" : "Conectar"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
