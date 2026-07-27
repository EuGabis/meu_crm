import { Suspense } from "react";
import { Users, Columns3, MessageCircle, Target, type LucideIcon } from "lucide-react";

import { LoginForm } from "@/components/app/auth/login-form";

export const metadata = { title: "Entrar · CRM de Vendas" };

const MODULOS: { icon: LucideIcon; label: string; desc: string }[] = [
  { icon: Users, label: "Contatos", desc: "Base comercial" },
  { icon: Columns3, label: "Pipeline", desc: "Negócios em andamento" },
  { icon: MessageCircle, label: "Inbox", desc: "WhatsApp no CRM" },
  { icon: Target, label: "Metas", desc: "Desempenho do time" },
];

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ─── Painel de marca (command center) — só no desktop ─── */}
      <aside
        className="relative hidden overflow-hidden border-r border-border lg:flex lg:flex-col lg:justify-between lg:p-14"
        style={{
          background:
            "linear-gradient(155deg, var(--elevated) 0%, var(--surface) 45%, var(--background) 100%)",
        }}
      >
        {/* grid de pontos, esmaecendo nas bordas */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--border-strong) 1px, transparent 1.5px)",
            backgroundSize: "26px 26px",
            maskImage:
              "radial-gradient(ellipse 90% 80% at 25% 30%, #000 25%, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 90% 80% at 25% 30%, #000 25%, transparent 80%)",
          }}
        />
        {/* halo prata pulsando lentamente */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-[pulse_7s_ease-in-out_infinite]"
          style={{
            background:
              "radial-gradient(48% 42% at 20% 8%, var(--brand-muted), transparent 68%)",
          }}
        />

        {/* topo: wordmark */}
        <div className="relative flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-md border border-brand/30 bg-brand-muted font-display text-base font-bold text-brand glow-brand">
            V
          </div>
          <div className="leading-none">
            <div className="font-display text-sm font-semibold tracking-tight">
              CRM Vendas
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-subtle">
              Comando comercial
            </div>
          </div>
        </div>

        {/* meio: thesis + módulos */}
        <div className="relative max-w-md">
          <h2 className="reveal font-display text-[2.6rem] font-semibold leading-[1.08] tracking-tight text-foreground">
            O comando do seu comercial.
          </h2>
          <p className="reveal mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Contatos, pipeline, conversas e metas — reunidos num só painel, em
            tempo real.
          </p>

          <div className="mt-9 grid max-w-md grid-cols-2 gap-3">
            {MODULOS.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="reveal flex items-center gap-3 rounded-lg border border-border bg-surface/60 p-3 panel-sm"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-elevated text-brand">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* base: linha de "console" (honesta, sem métrica falsa) */}
        <div className="relative flex items-center gap-2 font-mono text-[11px] text-subtle">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-brand" />
          </span>
          acesso restrito · sessão criptografada
        </div>
      </aside>

      {/* ─── Formulário ─── */}
      <main className="flex items-center justify-center bg-background px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          {/* monograma compacto (só no mobile, já que o painel some) */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-md border border-brand/30 bg-brand-muted font-display text-base font-bold text-brand glow-brand">
              V
            </div>
            <span className="font-display text-sm font-semibold tracking-tight">
              CRM Vendas
            </span>
          </div>

          <div className="reveal rounded-2xl border border-border bg-card p-7 panel sm:p-8">
            <div className="mb-6">
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                Bom te ver de novo
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Entre com seu e-mail e senha para acessar o painel.
              </p>
            </div>

            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
