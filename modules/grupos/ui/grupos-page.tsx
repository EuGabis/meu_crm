"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Plus,
  RefreshCw,
  Trash2,
  Loader2,
  CheckCircle2,
} from "lucide-react";

import { Topbar } from "@/components/app/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { Grupo, GrupoEvolution } from "../types";

export function GruposPage() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // cadastro manual
  const [nome, setNome] = useState("");
  const [jid, setJid] = useState("");
  const [salvando, setSalvando] = useState(false);

  // sincronização com a Evolution
  const [sincronizando, setSincronizando] = useState(false);
  const [disponiveis, setDisponiveis] = useState<GrupoEvolution[] | null>(null);
  const [erroSync, setErroSync] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/grupos", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { grupos: [] }))
      .then(({ grupos: lista }) => setGrupos(lista ?? []))
      .finally(() => setCarregando(false));
  }, []);

  async function cadastrar(nomeGrupo: string, identificador: string) {
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch("/api/grupos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nomeGrupo, identificadorGrupo: identificador }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? "Erro ao cadastrar.");
        return null;
      }
      setGrupos((prev) =>
        [...prev, data.grupo].sort((a, b) => a.nome.localeCompare(b.nome))
      );
      return data.grupo as Grupo;
    } finally {
      setSalvando(false);
    }
  }

  async function cadastrarManual(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !jid.trim()) return;
    const criado = await cadastrar(nome.trim(), jid.trim());
    if (criado) {
      setNome("");
      setJid("");
    }
  }

  async function alternarAtivo(grupo: Grupo) {
    const novo = !grupo.ativo;
    setGrupos((prev) =>
      prev.map((g) => (g.id === grupo.id ? { ...g, ativo: novo } : g))
    );
    const res = await fetch(`/api/grupos/${grupo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: novo }),
    });
    if (!res.ok) {
      // desfaz em caso de erro
      setGrupos((prev) =>
        prev.map((g) => (g.id === grupo.id ? { ...g, ativo: grupo.ativo } : g))
      );
    }
  }

  async function excluir(grupo: Grupo) {
    if (!confirm(`Remover o grupo "${grupo.nome}" do cadastro?`)) return;
    setGrupos((prev) => prev.filter((g) => g.id !== grupo.id));
    await fetch(`/api/grupos/${grupo.id}`, { method: "DELETE" });
  }

  async function sincronizar() {
    setSincronizando(true);
    setErroSync(null);
    setDisponiveis(null);
    try {
      const res = await fetch("/api/grupos/sincronizar", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setErroSync(data.error ?? "Erro ao sincronizar.");
        return;
      }
      setDisponiveis(data.grupos ?? []);
    } catch {
      setErroSync("Falha de rede ao sincronizar.");
    } finally {
      setSincronizando(false);
    }
  }

  async function adicionarDaEvolution(g: GrupoEvolution) {
    const criado = await cadastrar(g.nome, g.id);
    if (criado) {
      setDisponiveis((prev) =>
        prev
          ? prev.map((x) => (x.id === g.id ? { ...x, jaCadastrado: true } : x))
          : prev
      );
    }
  }

  const ativos = grupos.filter((g) => g.ativo).length;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Topbar
        title="Grupos de WhatsApp"
        description="Grupos que recebem as divulgações automáticas"
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
        {/* Resumo + sincronizar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-elevated px-3 py-2">
          <div className="flex items-center gap-2">
            <Users className="size-4 shrink-0 text-brand" />
            <p className="text-xs text-muted-foreground">
              {grupos.length} grupo(s) cadastrado(s) · {ativos} ativo(s)
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={sincronizar}
            disabled={sincronizando}
          >
            {sincronizando ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Sincronizar com WhatsApp
          </Button>
        </div>

        {/* Grupos disponíveis na Evolution (após sincronizar) */}
        {erroSync ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {erroSync}
          </div>
        ) : null}

        {disponiveis ? (
          <div className="rounded-lg border border-border bg-card panel-sm">
            <header className="flex items-center justify-between border-b border-border p-3">
              <h3 className="font-display text-sm font-medium tracking-tight">
                Grupos no WhatsApp conectado
              </h3>
              <button
                onClick={() => setDisponiveis(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Fechar
              </button>
            </header>
            <ul className="divide-y divide-border">
              {disponiveis.map((g) => (
                <li key={g.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{g.nome}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {g.participantes != null
                        ? `${g.participantes} participantes`
                        : g.id}
                    </p>
                  </div>
                  {g.jaCadastrado ? (
                    <span className="flex items-center gap-1 text-xs text-brand">
                      <CheckCircle2 className="size-4" /> Cadastrado
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={salvando}
                      onClick={() => adicionarDaEvolution(g)}
                    >
                      <Plus className="size-4" /> Adicionar
                    </Button>
                  )}
                </li>
              ))}
              {disponiveis.length === 0 ? (
                <li className="p-3 text-xs text-muted-foreground">
                  Nenhum grupo encontrado no WhatsApp conectado.
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}

        {/* Cadastro manual */}
        <div className="rounded-lg border border-border bg-card p-3 panel-sm">
          <h3 className="mb-2.5 font-display text-sm font-medium tracking-tight">
            Cadastrar manualmente
          </h3>
          <form
            onSubmit={cadastrarManual}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <Input
              placeholder="Nome do grupo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="sm:flex-1"
            />
            <Input
              placeholder="JID do grupo (…@g.us) ou número"
              value={jid}
              onChange={(e) => setJid(e.target.value)}
              className="sm:flex-1"
            />
            <Button
              type="submit"
              variant="brand"
              size="sm"
              className="gap-1.5"
              disabled={salvando || !nome.trim() || !jid.trim()}
            >
              {salvando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Cadastrar
            </Button>
          </form>
          {erro ? <p className="mt-2 text-xs text-destructive">{erro}</p> : null}
        </div>

        {/* Lista de grupos cadastrados */}
        <div className="rounded-lg border border-border bg-card panel-sm">
          <header className="border-b border-border p-3">
            <h3 className="font-display text-sm font-medium tracking-tight">
              Grupos cadastrados
            </h3>
          </header>
          {carregando ? (
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Carregando…
            </div>
          ) : grupos.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Nenhum grupo cadastrado ainda. Sincronize com o WhatsApp ou
              cadastre manualmente acima.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {grupos.map((g) => (
                <li key={g.id} className="flex items-center gap-3 p-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-elevated">
                    <Users className="size-4 text-subtle" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{g.nome}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {g.identificadorGrupo}
                    </p>
                  </div>
                  <Badge variant={g.ativo ? "default" : "outline"}>
                    {g.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                  <Switch
                    checked={g.ativo}
                    onCheckedChange={() => alternarAtivo(g)}
                    aria-label={g.ativo ? "Desativar grupo" : "Ativar grupo"}
                  />
                  <button
                    onClick={() => excluir(g)}
                    aria-label="Excluir grupo"
                    className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
