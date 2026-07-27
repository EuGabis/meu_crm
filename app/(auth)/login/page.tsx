import { Suspense } from "react";

import { LoginForm } from "@/components/app/auth/login-form";

export const metadata = { title: "Entrar · CRM de Vendas" };

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* ─── Painel de marca (command center) — só no desktop ─── */}
      <aside className="relative hidden overflow-hidden border-r border-border bg-surface lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* grid de pontos, esmaecendo nas bordas */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--border-strong) 1px, transparent 1.5px)",
            backgroundSize: "24px 24px",
            maskImage:
              "radial-gradient(ellipse 80% 70% at 30% 25%, #000 30%, transparent 78%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 70% at 30% 25%, #000 30%, transparent 78%)",
          }}
        />
        {/* halo suave no topo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(50% 40% at 22% 0%, var(--brand-muted), transparent 70%)",
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
            <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-subtle">
              Comando comercial
            </div>
          </div>
        </div>

        {/* meio: thesis */}
        <div className="relative max-w-md reveal">
          <h2 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight text-foreground">
            O comando do seu comercial.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Contatos, pipeline, inbox e metas — num só painel, em tempo real.
          </p>
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
      <main className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm reveal">
          {/* monograma compacto (só no mobile, já que o painel some) */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-md border border-brand/30 bg-brand-muted font-display text-base font-bold text-brand glow-brand">
              V
            </div>
            <span className="font-display text-sm font-semibold tracking-tight">
              CRM Vendas
            </span>
          </div>

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
      </main>
    </div>
  );
}
