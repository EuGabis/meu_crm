import { EsqueciSenhaForm } from "@/components/app/auth/esqueci-senha-form";

export const metadata = { title: "Esqueci minha senha · CRM de Vendas" };

export default function EsqueciSenhaPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm reveal">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex size-11 items-center justify-center rounded-lg border border-brand/30 bg-brand-muted font-display text-lg font-bold text-brand glow-brand">
            V
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">
              Redefinir senha
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enviaremos um link para você criar uma nova senha.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 panel sm:p-8">
          <EsqueciSenhaForm />
        </div>
      </div>
    </div>
  );
}
