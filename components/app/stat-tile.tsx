"use client";

import { useEffect, useRef, useState } from "react";

import { cn, formatBRL } from "@/lib/utils";

type FormatKind = "brl" | "percent" | "days" | "int";

const FORMATTERS: Record<FormatKind, (n: number) => string> = {
  brl: (n) => formatBRL(n),
  percent: (n) => `${Math.round(n)}%`,
  days: (n) => `${Math.round(n)}d`,
  int: (n) => String(Math.round(n)),
};

interface StatTileProps {
  label: string;
  value: number;
  /** Como formatar o número (serializável — pode vir de Server Component) */
  format?: FormatKind;
  hint?: string;
  trend?: { value: string; positive?: boolean };
  /** atraso de entrada, em ms, para o efeito cascata */
  delay?: number;
}

function useCountUp(target: number, duration = 900, delay = 0) {
  const [current, setCurrent] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      setCurrent(target);
      return;
    }

    let start: number | null = null;
    const startTimer = window.setTimeout(() => {
      const tick = (t: number) => {
        if (start === null) start = t;
        const p = Math.min((t - start) / duration, 1);
        // easeOutExpo
        const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        setCurrent(target * eased);
        if (p < 1) raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    }, delay);

    return () => {
      window.clearTimeout(startTimer);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, duration, delay]);

  return current;
}

export function StatTile({
  label,
  value,
  format = "int",
  hint,
  trend,
  delay = 0,
}: StatTileProps) {
  const animated = useCountUp(value, 900, delay);
  const fmt = FORMATTERS[format];

  return (
    <div className="group relative flex flex-col gap-2 p-4 transition-colors md:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="tabular font-display text-2xl font-semibold tracking-tight md:text-3xl">
        {fmt(animated)}
      </p>
      <div className="flex items-center gap-2 text-xs">
        {trend ? (
          <span
            className={cn(
              "tabular inline-flex items-center gap-0.5 font-medium",
              trend.positive ? "text-status-won" : "text-status-lost"
            )}
          >
            {trend.positive ? "▲" : "▼"} {trend.value}
          </span>
        ) : null}
        {hint ? <span className="text-muted-foreground">{hint}</span> : null}
      </div>
      {/* linha de acento que aparece no hover */}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px scale-x-0 bg-brand transition-transform duration-300 group-hover:scale-x-100" />
    </div>
  );
}
