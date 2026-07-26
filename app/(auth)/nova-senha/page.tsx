import { NovaSenhaForm } from "@/components/app/auth/nova-senha-form";

export const metadata = { title: "Definir senha · CRM de Vendas" };

export default function NovaSenhaPage() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 panel sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="font-display text-xl font-semibold tracking-tight">
          Definir nova senha
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha uma senha para acessar sua conta.
        </p>
      </div>

      <NovaSenhaForm />
    </div>
  );
}
