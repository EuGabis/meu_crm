import { NovaSenhaForm } from "@/components/app/auth/nova-senha-form";

export const metadata = { title: "Definir senha · CRM de Vendas" };

export default function NovaSenhaPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm reveal">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex size-11 items-center justify-center rounded-lg border border-brand/30 bg-brand-muted font-display text-lg font-bold text-brand glow-brand">
            V
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">
              Definir nova senha
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Escolha uma senha para acessar sua conta.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 panel sm:p-8">
          <NovaSenhaForm />
        </div>
      </div>
    </div>
  );
}
