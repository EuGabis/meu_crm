"use client";

import { useState, type FormEvent } from "react";
import { UserPlus, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { UsuarioAcesso } from "@/lib/types";

/** Gera uma senha forte para o admin repassar ao novo usuário. */
function gerarSenha(): string {
  const alfabeto =
    "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";
  const bytes = new Uint32Array(14);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}

export function NovoUsuarioDialog({
  onCriado,
}: {
  onCriado: (usuario: UsuarioAcesso) => void;
}) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function limpar() {
    setNome("");
    setEmail("");
    setSenha("");
    setErro(null);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, senha }),
      });
      const dados = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(dados.error ?? "Falha ao criar acesso.");
      onCriado(dados.usuario);
      limpar();
      setOpen(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao criar acesso.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) limpar();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="brand" className="gap-1.5">
          <UserPlus className="size-4" />
          Criar acesso
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar acesso</DialogTitle>
          <DialogDescription>
            O usuário entra na hora com o e-mail e a senha definidos aqui.
            Repasse a senha com segurança — ele pode trocá-la depois.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={salvar}>
          <div className="grid gap-1.5">
            <Label htmlFor="u-nome">Nome</Label>
            <Input
              id="u-nome"
              placeholder="Nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="u-email">E-mail</Label>
            <Input
              id="u-email"
              type="email"
              placeholder="pessoa@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="u-senha">Senha temporária</Label>
            <div className="flex gap-2">
              <Input
                id="u-senha"
                type="text"
                placeholder="mínimo 8 caracteres"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                minLength={8}
                required
                className="font-mono"
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0 gap-1.5"
                onClick={() => setSenha(gerarSenha())}
              >
                <RefreshCw className="size-4" />
                Gerar
              </Button>
            </div>
          </div>

          {erro ? <p className="text-sm text-destructive">{erro}</p> : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" variant="brand" disabled={enviando}>
              {enviando ? "Criando…" : "Criar acesso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
