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
  ORIGEM_LABEL,
  STAGES,
  type Origem,
  type PipelineStage,
} from "@/lib/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapDealRow, type DbDealRow } from "@/lib/negocios/mapper";
import { mapContatoRow, type DbContatoRow } from "@/lib/contatos/mapper";
import { cn, formatBRL } from "@/lib/utils";

const FUNIL: PipelineStage[] = [
  "lead",
  "qualificado",
  "proposta",
  "negociacao",
  "ganho",
];

export const dynamic = "force-dynamic";

async function carregarDados() {
  const supabase = createSupabaseServerClient();
  const [deals, contatos] = await Promise.all([
    supabase.from("deals").select("*"),
    supabase.from("contacts").select("*"),
  ]);

  if (deals.error) console.error("[relatorios/deals]", deals.error);
  if (contatos.error) console.error("[relatorios/contacts]", contatos.error);

  return {
    negocios: ((deals.data as DbDealRow[]) ?? []).map(mapDealRow),
    contatos: ((contatos.data as DbContatoRow[]) ?? []).map(mapContatoRow),
  };
}

export default async function RelatoriosPage() {
  const { negocios, contatos } = await carregarDados();

  const ganhos = negocios.filter((n) => n.stage === "ganho");
  const perdidos = negocios.filter((n) => n.stage === "perdido");
  const receitaTotal = ganhos.reduce((s, n) => s + n.valor, 0);
  const ticketMedio = ganhos.length
    ? Math.round(receitaTotal / ganhos.length)
    : 0;
  const fechados = ganhos.length + perdidos.length;
  const taxaConversao = fechados > 0 ? Math.round((ganhos.length / fechados) * 100) : 0;

  // Funil
  const maxFunil = Math.max(
    ...FUNIL.map((s) => negocios.filter((n) => n.stage === s).length),
    1
  );

  // Desempenho por responsável (dono real do negócio)
  const porDono = new Map<string, { total: number; ganhos: number; receita: number }>();
  for (const n of negocios) {
    const key = n.ownerId || "—";
    const o = porDono.get(key) ?? { total: 0, ganhos: 0, receita: 0 };
    o.total += 1;
    if (n.stage === "ganho") {
      o.ganhos += 1;
      o.receita += n.valor;
    }
    porDono.set(key, o);
  }
  const responsaveis = [...porDono.entries()]
    .map(([nome, v]) => ({ nome, ...v }))
    .sort((a, b) => b.receita - a.receita);

  // Origem dos contatos
  const origens = (Object.keys(ORIGEM_LABEL) as Origem[])
    .map((o) => ({
      origem: o,
      total: contatos.filter((c) => c.origem === o).length,
    }))
    .filter((o) => o.total > 0)
    .sort((a, b) => b.total - a.total);
  const maxOrigem = Math.max(...origens.map((o) => o.total), 1);

  return (
    <>
      <Topbar title="Relatórios" description="Desempenho comercial" />

      <div className="space-y-6 p-4 md:p-6">
        <div className="reveal grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-lg border border-border bg-card panel-sm lg:grid-cols-4 lg:divide-y-0">
          <StatTile
            label="Receita fechada"
            value={receitaTotal}
            format="brl"
            delay={0}
          />
          <StatTile
            label="Ticket médio"
            value={ticketMedio}
            format="brl"
            hint="por negócio ganho"
            delay={80}
          />
          <StatTile
            label="Taxa de conversão"
            value={taxaConversao}
            format="percent"
            hint="ganhos / fechados"
            delay={160}
          />
          <StatTile label="Negócios ganhos" value={ganhos.length} delay={240} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Funil */}
          <section
            className="reveal overflow-hidden rounded-lg border border-border bg-card panel-sm"
            style={{ animationDelay: "80ms" }}
          >
            <header className="border-b border-border p-4">
              <h2 className="font-display text-sm font-medium tracking-tight">
                Funil de conversão
              </h2>
            </header>
            <div className="divide-y divide-border">
              {FUNIL.map((stageId) => {
                const stage = STAGES.find((s) => s.id === stageId)!;
                const count = negocios.filter((n) => n.stage === stageId).length;
                const pct = Math.round((count / maxFunil) * 100);
                return (
                  <div key={stageId} className="flex items-center gap-4 p-4">
                    <span className="w-24 shrink-0 text-sm font-medium">
                      {stage.label}
                    </span>
                    <div className="h-6 flex-1 overflow-hidden rounded-md bg-muted">
                      <div
                        className="bar-grow flex h-full items-center rounded-md bg-brand px-2"
                        style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
                      >
                        <span className="tabular text-xs font-semibold text-brand-foreground">
                          {count > 0 ? count : ""}
                        </span>
                      </div>
                    </div>
                    {count === 0 ? (
                      <span className="tabular w-6 shrink-0 text-right text-sm text-muted-foreground">
                        0
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Origem */}
          <section
            className="reveal overflow-hidden rounded-lg border border-border bg-card panel-sm"
            style={{ animationDelay: "160ms" }}
          >
            <header className="border-b border-border p-4">
              <h2 className="font-display text-sm font-medium tracking-tight">
                Origem dos contatos
              </h2>
            </header>
            {origens.length > 0 ? (
              <div className="divide-y divide-border">
                {origens.map((o) => {
                  const pct = Math.round((o.total / maxOrigem) * 100);
                  return (
                    <div key={o.origem} className="flex items-center gap-4 p-4">
                      <span className="w-24 shrink-0 text-sm font-medium">
                        {ORIGEM_LABEL[o.origem]}
                      </span>
                      <div className="h-6 flex-1 overflow-hidden rounded-md bg-muted">
                        <div
                          className="bar-grow h-full rounded-md bg-brand/40"
                          style={{ width: `${Math.max(pct, 6)}%` }}
                        />
                      </div>
                      <span className="tabular w-8 shrink-0 text-right text-sm font-medium">
                        {o.total}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="p-8 text-center text-sm text-muted-foreground">
                Nenhum contato cadastrado ainda.
              </p>
            )}
          </section>
        </div>

        {/* Desempenho por responsável */}
        <section
          className="reveal overflow-hidden rounded-lg border border-border bg-card panel-sm"
          style={{ animationDelay: "240ms" }}
        >
          <header className="border-b border-border p-4">
            <h2 className="font-display text-sm font-medium tracking-tight">
              Desempenho por responsável
            </h2>
          </header>
          {responsaveis.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-right">Negócios</TableHead>
                  <TableHead className="text-right">Ganhos</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Conversão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responsaveis.map((v) => {
                  const conv = v.total ? Math.round((v.ganhos / v.total) * 100) : 0;
                  return (
                    <TableRow key={v.nome}>
                      <TableCell className="font-medium">{v.nome}</TableCell>
                      <TableCell className="tabular text-right">{v.total}</TableCell>
                      <TableCell className="tabular text-right">{v.ganhos}</TableCell>
                      <TableCell className="tabular text-right font-medium">
                        {formatBRL(v.receita)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={conv >= 40 ? "won" : "default"}
                          className={cn("tabular")}
                        >
                          {conv}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Nenhum negócio cadastrado ainda.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
