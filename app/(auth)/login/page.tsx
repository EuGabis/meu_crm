import { Suspense } from "react";

import { LoginForm } from "@/components/app/auth/login-form";

export const metadata = { title: "Entrar · CRM de Vendas" };

export default function LoginPage() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 panel sm:p-8">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="flex size-11 items-center justify-center rounded-lg border border-brand/30 bg-brand-muted font-display text-lg font-bold text-brand glow-brand">
          V
        </div>
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">
            Entrar no CRM
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesse com seu e-mail e senha.
          </p>
        </div>
      </div>

      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
