import { Topbar } from "@/components/app/topbar";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FRACAO_MES, METAS } from "@/lib/metas-data";
import { getUsuario } from "@/lib/mock-data";
import { cn, formatBRL, initials } from "@/lib/utils";

function pct(real: number, alvo: number) {
  return alvo > 0 ? Math.min(Math.round((real / alvo) * 100), 100) : 0;
}
function noRitmo(real: number, alvo: number) {
  // projeção de fim de mês = realizado / fração decorrida
  return real / FRACAO_MES >= alvo * 0.98;
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

export default function MetasPage() {
  const teamAlvo = METAS.reduce((s, m) => s + m.alvoReceita, 0);
  const teamReal = METAS.reduce((s, m) => s + m.realizadoReceita, 0);
  const teamPct = pct(teamReal, teamAlvo);
  const teamProjecao = Math.round(teamReal / FRACAO_MES);
  const teamOk = noRitmo(teamReal, teamAlvo);

  const ranking = [...METAS].sort(
    (a, b) =>
      pct(b.realizadoReceita, b.alvoReceita) -
      pct(a.realizadoReceita, a.alvoReceita)
  );

  return (
    <>
      <Topbar
        title="Metas & desempenho"
        description="Julho 2026 · dia 24 de 31"
      />

      <div className="space-y-6 p-4 md:p-6">
        {/* Meta do time */}
        <section className="reveal overflow-hidden rounded-lg border border-border bg-card panel-sm">
          <div className="grid gap-6 p-5 md:grid-cols-[1.4fr_1fr]">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Meta do time
                </h2>
                <Badge variant={teamOk ? "won" : "lost"}>
                  {teamOk ? "No ritmo" : "Abaixo do ritmo"}
                </Badge>
              </div>
              <p className="mt-2 font-display text-3xl font-semibold tracking-tight tabular">
                {formatBRL(teamReal)}
                <span className="ml-2 text-base font-normal text-muted-foreground">
                  de {formatBRL(teamAlvo)}
                </span>
              </p>
              <div className="mt-4 space-y-1.5">
                <Barra valor={teamPct} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="tabular font-medium text-foreground">
                    {teamPct}% da meta
                  </span>
                  <span>{Math.round(FRACAO_MES * 100)}% do mês decorrido</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 self-center border-t border-border pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Projeção
                </p>
                <p className="mt-1 font-display text-xl font-semibold tabular">
                  {formatBRL(teamProjecao)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  no ritmo atual
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Falta
                </p>
                <p className="mt-1 font-display text-xl font-semibold tabular">
                  {formatBRL(Math.max(teamAlvo - teamReal, 0))}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  para bater a meta
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Por vendedor */}
        <div>
          <h2 className="mb-3 font-display text-sm font-semibold tracking-tight">
            Por vendedor
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ranking.map((m, i) => {
              const u = getUsuario(m.usuarioId);
              const receitaPct = pct(m.realizadoReceita, m.alvoReceita);
              const negociosPct = pct(m.realizadoNegocios, m.alvoNegocios);
              const ok = noRitmo(m.realizadoReceita, m.alvoReceita);
              return (
                <div
                  key={m.id}
                  className="reveal rounded-lg border border-border bg-card p-4 panel-sm"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarFallback>{initials(u?.nome ?? "?")}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{u?.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {u?.cargo}
                      </p>
                    </div>
                    <Badge variant={ok ? "won" : "open"}>
                      {ok ? "No ritmo" : "Atenção"}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">
                        Receita
                      </span>
                      <span className="tabular text-sm font-medium">
                        {formatBRL(m.realizadoReceita)}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          / {formatBRL(m.alvoReceita)}
                        </span>
                      </span>
                    </div>
                    <Barra valor={receitaPct} />
                    <p
                      className={cn(
                        "tabular text-right text-[11px] font-medium",
                        ok ? "text-status-won" : "text-muted-foreground"
                      )}
                    >
                      {receitaPct}%
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
                    <span className="text-xs text-muted-foreground">
                      Negócios fechados
                    </span>
                    <span className="tabular font-medium">
                      {m.realizadoNegocios}
                      <span className="text-xs font-normal text-muted-foreground">
                        {" "}
                        / {m.alvoNegocios} ({negociosPct}%)
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
