"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { LoginLoader } from "@/components/app/auth/login-loader";

/** Duração da tela de carregamento após um login bem-sucedido. */
const DURACAO_LOADER = 5000;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [logado, setLogado] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });

    if (error) {
      // Mensagem genérica de propósito — não revela se o e-mail existe.
      setErro("E-mail ou senha inválidos.");
      setCarregando(false);
      return;
    }

    // Sucesso: mostra a tela de carregamento e navega depois de ~5s.
    setLogado(true);
    const destino = searchParams.get("redirect") || "/painel";
    setTimeout(() => {
      router.push(destino);
      router.refresh();
    }, DURACAO_LOADER);
  }

  if (logado) return <LoginLoader />;

  return (
    <form onSubmit={entrar} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="voce@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            className="h-11 pl-9"
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="senha">Senha</Label>
          <Link
            href="/esqueci-senha"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Esqueci minha senha
          </Link>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input
            id="senha"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            className="h-11 pl-9"
          />
        </div>
      </div>

      {erro ? <p className="text-sm text-destructive">{erro}</p> : null}

      <Button
        type="submit"
        variant="brand"
        disabled={carregando}
        className="mt-1 h-11 text-sm"
      >
        {carregando ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
