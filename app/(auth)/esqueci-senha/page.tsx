import { EsqueciSenhaForm } from "@/components/app/auth/esqueci-senha-form";

export const metadata = { title: "Esqueci minha senha · CRM de Vendas" };

export default function EsqueciSenhaPage() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 panel sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="font-display text-xl font-semibold tracking-tight">
          Redefinir senha
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enviaremos um link para você criar uma nova senha.
        </p>
      </div>

      <EsqueciSenhaForm />
    </div>
  );
}
