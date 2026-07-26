"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function EsqueciSenhaForm() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setCarregando(true);

    const supabase = createSupabaseBrowserClient();
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/nova-senha`,
    });

    // Sempre mostra sucesso neutro — não revela se o e-mail existe.
    setEnviado(true);
    setCarregando(false);
  }

  if (enviado) {
    return (
      <div className="grid gap-4 text-center">
        <p className="text-sm text-muted-foreground">
          Se houver uma conta com esse e-mail, enviamos um link para redefinir a
          senha. Confira sua caixa de entrada.
        </p>
        <Link
          href="/login"
          className="text-sm font-medium text-brand transition-colors hover:text-foreground"
        >
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="voce@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
      </div>

      <Button type="submit" variant="brand" disabled={carregando}>
        {carregando ? "Enviando…" : "Enviar link de redefinição"}
      </Button>

      <Link
        href="/login"
        className="text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Voltar para o login
      </Link>
    </form>
  );
}
