"use client";

import { useState } from "react";
import { Mail, Bell } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { PREFS_NOTIFICACAO, type PrefNotificacao } from "@/lib/config-data";

export default function NotificacoesPage() {
  const [prefs, setPrefs] = useState<PrefNotificacao[]>(PREFS_NOTIFICACAO);

  function toggle(id: string, campo: "email" | "push") {
    setPrefs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [campo]: !p[campo] } : p))
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Notificações
        </h2>
        <p className="text-sm text-muted-foreground">
          Escolha o que você quer receber e por onde.
        </p>
      </header>

      <Card className="overflow-hidden p-0">
        {/* Cabeçalho de canais */}
        <div className="flex items-center gap-6 border-b border-border bg-elevated px-4 py-2.5">
          <span className="flex-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Evento
          </span>
          <span className="flex w-14 items-center justify-center gap-1 text-xs font-medium text-muted-foreground">
            <Mail className="size-3.5" /> E-mail
          </span>
          <span className="flex w-14 items-center justify-center gap-1 text-xs font-medium text-muted-foreground">
            <Bell className="size-3.5" /> Push
          </span>
        </div>

        <ul className="divide-y divide-border">
          {prefs.map((p) => (
            <li key={p.id} className="flex items-center gap-6 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{p.titulo}</p>
                <p className="text-xs text-muted-foreground">{p.descricao}</p>
              </div>
              <div className="flex w-14 justify-center">
                <Switch
                  checked={p.email}
                  onCheckedChange={() => toggle(p.id, "email")}
                  aria-label={`E-mail para ${p.titulo}`}
                />
              </div>
              <div className="flex w-14 justify-center">
                <Switch
                  checked={p.push}
                  onCheckedChange={() => toggle(p.id, "push")}
                  aria-label={`Push para ${p.titulo}`}
                />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
