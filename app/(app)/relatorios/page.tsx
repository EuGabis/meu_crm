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
import {
  CONTATOS,
  NEGOCIOS,
  USUARIOS,
} from "@/lib/mock-data";
import { cn, formatBRL } from "@/lib/utils";

const FUNIL: PipelineStage[] = [
  "lead",
  "qualificado",
  "proposta",
  "negociacao",
  "ganho",
];

export default function RelatoriosPage() {
  const ganhos = NEGOCIOS.filter((n) => n.stage === "ganho");
  const receitaTotal = ganhos.reduce((s, n) => s + n.valor, 0);
  const ticketMedio = ganhos.length
    ? Math.round(receitaTotal / ganhos.length)
    : 0;
  const cicloMedio = 47; // dias — placeholder de métrica

  // Funil
  const maxFunil = Math.max(
    ...FUNIL.map((s) => NEGOCIOS.filter((n) => n.stage === s).length),
    1
  );

  // Desempenho por vendedor
  const porVendedor = USUARIOS.map((u) => {
    const doVendedor = NEGOCIOS.filter((n) => n.ownerId === u.id);
    const ganhosV = doVendedor.filter((n) => n.stage === "ganho");
    return {
      usuario: u,
      total: doVendedor.length,
      ganhos: ganhosV.length,
      receita: ganhosV.reduce((s, n) => s + n.valor, 0),
    };
  }).sort((a, b) => b.receita - a.receita);

  // Origem dos contatos
  const origens = (Object.keys(ORIGEM_LABEL) as Origem[])
    .map((o) => ({
      origem: o,
      total: CONTATOS.filter((c) => c.origem === o).length,
    }))
    .filter((o) => o.total > 0)
    .sort((a, b) => b.total - a.total);
  const maxOrigem = Math.max(...origens.map((o) => o.total), 1);

  return (
    <>
      <Topbar
        title="Relatórios"
        description="Desempenho comercial do período"
      />

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
            delay={80}
          />
          <StatTile
            label="Ciclo de venda"
            value={cicloMedio}
            format="days"
            hint="média até fechar"
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
                const count = NEGOCIOS.filter((n) => n.stage === stageId).length;
                const pct = Math.round((count / maxFunil) * 100);
                return (
                  <div key={stageId} className="flex items-center gap-4 p-4">
                    <span className="w-24 shrink-0 text-sm font-medium">
                      {stage.label}
                    </span>
                    <div className="h-6 flex-1 overflow-hidden rounded-md bg-muted">
                      <div
                        className="bar-grow flex h-full items-center rounded-md bg-brand px-2"
                        style={{ width: `${Math.max(pct, 8)}%` }}
                      >
                        <span className="tabular text-xs font-semibold text-brand-foreground">
                          {count}
                        </span>
                      </div>
                    </div>
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
          </section>
        </div>

        {/* Desempenho por vendedor */}
        <section
          className="reveal overflow-hidden rounded-lg border border-border bg-card panel-sm"
          style={{ animationDelay: "240ms" }}
        >
          <header className="border-b border-border p-4">
            <h2 className="font-display text-sm font-medium tracking-tight">
              Desempenho por vendedor
            </h2>
          </header>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendedor</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead className="text-right">Negócios</TableHead>
                <TableHead className="text-right">Ganhos</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">Conversão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {porVendedor.map((v) => {
                const conv = v.total
                  ? Math.round((v.ganhos / v.total) * 100)
                  : 0;
                return (
                  <TableRow key={v.usuario.id}>
                    <TableCell className="font-medium">
                      {v.usuario.nome}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {v.usuario.cargo}
                    </TableCell>
                    <TableCell className="tabular text-right">
                      {v.total}
                    </TableCell>
                    <TableCell className="tabular text-right">
                      {v.ganhos}
                    </TableCell>
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
        </section>
      </div>
    </>
  );
}
