"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Pause,
  Play,
  Save,
  Send,
  CheckCircle2,
  XCircle,
  ShieldAlert,
} from "lucide-react";

import { Topbar } from "@/components/app/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { DispatchSettings, DispatchLogItem } from "../types";

export function DisparosPage() {
  const [settings, setSettings] = useState<DispatchSettings | null>(null);
  const [log, setLog] = useState<DispatchLogItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [alternandoPausa, setAlternandoPausa] = useState(false);

  // form dos limites
  const [porMinuto, setPorMinuto] = useState("10");
  const [porHora, setPorHora] = useState("200");
  const [intervalo, setIntervalo] = useState("6000");

  useEffect(() => {
    Promise.all([
      fetch("/api/disparos/settings", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : { settings: null }
      ),
      fetch("/api/disparos/log", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : { log: [] }
      ),
    ])
      .then(([s, l]) => {
        if (s.settings) {
          setSettings(s.settings);
          setPorMinuto(String(s.settings.msgsPorMinuto));
          setPorHora(String(s.settings.msgsPorHora));
          setIntervalo(String(s.settings.intervaloMs));
        }
        setLog(l.log ?? []);
      })
      .finally(() => setCarregando(false));
  }, []);

  async function salvarLimites() {
    setSalvando(true);
    try {
      const res = await fetch("/api/disparos/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          msgsPorMinuto: Number(porMinuto),
          msgsPorHora: Number(porHora),
          intervaloMs: Number(intervalo),
        }),
      });
      const data = await res.json();
      if (res.ok) setSettings(data.settings);
    } finally {
      setSalvando(false);
    }
  }

  async function alternarPausa() {
    if (!settings) return;
    setAlternandoPausa(true);
    const novo = !settings.pausado;
    try {
      const res = await fetch("/api/disparos/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pausado: novo }),
      });
      const data = await res.json();
      if (res.ok) setSettings(data.settings);
    } finally {
      setAlternandoPausa(false);
    }
  }

  const pausado = settings?.pausado ?? false;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Topbar
        title="Disparos"
        description="Controle de envio automático para os grupos"
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
        {/* Botão de pausa de emergência */}
        <div
          className={cnBox(pausado)}
        >
          <div className="flex items-center gap-3">
            <div
              className={
                pausado
                  ? "flex size-10 items-center justify-center rounded-md bg-destructive/15 text-destructive"
                  : "flex size-10 items-center justify-center rounded-md bg-brand-muted text-brand"
              }
            >
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {pausado ? "Envios PAUSADOS" : "Envios ativos"}
              </p>
              <p className="text-xs text-muted-foreground">
                {pausado
                  ? "Nenhum disparo automático será feito enquanto a pausa estiver ligada."
                  : "Pausa de emergência interrompe todos os envios automáticos na hora."}
              </p>
            </div>
          </div>
          <Button
            variant={pausado ? "brand" : "destructive"}
            size="sm"
            className="gap-1.5"
            onClick={alternarPausa}
            disabled={alternandoPausa || carregando}
          >
            {alternandoPausa ? (
              <Loader2 className="size-4 animate-spin" />
            ) : pausado ? (
              <Play className="size-4" />
            ) : (
              <Pause className="size-4" />
            )}
            {pausado ? "Retomar envios" : "Pausar tudo"}
          </Button>
        </div>

        {/* Limites de envio */}
        <div className="rounded-lg border border-border bg-card p-4 panel-sm">
          <h3 className="mb-1 font-display text-sm font-medium tracking-tight">
            Limites de envio
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Reduzem o risco de banimento do número. O disparo respeita estes
            limites e o intervalo entre mensagens.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo
              label="Mensagens por minuto"
              value={porMinuto}
              onChange={setPorMinuto}
            />
            <Campo
              label="Mensagens por hora"
              value={porHora}
              onChange={setPorHora}
            />
            <Campo
              label="Intervalo entre msgs (ms)"
              value={intervalo}
              onChange={setIntervalo}
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={salvarLimites}
              disabled={salvando}
            >
              {salvando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Salvar limites
            </Button>
          </div>
        </div>

        {/* Histórico de disparos */}
        <div className="rounded-lg border border-border bg-card panel-sm">
          <header className="flex items-center gap-2 border-b border-border p-3">
            <Send className="size-4 text-subtle" />
            <h3 className="font-display text-sm font-medium tracking-tight">
              Disparos recentes
            </h3>
          </header>
          {carregando ? (
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Carregando…
            </div>
          ) : log.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Nenhum disparo registrado ainda.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {log.map((item) => (
                <li key={item.id} className="flex items-center gap-3 p-3">
                  {item.status === "enviado" ? (
                    <CheckCircle2 className="size-4 shrink-0 text-brand" />
                  ) : (
                    <XCircle className="size-4 shrink-0 text-destructive" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.grupoNome}
                    </p>
                    {item.erro ? (
                      <p className="truncate text-xs text-destructive">
                        {item.erro}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.enviadoEm).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>
                  <Badge variant={item.status === "enviado" ? "won" : "lost"}>
                    {item.status === "enviado" ? "Enviado" : "Falhou"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function cnBox(pausado: boolean) {
  return [
    "flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 panel-sm",
    pausado
      ? "border-destructive/50 bg-destructive/5"
      : "border-border bg-card",
  ].join(" ");
}
