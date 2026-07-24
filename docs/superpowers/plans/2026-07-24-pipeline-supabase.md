# Pipeline Supabase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o Pipeline mockado (`lib/mock-data.ts`) por CRUD real no Supabase — criar, mover entre etapas, editar e excluir negócios, vinculados a contatos reais.

**Architecture:** Mesmo padrão de Contatos e WhatsApp: uma tabela `deals` no Supabase, acessada só por Route Handlers (`app/api/negocios/**`) via `service_role` key (`lib/supabase/server.ts`). `contact_id` referencia `contacts(id)` com `on delete cascade`.

**Tech Stack:** Next.js 16 (App Router) + TypeScript + Tailwind v4 + `@supabase/supabase-js` (já em uso).

## Global Constraints

- Repositório: `c:\Users\Gabriel\Documents\meu_crm`. Sem framework de testes automatizados — verificação manual (curl / navegador).
- `lib/mock-data.ts` (CONTATOS, NEGOCIOS, ATIVIDADES) **permanece intocado** — ainda consumido por Painel, Relatórios, Metas, Automações, Tarefas, Configurações/conta e pelo painel de contato do Inbox. Só a tela de Pipeline (e o menu "Criar negócio" de Contatos) passam a usar dados reais.
- Owner fixo: todo negócio tem `owner_nome = "Gabriel Pereira"`.
- Reatribuir um negócio para outro contato está fora do escopo — o diálogo de edição não permite trocar o contato vinculado.
- O botão "Criar negócio" do Inbox (`components/app/inbox/contact-panel.tsx`) continua desabilitado — fora do escopo (depende da integração Inbox↔Contatos, ainda não construída).
- Toda chamada ao Supabase roda em `app/api/**/route.ts` — nunca em componentes `"use client"`.
- Reusar primitivas de UI existentes (`components/ui/button.tsx`, `dialog.tsx`, `select.tsx`, `dropdown-menu.tsx`, `input.tsx`, `label.tsx`) — não introduzir nova lib de UI.
- Projeto Supabase: ref `qhrnnunkjlhipispkusy` (mesmo do WhatsApp e Contatos).

---

### Task 1: Schema no Supabase e mapper

**Files:**
- Create: `lib/negocios/mapper.ts`

**Interfaces:**
- Produces: `mapDealRow(row: DbDealRow): Negocio`, tipo `DbDealRow` — usados pelas Tasks 2 e 3.

- [ ] **Step 1: Criar a tabela no Supabase (manual — feito por você no dashboard)**

Abra `https://supabase.com/dashboard/project/qhrnnunkjlhipispkusy/sql/new`, cole o SQL abaixo e clique em **Run**:

```sql
create table deals (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  contact_id uuid not null references contacts(id) on delete cascade,
  empresa text not null default '',
  valor numeric not null default 0,
  stage text not null default 'lead',
  probabilidade int not null default 20,
  fechamento_previsto timestamptz,
  owner_nome text not null default 'Gabriel Pereira',
  criado_em timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table deals enable row level security;
```

Não crie policies para `anon`/`authenticated` — é intencional (deny-all; só a `service_role` acessa).

- [ ] **Step 2: Verificar que a tabela existe e está acessível**

Run (substitua `<service_role_key>` pela chave em `.env.local`):

```bash
curl -s "https://qhrnnunkjlhipispkusy.supabase.co/rest/v1/deals?select=id" \
  -H "apikey: <service_role_key>" \
  -H "Authorization: Bearer <service_role_key>"
```

Expected: `[]` (200 OK, array vazio).

- [ ] **Step 3: Criar `lib/negocios/mapper.ts`**

