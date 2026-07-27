import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Topbar } from "@/components/app/topbar";
import { StatTile } from "@/components/app/stat-tile";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STAGES, type PipelineStage } from "@/lib/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapDealRow, type DbDealRow } from "@/lib/negocios/mapper";
import { formatBRL, formatDate } from "@/lib/utils";

const ABERTOS: PipelineStage[] = ["lead", "qualificado", "proposta", "negociacao"];

// Sempre busca dados frescos (nada de cache estático nesta tela).
export const dynamic = "force-dynamic";

async function carregarNegocios() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("[painel/deals]", error);
    return [];
  }
  return (data as DbDealRow[]).map(mapDealRow);
}

export default async function PainelPage() {
  const negocios = await carregarNegocios();

  const ganhos = negocios.filter((n) => n.stage === "ganho");
  const perdidos = negocios.filter((n) => n.stage === "perdido");
  const abertos = negocios.filter((n) => ABERTOS.includes(n.stage));

  const receitaGanha = ganhos.reduce((s, n) => s + n.valor, 0);
  const valorPipeline = abertos.reduce((s, n) => s + n.valor, 0);
  const fechados = ganhos.length + perdidos.length;
  const taxaConversao = fechados > 0 ? Math.round((ganhos.length / fechados) * 100) : 0;

  const maxValorStage = Math.max(
    ...ABERTOS.map((stage) =>
      negocios
        .filter((n) => n.stage === stage)
        .reduce((s, n) => s + n.valor, 0)
    ),
    1
  );

  const proximosFechamentos = abertos
    .filter((n) => n.fechamentoPrevisto)
    .sort(
      (a, b) =>
        new Date(a.fechamentoPrevisto).getTime() -
        new Date(b.fechamentoPrevisto).getTime()
    )
    .slice(0, 6);

  return (
    <>
      <Topbar title="Painel" description="Visão geral do comercial" />

      <div className="space-y-6 p-4 md:p-6">
        {/* KPIs */}
        <div className="reveal grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-lg border border-border bg-card panel-sm lg:grid-cols-4 lg:divide-y-0">
          <StatTile
            label="Receita ganha"
            value={receitaGanha}
            format="brl"
            hint="negócios ganhos"
            delay={0}
          />
          <StatTile
            label="Em pipeline"
            value={valorPipeline}
            format="brl"
            hint={`${abertos.length} ${abertos.length === 1 ? "negócio aberto" : "negócios abertos"}`}
            delay={80}
          />
          <StatTile
            label="Taxa de conversão"
            value={taxaConversao}
            format="percent"
            hint="ganhos / fechados"
            delay={160}
          />
          <StatTile
            label="Negócios ganhos"
            value={ganhos.length}
            hint="no total"
            delay={240}
          />
        </div>

        {/* Resumo do pipeline (largura total) */}
        <section className="reveal overflow-hidden rounded-lg border border-border bg-card panel-sm">
          <header className="flex items-center justify-between border-b border-border p-4">
            <h2 className="font-display text-sm font-medium tracking-tight">
              Pipeline por etapa
            </h2>
            <Link
              href="/pipeline"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Abrir pipeline
              <ArrowUpRight className="size-3.5" />
            </Link>
          </header>
          <div className="divide-y divide-border">
            {ABERTOS.map((stageId) => {
              const stage = STAGES.find((s) => s.id === stageId)!;
              const deals = negocios.filter((n) => n.stage === stageId);
              const total = deals.reduce((s, n) => s + n.valor, 0);
              const pct = Math.round((total / maxValorStage) * 100);
              return (
                <div key={stageId} className="flex items-center gap-4 p-4">
                  <div className="w-28 shrink-0">
                    <p className="text-sm font-medium">{stage.label}</p>
                    <p className="tabular text-xs text-muted-foreground">
                      {deals.length} neg.
                    </p>
                  </div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="bar-grow h-full rounded-full bg-brand"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="tabular w-28 shrink-0 text-right text-sm font-medium">
                    {formatBRL(total)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Próximos fechamentos */}
        <section
          className="reveal overflow-hidden rounded-lg border border-border bg-card panel-sm"
          style={{ animationDelay: "120ms" }}
        >
          <header className="border-b border-border p-4">
            <h2 className="font-display text-sm font-medium tracking-tight">
              Próximos fechamentos
            </h2>
          </header>
          {proximosFechamentos.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Negócio</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead className="text-right">Probabilidade</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Previsão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proximosFechamentos.map((n) => {
                  const stage = STAGES.find((s) => s.id === n.stage)!;
                  return (
                    <TableRow key={n.id}>
                      <TableCell className="font-medium">{n.titulo}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {n.empresa}
                      </TableCell>
                      <TableCell>
                        <Badge variant={stage.variant}>{stage.label}</Badge>
                      </TableCell>
                      <TableCell className="tabular text-right text-muted-foreground">
                        {n.probabilidade}%
                      </TableCell>
                      <TableCell className="tabular text-right font-medium">
                        {formatBRL(n.valor)}
                      </TableCell>
                      <TableCell className="tabular text-right text-muted-foreground">
                        {formatDate(n.fechamentoPrevisto)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center gap-1 p-12 text-center">
              <p className="text-sm font-medium">Nenhum fechamento previsto</p>
              <p className="text-sm text-muted-foreground">
                Negócios abertos com data de fechamento aparecem aqui.
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
