# Contatos Supabase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir os Contatos mockados (`lib/mock-data.ts`) por CRUD real no Supabase — criar, editar, arquivar e excluir contatos, com a tela persistindo de verdade.

**Architecture:** Mesmo padrão do módulo WhatsApp: uma tabela `contacts` no Supabase, acessada só por Route Handlers (`app/api/contatos/**`) via `service_role` key (`lib/supabase/server.ts`). O browser só fala com essas rotas próprias. RLS habilitado, sem policies para `anon`/`authenticated`.

**Tech Stack:** Next.js 16 (App Router) + TypeScript + Tailwind v4 + `@supabase/supabase-js` (já instalado nesta sessão para o módulo WhatsApp).

## Global Constraints

- Repositório: `c:\Users\Gabriel\Documents\meu_crm`. Sem framework de testes automatizados — verificação manual (curl / navegador).
- `lib/mock-data.ts` (CONTATOS, NEGOCIOS, ATIVIDADES) **permanece intocado** nesta spec — ainda é consumido por Pipeline, Painel, Relatórios e pelo painel de contato do Inbox (`components/app/inbox/contact-panel.tsx`), que só migram em sub-projetos futuros. Apenas a tela de Contatos (`app/(app)/contatos/page.tsx`) passa a usar dados reais.
- Owner fixo: todo contato tem `owner_nome = "Gabriel Pereira"` (sem campo de equipe real ainda).
- Toda chamada ao Supabase roda em `app/api/**/route.ts` — nunca em componentes `"use client"`.
- Reusar primitivas de UI existentes (`components/ui/button.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `input.tsx`, `label.tsx`) — não introduzir nova lib de UI.
- Projeto Supabase: ref `qhrnnunkjlhipispkusy`, URL `https://qhrnnunkjlhipispkusy.supabase.co` (mesmo do módulo WhatsApp; credenciais já em `.env.local`).

---

### Task 1: Schema no Supabase e mapper

**Files:**
- Create: `lib/contatos/mapper.ts`

**Interfaces:**
- Produces: `mapContatoRow(row: DbContatoRow): Contato`, tipo `DbContatoRow` — usados pelas Tasks 2 e 3.

- [ ] **Step 1: Criar a tabela no Supabase (manual — feito por você no dashboard)**

Abra `https://supabase.com/dashboard/project/qhrnnunkjlhipispkusy/sql/new`, cole o SQL abaixo e clique em **Run**:

```sql
create table contacts (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null,
  telefone text not null,
  empresa text not null default '',
  cargo text not null default '',
  status text not null default 'lead',
  origem text not null default 'outro',
  valor_estimado numeric not null default 0,
  owner_nome text not null default 'Gabriel Pereira',
  criado_em timestamptz not null default now(),
  ultimo_contato timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table contacts enable row level security;
```

Não crie policies para `anon`/`authenticated` — é intencional (deny-all; só a `service_role` acessa).

- [ ] **Step 2: Verificar que a tabela existe e está acessível**

Run (substitua `<service_role_key>` pela chave em `.env.local`):

```bash
curl -s "https://qhrnnunkjlhipispkusy.supabase.co/rest/v1/contacts?select=id" \
  -H "apikey: <service_role_key>" \
  -H "Authorization: Bearer <service_role_key>"
```

Expected: `[]` (200 OK, array vazio).

- [ ] **Step 3: Criar `lib/contatos/mapper.ts`**

```typescript
import type { Contato, ContatoStatus, Origem } from "@/lib/types";

export interface DbContatoRow {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  empresa: string;
  cargo: string;
  status: string;
  origem: string;
  valor_estimado: number;
  owner_nome: string;
  criado_em: string;
  ultimo_contato: string;
}

export function mapContatoRow(row: DbContatoRow): Contato {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    telefone: row.telefone,
    empresa: row.empresa,
    cargo: row.cargo,
    status: row.status as ContatoStatus,
    origem: row.origem as Origem,
    valorEstimado: row.valor_estimado,
    criadoEm: row.criado_em,
    ultimoContato: row.ultimo_contato,
    ownerId: row.owner_nome,
  };
}
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`

Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add lib/contatos/mapper.ts
git commit -m "feat: add contacts table schema and row mapper"
```

---

### Task 2: Rotas de listar e criar contato

**Files:**
- Create: `app/api/contatos/route.ts`

**Interfaces:**
- Consumes: `createSupabaseServerClient` (`lib/supabase/server.ts`), `mapContatoRow`/`DbContatoRow` (Task 1).
- Produces: `GET /api/contatos` → `{ contatos: Contato[] }`; `POST /api/contatos` (body `{ nome, email, telefone, empresa }`) → `{ contato: Contato }` ou `{ error }`. Consumidos pela Task 4.

- [ ] **Step 1: Criar `app/api/contatos/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapContatoRow, type DbContatoRow } from "@/lib/contatos/mapper";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .order("nome", { ascending: true });

  if (error) {
    console.error("[contatos/get]", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os contatos." },
      { status: 500 }
    );
  }

  const contatos = (data as DbContatoRow[]).map(mapContatoRow);
  return NextResponse.json({ contatos });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const nome = typeof body.nome === "string" ? body.nome.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const telefone = typeof body.telefone === "string" ? body.telefone.trim() : "";
  const empresa = typeof body.empresa === "string" ? body.empresa.trim() : "";

  if (!nome || !email || !telefone) {
    return NextResponse.json(
      { error: "Nome, e-mail e telefone são obrigatórios." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contacts")
    .insert({ nome, email, telefone, empresa })
    .select()
    .single();

  if (error) {
    console.error("[contatos/post]", error);
    return NextResponse.json(
      { error: "Não foi possível criar o contato." },
      { status: 500 }
    );
  }

  return NextResponse.json({ contato: mapContatoRow(data as DbContatoRow) });
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`

Expected: sem erros.

- [ ] **Step 3: Testar (com o dev server rodando — `npm run dev`)**

```bash
curl -s -X POST "http://localhost:3000/api/contatos" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Contato Teste","email":"teste@example.com","telefone":"(11) 90000-0000","empresa":"Empresa Teste"}'
```

Expected: `{"contato":{"id":"...","nome":"Contato Teste",...,"status":"lead","origem":"outro","valorEstimado":0,"ownerId":"Gabriel Pereira",...}}`.

```bash
curl -s "http://localhost:3000/api/contatos"
```

Expected: `{"contatos":[{"nome":"Contato Teste",...}]}`.

- [ ] **Step 4: Commit**

```bash
git add app/api/contatos/route.ts
git commit -m "feat: add list/create contacts API routes"
```

---

### Task 3: Rotas de editar e excluir contato

**Files:**
- Create: `app/api/contatos/[id]/route.ts`

**Interfaces:**
- Consumes: `createSupabaseServerClient`, `mapContatoRow`/`DbContatoRow` (Task 1).
- Produces: `PATCH /api/contatos/[id]` (body parcial: `nome?`, `email?`, `telefone?`, `empresa?`, `cargo?`, `status?`, `origem?`, `valorEstimado?`) → `{ contato: Contato }`; `DELETE /api/contatos/[id]` → `{ ok: true }`. Consumidos pela Task 5.

- [ ] **Step 1: Criar `app/api/contatos/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapContatoRow, type DbContatoRow } from "@/lib/contatos/mapper";

const CAMPOS_TEXTO = ["nome", "email", "telefone", "empresa", "cargo", "status", "origem"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const campo of CAMPOS_TEXTO) {
    if (typeof body[campo] === "string") update[campo] = body[campo];
  }
  if (typeof body.valorEstimado === "number") update.valor_estimado = body.valorEstimado;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contacts")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[contatos/patch]", error);
    return NextResponse.json(
      { error: "Não foi possível atualizar o contato." },
      { status: 500 }
    );
  }

  return NextResponse.json({ contato: mapContatoRow(data as DbContatoRow) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("contacts").delete().eq("id", id);

  if (error) {
    console.error("[contatos/delete]", error);
    return NextResponse.json(
      { error: "Não foi possível excluir o contato." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`

Expected: sem erros.

- [ ] **Step 3: Testar (reaproveitando o contato criado na Task 2 — pegue o `id` do `GET /api/contatos`)**

```bash
curl -s -X PATCH "http://localhost:3000/api/contatos/<id>" \
  -H "Content-Type: application/json" \
  -d '{"status": "inativo"}'
```

Expected: `{"contato":{...,"status":"inativo",...}}`.

```bash
curl -s -X DELETE "http://localhost:3000/api/contatos/<id>"
```

Expected: `{"ok":true}`. Rodando `GET /api/contatos` de novo, o contato de teste não aparece mais.

- [ ] **Step 4: Commit**

```bash
git add "app/api/contatos/[id]/route.ts"
git commit -m "feat: add update/delete contact API routes"
```

---

### Task 4: Diálogo "Novo contato" e listagem real

**Files:**
- Create: `components/app/contatos/novo-contato-dialog.tsx`
- Modify: `app/(app)/contatos/page.tsx`

**Interfaces:**
- Consumes: `POST /api/contatos`, `GET /api/contatos` (Task 2).
- Produces: `<NovoContatoDialog onCriado={(contato: Contato) => void} />` — usado também pela Task 5 sem alteração.

- [ ] **Step 1: Criar `components/app/contatos/novo-contato-dialog.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";

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
import type { Contato } from "@/lib/types";

export function NovoContatoDialog({
  onCriado,
}: {
  onCriado: (contato: Contato) => void;
}) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function limpar() {
    setNome("");
    setEmpresa("");
    setEmail("");
    setTelefone("");
    setErro(null);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch("/api/contatos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, empresa, email, telefone }),
      });
      if (!res.ok) throw new Error();
      const { contato } = await res.json();
      onCriado(contato);
      limpar();
      setOpen(false);
    } catch {
      setErro("Não foi possível salvar o contato. Tente novamente.");
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
          <Plus className="size-4" />
          Novo contato
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo contato</DialogTitle>
          <DialogDescription>
            Cadastre um contato na base comercial.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={salvar}>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                placeholder="Nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="empresa">Empresa</Label>
              <Input
                id="empresa"
                placeholder="Empresa"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                placeholder="(11) 90000-0000"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                required
              />
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
              {enviando ? "Salvando…" : "Salvar contato"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Substituir `app/(app)/contatos/page.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, MoreHorizontal } from "lucide-react";

import { Topbar } from "@/components/app/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NovoContatoDialog } from "@/components/app/contatos/novo-contato-dialog";
import {
  CONTATO_STATUS_LABEL,
  ORIGEM_LABEL,
  type Contato,
  type ContatoStatus,
} from "@/lib/types";
import { cn, formatBRL, formatDate, initials } from "@/lib/utils";

const STATUS_FILTERS: { id: ContatoStatus | "todos"; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "lead", label: "Leads" },
  { id: "ativo", label: "Ativos" },
  { id: "cliente", label: "Clientes" },
  { id: "inativo", label: "Inativos" },
];

const STATUS_BADGE: Record<
  ContatoStatus,
  "default" | "won" | "open" | "progress"
> = {
  lead: "open",
  ativo: "progress",
  cliente: "won",
  inativo: "default",
};

export default function ContatosPage() {
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<ContatoStatus | "todos">("todos");

  useEffect(() => {
    fetch("/api/contatos", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { contatos: [] }))
      .then(({ contatos: lista }) => setContatos(lista ?? []));
  }, []);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return contatos.filter((c) => {
      const matchStatus = status === "todos" || c.status === status;
      const matchBusca =
        !q ||
        c.nome.toLowerCase().includes(q) ||
        c.empresa.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q);
      return matchStatus && matchBusca;
    });
  }, [busca, status, contatos]);

  function aoCriar(contato: Contato) {
    setContatos((prev) => [...prev, contato]);
  }

  return (
    <>
      <Topbar
        title="Contatos"
        description={`${contatos.length} contatos na base`}
      />

      <div className="space-y-4 p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, empresa ou e-mail"
              className="pl-8"
            />
          </label>
          <NovoContatoDialog onCriado={aoCriar} />
        </div>

        <div className="flex flex-wrap gap-1 border-b border-border">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatus(f.id)}
              aria-pressed={status === f.id}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                status === f.id
                  ? "border-brand text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="reveal overflow-hidden rounded-lg border border-border bg-card panel-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contato</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="text-right">Valor estimado</TableHead>
                <TableHead>Último contato</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{initials(c.nome)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{c.nome}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{c.empresa}</p>
                    <p className="text-xs text-muted-foreground">{c.cargo}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE[c.status]}>
                      {CONTATO_STATUS_LABEL[c.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {ORIGEM_LABEL[c.origem]}
                  </TableCell>
                  <TableCell className="tabular text-right font-medium">
                    {formatBRL(c.valorEstimado)}
                  </TableCell>
                  <TableCell className="tabular text-muted-foreground">
                    {formatDate(c.ultimoContato)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Ações de ${c.nome}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled>Ver detalhes</DropdownMenuItem>
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                        <DropdownMenuItem disabled>Criar negócio</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Arquivar</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive">
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filtrados.length === 0 ? (
            <div className="flex flex-col items-center gap-1 p-12 text-center">
              <p className="text-sm font-medium">Nenhum contato encontrado</p>
              <p className="text-sm text-muted-foreground">
                Ajuste a busca ou os filtros para ver mais resultados.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
```

(Os itens "Editar", "Arquivar" e "Excluir" ainda não têm `onClick` — entram na Task 5.)

- [ ] **Step 3: Verificar tipos e lint**

Run: `npx tsc --noEmit && npm run lint`

Expected: sem erros novos (ignorar os 2 erros pré-existentes em `components/app/sidebar-context.tsx` e `components/app/stat-tile.tsx`, não relacionados a esta mudança).

- [ ] **Step 4: Testar no navegador**

1. Abra `http://localhost:3000/contatos` — a lista deve carregar do Supabase (vazia ou com o que já foi testado via curl).
2. Clique em "Novo contato", preencha e salve — o contato deve aparecer na lista sem precisar recarregar a página.
3. Recarregue a página — o contato criado deve continuar lá (prova que persiste de verdade).

- [ ] **Step 5: Commit**

```bash
git add components/app/contatos/novo-contato-dialog.tsx "app/(app)/contatos/page.tsx"
git commit -m "feat: wire Contatos page to real Supabase data with working create dialog"
```

---

### Task 5: Editar, arquivar e excluir contato

**Files:**
- Create: `components/app/contatos/editar-contato-dialog.tsx`
- Modify: `app/(app)/contatos/page.tsx`

**Interfaces:**
- Consumes: `PATCH /api/contatos/[id]`, `DELETE /api/contatos/[id]` (Task 3).
- Produces: `<EditarContatoDialog contato={Contato | null} onOpenChange={(open: boolean) => void} onSalvo={(contato: Contato) => void} />`.

- [ ] **Step 1: Criar `components/app/contatos/editar-contato-dialog.tsx`**

```tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";

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
} from "@/components/ui/dialog";
import type { Contato } from "@/lib/types";

export function EditarContatoDialog({
  contato,
  onOpenChange,
  onSalvo,
}: {
  contato: Contato | null;
  onOpenChange: (open: boolean) => void;
  onSalvo: (contato: Contato) => void;
}) {
  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cargo, setCargo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (contato) {
      setNome(contato.nome);
      setEmpresa(contato.empresa);
      setEmail(contato.email);
      setTelefone(contato.telefone);
      setCargo(contato.cargo);
      setErro(null);
    }
  }, [contato]);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!contato) return;
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/contatos/${contato.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, empresa, email, telefone, cargo }),
      });
      if (!res.ok) throw new Error();
      const { contato: atualizado } = await res.json();
      onSalvo(atualizado);
      onOpenChange(false);
    } catch {
      setErro("Não foi possível salvar as alterações. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={contato !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar contato</DialogTitle>
          <DialogDescription>
            Atualize os dados de {contato?.nome}.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={salvar}>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-nome">Nome</Label>
              <Input
                id="edit-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-empresa">Empresa</Label>
              <Input
                id="edit-empresa"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-email">E-mail</Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-telefone">Telefone</Label>
              <Input
                id="edit-telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-cargo">Cargo</Label>
            <Input
              id="edit-cargo"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
            />
          </div>
          {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" variant="brand" disabled={enviando}>
              {enviando ? "Salvando…" : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Editar `app/(app)/contatos/page.tsx`**

Adicionar o import e o estado de edição:

```tsx
import { EditarContatoDialog } from "@/components/app/contatos/editar-contato-dialog";
```

Dentro de `ContatosPage`, junto aos outros `useState`:

```tsx
  const [editando, setEditando] = useState<Contato | null>(null);
```

Adicionar as funções (junto de `aoCriar`):

```tsx
  function aoSalvarEdicao(contato: Contato) {
    setContatos((prev) => prev.map((c) => (c.id === contato.id ? contato : c)));
  }

  async function arquivar(contato: Contato) {
    const res = await fetch(`/api/contatos/${contato.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "inativo" }),
    });
    if (!res.ok) return;
    const { contato: atualizado } = await res.json();
    setContatos((prev) => prev.map((c) => (c.id === atualizado.id ? atualizado : c)));
  }

  async function excluir(contato: Contato) {
    if (!window.confirm(`Excluir ${contato.nome} permanentemente?`)) return;
    const res = await fetch(`/api/contatos/${contato.id}`, { method: "DELETE" });
    if (!res.ok) return;
    setContatos((prev) => prev.filter((c) => c.id !== contato.id));
  }
```

Substituir o bloco do menu de ações (dentro do `.map((c) => ...)`) por:

```tsx
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Ações de ${c.nome}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled>Ver detalhes</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditando(c)}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>Criar negócio</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => arquivar(c)}>
                          Arquivar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => excluir(c)}
                        >
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
```

E, logo antes do `</>` final do componente (depois da `</div>` que fecha `space-y-4 p-4 md:p-6`), adicionar:

```tsx
      <EditarContatoDialog
        contato={editando}
        onOpenChange={(open) => {
          if (!open) setEditando(null);
        }}
        onSalvo={aoSalvarEdicao}
      />
```

- [ ] **Step 3: Verificar tipos e lint**

Run: `npx tsc --noEmit && npm run lint`

Expected: sem erros novos.

- [ ] **Step 4: Testar no navegador**

1. Clique em "Editar" num contato, altere um campo e salve — a linha da tabela deve refletir a mudança sem recarregar.
2. Clique em "Arquivar" — o badge de status deve virar "Inativo".
3. Clique em "Excluir", confirme no popup — o contato deve sumir da lista.
4. Recarregue a página — confirme que a exclusão e a edição persistiram (o contato editado continua com os novos dados; o excluído não volta).
5. Confirme que "Ver detalhes" e "Criar negócio" aparecem apagados/sem ação no menu.

- [ ] **Step 5: Commit**

```bash
git add components/app/contatos/editar-contato-dialog.tsx "app/(app)/contatos/page.tsx"
git commit -m "feat: add edit/archive/delete actions to Contatos page"
```

---

### Task 6: Verificação final

**Files:** nenhum arquivo novo — só verificação manual do fluxo completo.

- [ ] **Step 1: Fluxo completo no navegador**

1. Criar um contato novo.
2. Editá-lo (mudar nome e empresa).
3. Buscar por ele (testar o campo de busca) e filtrar por status.
4. Arquivá-lo e confirmar que o filtro "Inativos" o mostra.
5. Excluí-lo permanentemente.

- [ ] **Step 2: Revisão final**

Run: `npx tsc --noEmit && npm run lint`

Expected: sem erros novos (os 2 erros pré-existentes em `sidebar-context.tsx`/`stat-tile.tsx` continuam, não são desta spec).

- [ ] **Step 3: Confirmar que `lib/mock-data.ts` continua intacto**

Run: `git diff --stat lib/mock-data.ts`

Expected: sem saída (nenhuma mudança) — Pipeline, Painel, Relatórios e o painel de contato do Inbox continuam funcionando com os dados mockados até seus próprios sub-projetos de migração.