```typescript
import type { Negocio, PipelineStage } from "@/lib/types";

export interface DbDealRow {
  id: string;
  titulo: string;
  contact_id: string;
  empresa: string;
  valor: number;
  stage: string;
  probabilidade: number;
  fechamento_previsto: string | null;
  owner_nome: string;
  criado_em: string;
}

export function mapDealRow(row: DbDealRow): Negocio {
  return {
    id: row.id,
    titulo: row.titulo,
    contatoId: row.contact_id,
    empresa: row.empresa,
    valor: row.valor,
    stage: row.stage as PipelineStage,
    probabilidade: row.probabilidade,
    criadoEm: row.criado_em,
    fechamentoPrevisto: row.fechamento_previsto ?? "",
    ownerId: row.owner_nome,
  };
}
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`

Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add lib/negocios/mapper.ts
git commit -m "feat: add deals table schema and row mapper"
```

---

### Task 2: Rotas de listar e criar negócio

**Files:**
- Create: `app/api/negocios/route.ts`

**Interfaces:**
- Consumes: `createSupabaseServerClient`, `mapDealRow`/`DbDealRow` (Task 1).
- Produces: `GET /api/negocios` → `{ negocios: Negocio[] }`; `POST /api/negocios` (body `{ titulo, contatoId, empresa, valor, fechamentoPrevisto? }`) → `{ negocio: Negocio }`. Consumidos pela Task 4.

- [ ] **Step 1: Criar `app/api/negocios/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapDealRow, type DbDealRow } from "@/lib/negocios/mapper";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("[negocios/get]", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os negócios." },
      { status: 500 }
    );
  }

  const negocios = (data as DbDealRow[]).map(mapDealRow);
  return NextResponse.json({ negocios });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const titulo = typeof body.titulo === "string" ? body.titulo.trim() : "";
  const contatoId = typeof body.contatoId === "string" ? body.contatoId.trim() : "";
  const empresa = typeof body.empresa === "string" ? body.empresa.trim() : "";
  const valor = typeof body.valor === "number" ? body.valor : 0;
  const fechamentoPrevisto =
    typeof body.fechamentoPrevisto === "string" && body.fechamentoPrevisto
      ? body.fechamentoPrevisto
      : null;

  if (!titulo || !contatoId) {
    return NextResponse.json(
      { error: "Título e contato são obrigatórios." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("deals")
    .insert({
      titulo,
      contact_id: contatoId,
      empresa,
      valor,
      fechamento_previsto: fechamentoPrevisto,
    })
    .select()
    .single();

  if (error) {
    console.error("[negocios/post]", error);
    return NextResponse.json(
      { error: "Não foi possível criar o negócio." },
      { status: 500 }
    );
  }

  return NextResponse.json({ negocio: mapDealRow(data as DbDealRow) });
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`

Expected: sem erros.

- [ ] **Step 3: Testar (dev server rodando, e com um contato real já criado via `POST /api/contatos` — pegue o `id` dele)**

```bash
curl -s -X POST "http://localhost:3000/api/negocios" \
  -H "Content-Type: application/json" \
  -d '{"titulo":"Negócio Teste","contatoId":"<id do contato>","empresa":"Empresa Teste","valor":10000}'
```

Expected: `{"negocio":{"id":"...","titulo":"Negócio Teste","contatoId":"<id do contato>",...,"stage":"lead","probabilidade":20,...}}`.

```bash
curl -s "http://localhost:3000/api/negocios"
```

Expected: `{"negocios":[{"titulo":"Negócio Teste",...}]}`.

- [ ] **Step 4: Commit**

```bash
git add app/api/negocios/route.ts
git commit -m "feat: add list/create deals API routes"
```

---

### Task 3: Rotas de editar, mover e excluir negócio

**Files:**
- Create: `app/api/negocios/[id]/route.ts`

**Interfaces:**
- Consumes: `createSupabaseServerClient`, `mapDealRow`/`DbDealRow` (Task 1).
- Produces: `PATCH /api/negocios/[id]` (body parcial: `titulo?`, `empresa?`, `stage?`, `valor?`, `probabilidade?`, `fechamentoPrevisto?`) → `{ negocio: Negocio }`; `DELETE /api/negocios/[id]` → `{ ok: true }`. Consumidos pelas Tasks 4 e 5.

- [ ] **Step 1: Criar `app/api/negocios/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapDealRow, type DbDealRow } from "@/lib/negocios/mapper";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.titulo === "string") update.titulo = body.titulo;
  if (typeof body.empresa === "string") update.empresa = body.empresa;
  if (typeof body.stage === "string") update.stage = body.stage;
  if (typeof body.valor === "number") update.valor = body.valor;
  if (typeof body.probabilidade === "number") update.probabilidade = body.probabilidade;
  if (typeof body.fechamentoPrevisto === "string") {
    update.fechamento_previsto = body.fechamentoPrevisto || null;
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("deals")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[negocios/patch]", error);
    return NextResponse.json(
      { error: "Não foi possível atualizar o negócio." },
      { status: 500 }
    );
  }

  return NextResponse.json({ negocio: mapDealRow(data as DbDealRow) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("deals").delete().eq("id", id);

  if (error) {
    console.error("[negocios/delete]", error);
    return NextResponse.json(
      { error: "Não foi possível excluir o negócio." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`

Expected: sem erros.

- [ ] **Step 3: Testar (reaproveitando o negócio da Task 2 — pegue o `id` do `GET /api/negocios`)**

```bash
curl -s -X PATCH "http://localhost:3000/api/negocios/<id>" \
  -H "Content-Type: application/json" \
  -d '{"stage": "proposta"}'
```

Expected: `{"negocio":{...,"stage":"proposta",...}}`.

```bash
curl -s -X DELETE "http://localhost:3000/api/negocios/<id>"
```

Expected: `{"ok":true}`. Rodando `GET /api/negocios` de novo, o negócio de teste não aparece mais.

- [ ] **Step 4: Commit**

```bash
git add "app/api/negocios/[id]/route.ts"
git commit -m "feat: add update/delete deal API routes"
```

---

### Task 4: Diálogo "Novo negócio" e Pipeline com dados reais

**Files:**
- Create: `components/app/negocios/novo-negocio-dialog.tsx`
- Modify: `app/(app)/pipeline/page.tsx`

**Interfaces:**
- Consumes: `GET /api/negocios`, `GET /api/contatos`, `POST /api/negocios`, `PATCH /api/negocios/[id]` (Tasks 2, 3; Contatos já existente).
- Produces: `<NovoNegocioDialog open contatos={Contato[]} contatoFixo={Contato=} onOpenChange onCriado={(negocio: Negocio) => void} />` — reusado pela Task 5 (Contatos).

- [ ] **Step 1: Criar `components/app/negocios/novo-negocio-dialog.tsx`**

```tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Contato, Negocio } from "@/lib/types";

export function NovoNegocioDialog({
  open,
  onOpenChange,
  contatos,
  contatoFixo,
  onCriado,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contatos: Contato[];
  contatoFixo?: Contato;
  onCriado: (negocio: Negocio) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [contatoId, setContatoId] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [valor, setValor] = useState("");
  const [fechamentoPrevisto, setFechamentoPrevisto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reseta o formulário toda vez que o diálogo abre
      setTitulo("");
      setContatoId(contatoFixo?.id ?? "");
      setEmpresa(contatoFixo?.empresa ?? "");
      setValor("");
      setFechamentoPrevisto("");
      setErro(null);
    }
  }, [open, contatoFixo]);

  function selecionarContato(id: string) {
    setContatoId(id);
    const contato = contatos.find((c) => c.id === id);
    if (contato) setEmpresa(contato.empresa);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!contatoId) {
      setErro("Escolha um contato.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch("/api/negocios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          contatoId,
          empresa,
          valor: Number(valor) || 0,
          fechamentoPrevisto: fechamentoPrevisto || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const { negocio } = await res.json();
      onCriado(negocio);
      onOpenChange(false);
    } catch {
      setErro("Não foi possível salvar o negócio. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  const semContatos = !contatoFixo && contatos.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo negócio</DialogTitle>
          <DialogDescription>
            Cadastre um negócio vinculado a um contato.
          </DialogDescription>
        </DialogHeader>
        {semContatos ? (
          <p className="text-sm text-muted-foreground">
            Cadastre um contato antes de criar um negócio.
          </p>
        ) : (
          <form className="grid gap-4" onSubmit={salvar}>
            <div className="grid gap-1.5">
              <Label htmlFor="negocio-titulo">Título</Label>
              <Input
                id="negocio-titulo"
                placeholder="Ex: Plano Pro anual"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="negocio-contato">Contato</Label>
              {contatoFixo ? (
                <Input id="negocio-contato" value={contatoFixo.nome} disabled />
              ) : (
                <Select value={contatoId} onValueChange={selecionarContato}>
                  <SelectTrigger id="negocio-contato">
                    <SelectValue placeholder="Escolha um contato" />
                  </SelectTrigger>
                  <SelectContent>
                    {contatos.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome} — {c.empresa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="negocio-empresa">Empresa</Label>
                <Input
                  id="negocio-empresa"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="negocio-valor">Valor (R$)</Label>
                <Input
                  id="negocio-valor"
                  type="number"
                  min="0"
                  step="1"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="negocio-fechamento">
                Previsão de fechamento (opcional)
              </Label>
              <Input
                id="negocio-fechamento"
                type="date"
                value={fechamentoPrevisto}
                onChange={(e) => setFechamentoPrevisto(e.target.value)}
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
                {enviando ? "Salvando…" : "Salvar negócio"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Substituir `app/(app)/pipeline/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { MoveRight, GripVertical, Plus } from "lucide-react";

import { Topbar } from "@/components/app/topbar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NovoNegocioDialog } from "@/components/app/negocios/novo-negocio-dialog";
import {
  STAGES,
  type Contato,
  type Negocio,
  type PipelineStage,
} from "@/lib/types";
import { cn, formatBRL, initials } from "@/lib/utils";

const STAGE_ACCENT: Record<PipelineStage, string> = {
  lead: "bg-subtle",
  qualificado: "bg-status-open",
  proposta: "bg-status-progress",
  negociacao: "bg-status-progress",
  ganho: "bg-status-won",
  perdido: "bg-status-lost",
};

export default function PipelinePage() {
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [novoAberto, setNovoAberto] = useState(false);

  useEffect(() => {
    fetch("/api/negocios", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { negocios: [] }))
      .then(({ negocios: lista }) => setNegocios(lista ?? []));
    fetch("/api/contatos", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { contatos: [] }))
      .then(({ contatos: lista }) => setContatos(lista ?? []));
  }, []);

  function getContato(id: string) {
    return contatos.find((c) => c.id === id);
  }

  async function mover(id: string, stage: PipelineStage) {
    setNegocios((prev) => prev.map((n) => (n.id === id ? { ...n, stage } : n)));
    await fetch(`/api/negocios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
  }

  function aoCriar(negocio: Negocio) {
    setNegocios((prev) => [...prev, negocio]);
  }

  const totalAberto = negocios
    .filter((n) => !["ganho", "perdido"].includes(n.stage))
    .reduce((s, n) => s + n.valor, 0);

  return (
    <>
      <Topbar
        title="Pipeline de vendas"
        description={`${formatBRL(totalAberto)} em negócios abertos`}
      />

      <div className="p-4 md:p-6">
        <div className="mb-4 flex justify-end">
          <Button
            variant="brand"
            className="gap-1.5"
            onClick={() => setNovoAberto(true)}
          >
            <Plus className="size-4" />
            Novo negócio
          </Button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2">
          {STAGES.map((stage, i) => {
            const deals = negocios.filter((n) => n.stage === stage.id);
            const total = deals.reduce((s, n) => s + n.valor, 0);
            return (
              <div
                key={stage.id}
                className="reveal flex w-72 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card panel-sm"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className="border-b border-border-strong">
                  <div className={cn("h-1", STAGE_ACCENT[stage.id])} />
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-medium tracking-tight">
                        {stage.label}
                      </span>
                      <span className="tabular rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {deals.length}
                      </span>
                    </div>
                    <span className="tabular text-xs font-medium text-muted-foreground">
                      {formatBRL(total)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-2 p-2">
                  {deals.map((n) => {
                    const contato = getContato(n.contatoId);
                    return (
                      <article
                        key={n.id}
                        className="group cursor-pointer rounded-md border border-border bg-elevated p-3 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-brand/50 hover:panel-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-snug">
                            {n.titulo}
                          </p>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              aria-label="Ações do negócio"
                              className="mt-0.5 shrink-0 text-muted-foreground outline-none hover:text-foreground"
                            >
                              <GripVertical className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Mover para</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {STAGES.filter((s) => s.id !== n.stage).map(
                                (s) => (
                                  <DropdownMenuItem
                                    key={s.id}
                                    onClick={() => mover(n.id, s.id)}
                                  >
                                    <MoveRight className="size-4" />
                                    {s.label}
                                  </DropdownMenuItem>
                                )
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {n.empresa}
                        </p>

                        <div className="mt-3 flex items-center justify-between">
                          <span className="tabular font-display text-sm font-semibold">
                            {formatBRL(n.valor)}
                          </span>
                          <span className="tabular text-xs text-muted-foreground">
                            {n.probabilidade}%
                          </span>
                        </div>

                        <div className="mt-3 flex items-center gap-2 border-t border-border pt-2.5">
                          <Avatar className="size-6">
                            <AvatarFallback className="text-[10px]">
                              {initials(contato?.nome ?? "??")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate text-xs text-muted-foreground">
                            {contato?.nome ?? "—"}
                          </span>
                        </div>
                      </article>
                    );
                  })}

                  {deals.length === 0 ? (
                    <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                      Nenhum negócio nesta etapa.
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <NovoNegocioDialog
        open={novoAberto}
        onOpenChange={setNovoAberto}
        contatos={contatos}
        onCriado={aoCriar}
      />
    </>
  );
}
```

(O "Editar" e "Excluir" entram na Task 5.)

- [ ] **Step 3: Verificar tipos e lint**

Run: `npx tsc --noEmit && npm run lint`

Expected: sem erros novos (ignorar os 2 erros pré-existentes em `sidebar-context.tsx`/`stat-tile.tsx`).

- [ ] **Step 4: Testar no navegador**

1. Cadastre pelo menos um contato em `/contatos`, se ainda não tiver nenhum.
2. Abra `/pipeline`. O quadro deve carregar vazio (ou com o negócio de teste da Task 2, se ainda existir).
3. Clique em "Novo negócio", escolha o contato no select, preencha e salve — o card deve aparecer na coluna "Lead".
4. Use o menu "..." do card → "Mover para" outra etapa — o card deve mudar de coluna.
5. Recarregue a página — confirme que o negócio e a etapa persistiram.

- [ ] **Step 5: Commit**

```bash
git add components/app/negocios/novo-negocio-dialog.tsx "app/(app)/pipeline/page.tsx"
git commit -m "feat: wire Pipeline page to real Supabase data with working create dialog"
```

---

### Task 5: Editar/excluir negócio e "Criar negócio" em Contatos

**Files:**
- Create: `components/app/negocios/editar-negocio-dialog.tsx`
- Modify: `app/(app)/pipeline/page.tsx`
- Modify: `app/(app)/contatos/page.tsx`

**Interfaces:**
- Consumes: `PATCH /api/negocios/[id]`, `DELETE /api/negocios/[id]` (Task 3); `NovoNegocioDialog` (Task 4).
- Produces: `<EditarNegocioDialog negocio={Negocio | null} onOpenChange onSalvo={(negocio: Negocio) => void} />`.

- [ ] **Step 1: Criar `components/app/negocios/editar-negocio-dialog.tsx`**

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
import type { Negocio } from "@/lib/types";

export function EditarNegocioDialog({
  negocio,
  onOpenChange,
  onSalvo,
}: {
  negocio: Negocio | null;
  onOpenChange: (open: boolean) => void;
  onSalvo: (negocio: Negocio) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [valor, setValor] = useState("");
  const [probabilidade, setProbabilidade] = useState("");
  const [fechamentoPrevisto, setFechamentoPrevisto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (negocio) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preenche o formulário quando o negócio selecionado muda
      setTitulo(negocio.titulo);
      setEmpresa(negocio.empresa);
      setValor(String(negocio.valor));
      setProbabilidade(String(negocio.probabilidade));
      setFechamentoPrevisto(negocio.fechamentoPrevisto?.slice(0, 10) ?? "");
      setErro(null);
    }
  }, [negocio]);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!negocio) return;
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/negocios/${negocio.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          empresa,
          valor: Number(valor) || 0,
          probabilidade: Number(probabilidade) || 0,
          fechamentoPrevisto: fechamentoPrevisto || "",
        }),
      });
      if (!res.ok) throw new Error();
      const { negocio: atualizado } = await res.json();
      onSalvo(atualizado);
      onOpenChange(false);
    } catch {
      setErro("Não foi possível salvar as alterações. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={negocio !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar negócio</DialogTitle>
          <DialogDescription>
            Atualize os dados de {negocio?.titulo}.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={salvar}>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-negocio-titulo">Título</Label>
            <Input
              id="edit-negocio-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-negocio-empresa">Empresa</Label>
              <Input
                id="edit-negocio-empresa"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-negocio-valor">Valor (R$)</Label>
              <Input
                id="edit-negocio-valor"
                type="number"
                min="0"
                step="1"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-negocio-probabilidade">
                Probabilidade (%)
              </Label>
              <Input
                id="edit-negocio-probabilidade"
                type="number"
                min="0"
                max="100"
                step="5"
                value={probabilidade}
                onChange={(e) => setProbabilidade(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-negocio-fechamento">
                Previsão de fechamento
              </Label>
              <Input
                id="edit-negocio-fechamento"
                type="date"
                value={fechamentoPrevisto}
                onChange={(e) => setFechamentoPrevisto(e.target.value)}
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
              {enviando ? "Salvando…" : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Editar `app/(app)/pipeline/page.tsx`**

Adicionar o import:

```tsx
import { EditarNegocioDialog } from "@/components/app/negocios/editar-negocio-dialog";
```

Adicionar o estado, junto de `novoAberto`:

```tsx
  const [editando, setEditando] = useState<Negocio | null>(null);
```

Adicionar as funções, junto de `aoCriar`:

```tsx
  function aoSalvarEdicao(negocio: Negocio) {
    setNegocios((prev) => prev.map((n) => (n.id === negocio.id ? negocio : n)));
  }

  async function excluir(negocio: Negocio) {
    if (!window.confirm(`Excluir "${negocio.titulo}" permanentemente?`)) return;
    const res = await fetch(`/api/negocios/${negocio.id}`, { method: "DELETE" });
    if (!res.ok) return;
    setNegocios((prev) => prev.filter((n) => n.id !== negocio.id));
  }
```

Substituir o `<DropdownMenuContent align="end">` do card (dentro do `.map((n) => ...)`) por:

```tsx
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Mover para</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {STAGES.filter((s) => s.id !== n.stage).map(
                                (s) => (
                                  <DropdownMenuItem
                                    key={s.id}
                                    onClick={() => mover(n.id, s.id)}
                                  >
                                    <MoveRight className="size-4" />
                                    {s.label}
                                  </DropdownMenuItem>
                                )
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setEditando(n)}>
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => excluir(n)}
                              >
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
```

E, logo antes do `</>` final do componente (depois do `<NovoNegocioDialog ... />`), adicionar:

```tsx
      <EditarNegocioDialog
        negocio={editando}
        onOpenChange={(open) => {
          if (!open) setEditando(null);
        }}
        onSalvo={aoSalvarEdicao}
      />
```

- [ ] **Step 3: Editar `app/(app)/contatos/page.tsx`**

Adicionar os imports:

```tsx
import { NovoNegocioDialog } from "@/components/app/negocios/novo-negocio-dialog";
```

Adicionar o estado, junto de `editando`:

```tsx
  const [negocioContato, setNegocioContato] = useState<Contato | null>(null);
```

Trocar o item de menu "Criar negócio" (hoje `disabled`) por:

```tsx
                        <DropdownMenuItem onClick={() => setNegocioContato(c)}>
                          Criar negócio
                        </DropdownMenuItem>
```

E, logo depois do `<EditarContatoDialog ... />` já existente, adicionar:

```tsx
      <NovoNegocioDialog
        open={negocioContato !== null}
        onOpenChange={(open) => {
          if (!open) setNegocioContato(null);
        }}
        contatos={contatos}
        contatoFixo={negocioContato ?? undefined}
        onCriado={() => {}}
      />
```

- [ ] **Step 4: Verificar tipos e lint**

Run: `npx tsc --noEmit && npm run lint`

Expected: sem erros novos.

- [ ] **Step 5: Testar no navegador**

1. Em `/pipeline`, clique em "..." de um card → "Editar", altere o valor e salve — o card deve refletir o novo valor.
2. Clique em "..." → "Excluir", confirme — o card deve sumir.
3. Recarregue e confirme que a edição e a exclusão persistiram.
4. Em `/contatos`, abra o menu de um contato → "Criar negócio" — deve abrir o diálogo com o contato já travado (sem select). Salve e confira em `/pipeline` que o negócio apareceu vinculado a esse contato.

- [ ] **Step 6: Commit**

```bash
git add components/app/negocios/editar-negocio-dialog.tsx "app/(app)/pipeline/page.tsx" "app/(app)/contatos/page.tsx"
git commit -m "feat: add edit/delete deal actions and wire Criar negócio from Contatos"
```

---

### Task 6: Verificação final

**Files:** nenhum arquivo novo — só verificação manual do fluxo completo.

- [ ] **Step 1: Fluxo completo no navegador**

1. Criar um contato novo (se precisar).
2. Criar um negócio vinculado a ele pelo Pipeline.
3. Mover o negócio por 2-3 etapas diferentes.
4. Editá-lo (mudar valor e probabilidade).
5. Criar um segundo negócio a partir do menu "Criar negócio" em Contatos.
6. Excluir um dos dois negócios.

- [ ] **Step 2: Testar o cascade delete**

Crie um contato de teste, crie um negócio vinculado a ele, depois exclua o contato em `/contatos`. Confirme (via `GET /api/negocios` ou na tela do Pipeline) que o negócio vinculado também sumiu.

- [ ] **Step 3: Revisão final**

Run: `npx tsc --noEmit && npm run lint`

Expected: sem erros novos (os 2 erros pré-existentes em `sidebar-context.tsx`/`stat-tile.tsx` continuam, não são desta spec).

- [ ] **Step 4: Confirmar que `lib/mock-data.ts` continua intacto**

Run: `git diff --stat lib/mock-data.ts`

Expected: sem saída (nenhuma mudança).
