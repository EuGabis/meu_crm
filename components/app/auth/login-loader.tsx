"use client";

import { useEffect, useState } from "react";

const ETAPAS = [
  "Autenticando…",
  "Carregando seu painel…",
  "Sincronizando dados…",
  "Tudo pronto.",
];

/** Tela cheia de carregamento exibida por ~5s após o login. */
export function LoginLoader() {
  const [pct, setPct] = useState(0);
  const [etapa, setEtapa] = useState(0);

  useEffect(() => {
    // dispara a transição de largura (0 → 100% em 5s)
    const start = setTimeout(() => setPct(100), 60);
    const iv = setInterval(
      () => setEtapa((e) => Math.min(e + 1, ETAPAS.length - 1)),
      1250
    );
    return () => {
      clearTimeout(start);
      clearInterval(iv);
    };
  }, []);

  return (
    <div className="reveal-fade fixed inset-0 z-50 flex flex-col items-center justify-center gap-9 bg-background">
      {/* ambiente: grid + halo, igual ao login */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--border-strong) 1px, transparent 1.5px)",
          backgroundSize: "26px 26px",
          maskImage:
            "radial-gradient(ellipse 60% 50% at 50% 50%, #000 20%, transparent 72%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 50% at 50% 50%, #000 20%, transparent 72%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(45% 40% at 50% 45%, var(--brand-muted), transparent 70%)",
        }}
      />

      {/* monograma com anel girando */}
      <div className="relative flex size-20 items-center justify-center">
        <span className="absolute inset-0 rounded-2xl border border-border" />
        <span className="absolute inset-0 animate-spin rounded-2xl border-2 border-transparent border-t-brand" />
        <span className="font-display text-2xl font-bold text-brand">V</span>
      </div>

      {/* barra de progresso + status */}
      <div className="relative w-60">
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-[4800ms] ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p
          className="mt-3 text-center font-mono text-xs tracking-wide text-muted-foreground"
          aria-live="polite"
        >
          {ETAPAS[etapa]}
        </p>
      </div>
    </div>
  );
}
