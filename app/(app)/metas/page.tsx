import { Topbar } from "@/components/app/topbar";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DefinirMetaDialog } from "@/components/app/metas/definir-meta-dialog";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapDealRow, type DbDealRow } from "@/lib/negocios/mapper";
import type { MetaConfig } from "@/lib/types";
import { formatBRL, initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

const META_PADRAO: MetaConfig = { alvoReceita: 0, alvoNegocios: 0 };

async function carregar() {
  const supabase = createSupabaseServerClient();
  const [dealsRes, metaRes] = await Promise.all([
    supabase.from("deals").select("*"),
    supabase.from("metas").select("*").limit(1).maybeSingle(),
  ]);

  if (dealsRes.error) console.error("[metas/deals]", dealsRes.error);

  const negocios = ((dealsRes.data as DbDealRow[]) ?? []).map(mapDealRow);
  const metaRow = metaRes.data as
    | { alvo_receita: number; alvo_negocios: number }
    | null;
  const meta: MetaConfig = metaRow
    ? {
        alvoReceita: Number(metaRow.alvo_receita) || 0,
        alvoNegocios: metaRow.alvo_negocios || 0,
      }
    : META_PADRAO;

  return { negocios, meta };
}

function Barra({ valor }: { valor: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className="bar-grow h-full rounded-full bg-brand"
        style={{ width: `${valor}%` }}
      />
    </div>
  );
}

export default async function MetasPage() {
  const { negocios, meta } = await carregar();

  const ganhos = negocios.filter((n) => n.stage === "ganho");
  const realizadoReceita = ganhos.reduce((s, n) => s + n.valor, 0);
  const realizadoNegocios = ganhos.length;

  const temMeta = meta.alvoReceita > 0;
  const receitaPct =
    meta.alvoReceita > 0
      ? Math.min(Math.round((realizadoReceita / meta.alvoReceita) * 100), 100)
      : 0;
  const falta = Math.max(meta.alvoReceita - realizadoReceita, 0);

  // Desempenho por responsável (dono real do negócio)
  const porDono = new Map<string, { receita: number; ganhos: number }>();
  for (const n of ganhos) {
    const key = n.ownerId || "—";
    const o = porDono.get(key) ?? { receita: 0, ganhos: 0 };
    o.receita += n.valor;
    o.ganhos += 1;
    porDono.set(key, o);
  }
  const responsaveis = [...porDono.entries()]
    .map(([nome, v]) => ({ nome, ...v }))
    .sort((a, b) => b.receita - a.receita);

  return (
    <>
      <Topbar
        title="Metas & desempenho"
        description="Realizado vs. meta do time"
      />

      <div className="space-y-6 p-4 md:p-6">
        {/* Meta do time */}
        <section className="reveal overflow-hidden rounded-lg border border-border bg-card panel-sm">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="font-display text-sm font-medium tracking-tight">
              Meta do time
            </h2>
            <DefinirMetaDialog meta={meta} />
          </div>

          {temMeta ? (
            <div className="grid gap-6 p-5 md:grid-cols-[1.4fr_1fr]">
              <div>
                <p className="font-display text-3xl font-semibold tracking-tight tabular">
                  {formatBRL(realizadoReceita)}
                  <span className="ml-2 text-base font-normal text-muted-foreground">
                    de {formatBRL(meta.alvoReceita)}
                  </span>
                </p>
                <div className="mt-4 space-y-1.5">
                  <Barra valor={receitaPct} />
                  <div className="flex justify-between text-xs">
                    <span className="tabular font-medium text-foreground">
                      {receitaPct}% da meta
                    </span>
                    <span className="text-muted-foreground">
                      receita de negócios ganhos
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 self-center border-t border-border pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Falta
                  </p>
                  <p className="mt-1 font-display text-xl font-semibold tabular">
                    {formatBRL(falta)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    para bater a meta
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Negócios
                  </p>
                  <p className="mt-1 font-display text-xl font-semibold tabular">
                    {realizadoNegocios}
                    {meta.alvoNegocios > 0 ? (
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}
                        / {meta.alvoNegocios}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[11px] text-muted-foreground">ganhos</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 p-10 text-center">
              <p className="text-sm font-medium">Nenhuma meta definida</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Defina o alvo de receita do time para acompanhar o progresso vs.
                o realizado (hoje: {formatBRL(realizadoReceita)} em{" "}
                {realizadoNegocios}{" "}
                {realizadoNegocios === 1 ? "negócio ganho" : "negócios ganhos"}).
              </p>
            </div>
          )}
        </section>

        {/* Por responsável */}
        <div>
          <h2 className="mb-3 font-display text-sm font-semibold tracking-tight">
            Por responsável
          </h2>
          {responsaveis.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {responsaveis.map((r, i) => (
                <div
                  key={r.nome}
                  className="reveal rounded-lg border border-border bg-card p-4 panel-sm"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarFallback>{initials(r.nome)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        Responsável
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-end justify-between border-t border-border pt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Receita ganha
                      </p>
                      <p className="tabular font-display text-lg font-semibold">
                        {formatBRL(r.receita)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Negócios</p>
                      <p className="tabular font-display text-lg font-semibold">
                        {r.ganhos}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground panel-sm">
              Nenhum negócio ganho ainda. Feche negócios no Pipeline para ver o
              desempenho por responsável.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
