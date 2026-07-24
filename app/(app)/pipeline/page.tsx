"use client";

import { useEffect, useState } from "react";
import { MoveRight, GripVertical, Plus } from "lucide-react";

import { Topbar } from "@/components/app/topbar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NovoNegocioDialog } from "@/components/app/negocios/novo-negocio-dialog";
import {
  STAGES,
  type Contato,
  type Negocio,
  type PipelineStage,
} from "@/lib/types";
import { cn, formatBRL, initials } from "@/lib/utils";

const STAGE_ACCENT: Record<PipelineStage, string> = {
  lead: "bg-subtle",
  qualificado: "bg-status-open",
  proposta: "bg-status-progress",
  negociacao: "bg-status-progress",
  ganho: "bg-status-won",
  perdido: "bg-status-lost",
};

export default function PipelinePage() {
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [novoAberto, setNovoAberto] = useState(false);

  useEffect(() => {
    fetch("/api/negocios", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { negocios: [] }))
      .then(({ negocios: lista }) => setNegocios(lista ?? []));
    fetch("/api/contatos", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { contatos: [] }))
      .then(({ contatos: lista }) => setContatos(lista ?? []));
  }, []);

  function getContato(id: string) {
    return contatos.find((c) => c.id === id);
  }

  async function mover(id: string, stage: PipelineStage) {
    setNegocios((prev) => prev.map((n) => (n.id === id ? { ...n, stage } : n)));
    await fetch(`/api/negocios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
  }

  function aoCriar(negocio: Negocio) {
    setNegocios((prev) => [...prev, negocio]);
  }

  const totalAberto = negocios
    .filter((n) => !["ganho", "perdido"].includes(n.stage))
    .reduce((s, n) => s + n.valor, 0);

  return (
    <>
      <Topbar
        title="Pipeline de vendas"
        description={`${formatBRL(totalAberto)} em negócios abertos`}
      />

      <div className="p-4 md:p-6">
        <div className="mb-4 flex justify-end">
          <Button
            variant="brand"
            className="gap-1.5"
            onClick={() => setNovoAberto(true)}
          >
            <Plus className="size-4" />
            Novo negócio
          </Button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2">
          {STAGES.map((stage, i) => {
            const deals = negocios.filter((n) => n.stage === stage.id);
            const total = deals.reduce((s, n) => s + n.valor, 0);
            return (
              <div
                key={stage.id}
                className="reveal flex w-72 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card panel-sm"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className="border-b border-border-strong">
                  <div className={cn("h-1", STAGE_ACCENT[stage.id])} />
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-medium tracking-tight">
                        {stage.label}
                      </span>
                      <span className="tabular rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {deals.length}
                      </span>
                    </div>
                    <span className="tabular text-xs font-medium text-muted-foreground">
                      {formatBRL(total)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-2 p-2">
                  {deals.map((n) => {
                    const contato = getContato(n.contatoId);
                    return (
                      <article
                        key={n.id}
                        className="group cursor-pointer rounded-md border border-border bg-elevated p-3 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-brand/50 hover:panel-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-snug">
                            {n.titulo}
                          </p>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              aria-label="Ações do negócio"
                              className="mt-0.5 shrink-0 text-muted-foreground outline-none hover:text-foreground"
                            >
                              <GripVertical className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Mover para</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {STAGES.filter((s) => s.id !== n.stage).map(
                                (s) => (
                                  <DropdownMenuItem
                                    key={s.id}
                                    onClick={() => mover(n.id, s.id)}
                                  >
                                    <MoveRight className="size-4" />
                                    {s.label}
                                  </DropdownMenuItem>
                                )
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {n.empresa}
                        </p>

                        <div className="mt-3 flex items-center justify-between">
                          <span className="tabular font-display text-sm font-semibold">
                            {formatBRL(n.valor)}
                          </span>
                          <span className="tabular text-xs text-muted-foreground">
                            {n.probabilidade}%
                          </span>
                        </div>

                        <div className="mt-3 flex items-center gap-2 border-t border-border pt-2.5">
                          <Avatar className="size-6">
                            <AvatarFallback className="text-[10px]">
                              {initials(contato?.nome ?? "??")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate text-xs text-muted-foreground">
                            {contato?.nome ?? "—"}
                          </span>
                        </div>
                      </article>
                    );
                  })}

                  {deals.length === 0 ? (
                    <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                      Nenhum negócio nesta etapa.
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <NovoNegocioDialog
        open={novoAberto}
        onOpenChange={setNovoAberto}
        contatos={contatos}
        onCriado={aoCriar}
      />
    </>
  );
}
