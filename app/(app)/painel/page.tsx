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
import {
  ATIVIDADE_LABEL,
  STAGES,
  type PipelineStage,
} from "@/lib/types";
import {
  ATIVIDADES,
  NEGOCIOS,
  getContato,
} from "@/lib/mock-data";
import { formatBRL, formatDate } from "@/lib/utils";

const ABERTOS: PipelineStage[] = [
  "lead",
  "qualificado",
  "proposta",
  "negociacao",
];

export default function PainelPage() {
  const ganhos = NEGOCIOS.filter((n) => n.stage === "ganho");
  const perdidos = NEGOCIOS.filter((n) => n.stage === "perdido");
  const abertos = NEGOCIOS.filter((n) => ABERTOS.includes(n.stage));

  const receitaGanha = ganhos.reduce((s, n) => s + n.valor, 0);
  const valorPipeline = abertos.reduce((s, n) => s + n.valor, 0);
  const taxaConversao = Math.round(
    (ganhos.length / (ganhos.length + perdidos.length)) * 100
  );

  const maxValorStage = Math.max(
    ...ABERTOS.map((stage) =>
      NEGOCIOS.filter((n) => n.stage === stage).reduce((s, n) => s + n.valor, 0)
    ),
    1
  );

  const proximosFechamentos = [...abertos]
    .sort(
      (a, b) =>
        new Date(a.fechamentoPrevisto).getTime() -
        new Date(b.fechamentoPrevisto).getTime()
    )
    .slice(0, 5);

  const atividadesRecentes = [...ATIVIDADES]
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 6);

  return (
    <>
      <Topbar
        title="Painel"
        description="Visão geral do comercial — atualizado hoje"
      />

      <div className="space-y-6 p-4 md:p-6">
        {/* KPIs — grade tipo razão, sem espaçamento entre células */}
        <div className="reveal grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-lg border border-border bg-card panel-sm lg:grid-cols-4 lg:divide-y-0">
          <StatTile
            label="Receita ganha"
            value={receitaGanha}
            format="brl"
            trend={{ value: "18%", positive: true }}
            hint="vs. mês anterior"
            delay={0}
          />
          <StatTile
            label="Em pipeline"
            value={valorPipeline}
            format="brl"
            hint={`${abertos.length} negócios abertos`}
            delay={80}
          />
          <StatTile
            label="Taxa de conversão"
            value={taxaConversao}
            format="percent"
            trend={{ value: "4pp", positive: true }}
            hint="ganhos / fechados"
            delay={160}
          />
          <StatTile
            label="Negócios ganhos"
            value={ganhos.length}
            hint="no período"
            delay={240}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Resumo do pipeline */}
          <section className="reveal overflow-hidden rounded-lg border border-border bg-card panel-sm lg:col-span-3">
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
                const deals = NEGOCIOS.filter((n) => n.stage === stageId);
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

          {/* Atividades recentes */}
          <section
            className="reveal overflow-hidden rounded-lg border border-border bg-card panel-sm lg:col-span-2"
            style={{ animationDelay: "120ms" }}
          >
            <header className="border-b border-border p-4">
              <h2 className="font-display text-sm font-medium tracking-tight">
                Atividades recentes
              </h2>
            </header>
            <ul className="divide-y divide-border">
              {atividadesRecentes.map((a) => {
                const contato = getContato(a.contatoId);
                return (
                  <li key={a.id} className="flex gap-3 p-4">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                    <div className="min-w-0">
                      <p className="text-sm leading-snug">{a.descricao}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {contato?.nome ?? "—"}
                        </span>{" "}
                        · {ATIVIDADE_LABEL[a.tipo]} ·{" "}
                        <span className="tabular">{formatDate(a.data)}</span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* Próximos fechamentos */}
        <section
          className="reveal overflow-hidden rounded-lg border border-border bg-card panel-sm"
          style={{ animationDelay: "200ms" }}
        >
          <header className="border-b border-border p-4">
            <h2 className="font-display text-sm font-medium tracking-tight">
              Próximos fechamentos
            </h2>
          </header>
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
        </section>
      </div>
    </>
  );
}
