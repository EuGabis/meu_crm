# Tarefas/Agenda Supabase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir Tarefas e Agenda mockadas por CRUD real no Supabase — tarefas com concluir/criar/editar/excluir, e uma agenda nativa com eventos em datas reais (criar/editar/excluir), vinculados a contatos reais.

**Architecture:** Duas tabelas novas (`tasks`, `events`), cada uma com suas próprias rotas (`app/api/tarefas/**`, `app/api/eventos/**`) via `service_role` key. `contact_id` em ambas usa `on delete set null` (diferente de `deals`, que usa `cascade`).

**Tech Stack:** Next.js 16 (App Router) + TypeScript + Tailwind v4 + `@supabase/supabase-js` (já em uso).

## Global Constraints

- Repositório: `c:\Users\Gabriel\Documents\meu_crm`. Sem framework de testes automatizados — verificação manual.
- `lib/mock-data.ts` permanece intocado — ainda usado por Painel, Relatórios, Metas, Automações e pelo painel de contato do Inbox.
- `lib/tarefas-data.ts` fica sem uso após esta migração (pode ser removido). `lib/agenda-data.ts` **não** é removido — perde só `EVENTOS` e `HOJE_INDICE`, mas mantém `Evento`, `EventoTipo`, `TIPO_LABEL`, `HORA_INICIO`, `HORA_FIM`, usados pelo `WeekView`.
- Responsável fixo: toda tarefa tem `responsavel_nome = "Gabriel Pereira"` (mesmo padrão de Contatos/Negócios).
- `contact_id` em `tasks` e `events` usa `on delete set null` — excluir um contato não apaga tarefas/eventos vinculados, só desvincula.
- Sincronização com Google Calendar está fora do escopo — a Agenda é nativa nesta spec.
- Toda chamada ao Supabase roda em `app/api/**/route.ts` — nunca em componentes `"use client"`.
- Reusar primitivas de UI existentes (`button.tsx`, `dialog.tsx`, `select.tsx`, `dropdown-menu.tsx`, `input.tsx`, `label.tsx`).
- Projeto Supabase: ref `qhrnnunkjlhipispkusy` (mesmo dos módulos anteriores).

---

### Task 1: Schemas no Supabase e mappers

**Files:**
- Create: `lib/tarefas/mapper.ts`
- Create: `lib/eventos/mapper.ts`
- Modify: `lib/types.ts`

**Interfaces:**
- Produces: `mapTaskRow(row: DbTaskRow): Tarefa`, `mapEventRow(row: DbEventRow): EventoAgenda` — usados pelas Tasks 2 e 3.

- [ ] **Step 1: Criar as tabelas no Supabase (manual — feito por você no dashboard)**

Abra `https://supabase.com/dashboard/project/qhrnnunkjlhipispkusy/sql/new`, cole o SQL abaixo e clique em **Run**:

```sql
create table tasks (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  concluida boolean not null default false,
  prioridade text not null default 'media',
  vencimento date not null,
  tipo text not null default 'tarefa',
  contact_id uuid references contacts(id) on delete set null,
  responsavel_nome text not null default 'Gabriel Pereira',
  criado_em timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  inicio timestamptz not null,
  fim timestamptz not null,
  tipo text not null default 'reuniao',
  local text not null default '',
  contact_id uuid references contacts(id) on delete set null,
  criado_em timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tasks enable row level security;
alter table events enable row level security;
```

Não crie policies para `anon`/`authenticated` — deny-all intencional.

- [ ] **Step 2: Verificar que as tabelas existem**

```bash
curl -s "https://qhrnnunkjlhipispkusy.supabase.co/rest/v1/tasks?select=id" \
  -H "apikey: <service_role_key>" -H "Authorization: Bearer <service_role_key>"
curl -s "https://qhrnnunkjlhipispkusy.supabase.co/rest/v1/events?select=id" \
  -H "apikey: <service_role_key>" -H "Authorization: Bearer <service_role_key>"
```

Expected: `[]` em ambas.

- [ ] **Step 3: Adicionar `EventoAgenda` em `lib/types.ts`**

No topo do arquivo, junto dos outros imports (a primeira linha do arquivo já é um bloco de comentário — adicione o import logo depois dele):

```typescript
import type { EventoTipo } from "@/lib/agenda-data";
```

E, na seção "Tarefas, Notificações e Metas" (perto do final do arquivo, junto de `Tarefa`), adicione:

```typescript
export interface EventoAgenda {
  id: string;
  titulo: string;
  inicio: string; // ISO
  fim: string; // ISO
  tipo: EventoTipo;
  local: string;
  contatoId?: string;
}
```

- [ ] **Step 4: Criar `lib/tarefas/mapper.ts`**

```typescript
import type { Prioridade, Tarefa, TipoAtividade } from "@/lib/types";

export interface DbTaskRow {
  id: string;
  titulo: string;
  concluida: boolean;
  prioridade: string;
  vencimento: string;
  tipo: string;
  contact_id: string | null;
  responsavel_nome: string;
}

export function mapTaskRow(row: DbTaskRow): Tarefa {
  return {
    id: row.id,
    titulo: row.titulo,
    concluida: row.concluida,
    prioridade: row.prioridade as Prioridade,
    vencimento: row.vencimento,
    tipo: row.tipo as TipoAtividade,
    contatoId: row.contact_id ?? undefined,
    responsavelId: row.responsavel_nome,
  };
}
```

- [ ] **Step 5: Criar `lib/eventos/mapper.ts`**

```typescript
import type { EventoAgenda } from "@/lib/types";
import type { EventoTipo } from "@/lib/agenda-data";

export interface DbEventRow {
  id: string;
  titulo: string;
  inicio: string;
  fim: string;
  tipo: string;
  local: string;
  contact_id: string | null;
}

export function mapEventRow(row: DbEventRow): EventoAgenda {
  return {
    id: row.id,
    titulo: row.titulo,
    inicio: row.inicio,
    fim: row.fim,
    tipo: row.tipo as EventoTipo,
    local: row.local,
    contatoId: row.contact_id ?? undefined,
  };
}
```

- [ ] **Step 6: Verificar tipos**

Run: `npx tsc --noEmit`

Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add lib/tarefas/mapper.ts lib/eventos/mapper.ts lib/types.ts
git commit -m "feat: add tasks/events table schemas and row mappers"
```

---

### Task 2: Rotas de Tarefas

**Files:**
- Create: `app/api/tarefas/route.ts`
- Create: `app/api/tarefas/[id]/route.ts`

**Interfaces:**
- Consumes: `createSupabaseServerClient`, `mapTaskRow`/`DbTaskRow` (Task 1).
- Produces: `GET /api/tarefas` → `{ tarefas: Tarefa[] }`; `POST /api/tarefas` (body `{ titulo, prioridade, vencimento, tipo, contatoId? }`) → `{ tarefa: Tarefa }`; `PATCH /api/tarefas/[id]` (body parcial, incluindo `concluida?: boolean`) → `{ tarefa: Tarefa }`; `DELETE /api/tarefas/[id]` → `{ ok: true }`. Consumidos pela Task 4.

- [ ] **Step 1: Criar `app/api/tarefas/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapTaskRow, type DbTaskRow } from "@/lib/tarefas/mapper";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("vencimento", { ascending: true });

  if (error) {
    console.error("[tarefas/get]", error);
    return NextResponse.json(
      { error: "Não foi possível carregar as tarefas." },
      { status: 500 }
    );
  }

  const tarefas = (data as DbTaskRow[]).map(mapTaskRow);
  return NextResponse.json({ tarefas });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const titulo = typeof body.titulo === "string" ? body.titulo.trim() : "";
  const prioridade = typeof body.prioridade === "string" ? body.prioridade : "media";
  const vencimento = typeof body.vencimento === "string" ? body.vencimento : "";
  const tipo = typeof body.tipo === "string" ? body.tipo : "tarefa";
  const contatoId =
    typeof body.contatoId === "string" && body.contatoId ? body.contatoId : null;

  if (!titulo || !vencimento) {
    return NextResponse.json(
      { error: "Título e vencimento são obrigatórios." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({ titulo, prioridade, vencimento, tipo, contact_id: contatoId })
    .select()
    .single();

  if (error) {
    console.error("[tarefas/post]", error);
    return NextResponse.json(
      { error: "Não foi possível criar a tarefa." },
      { status: 500 }
    );
  }

  return NextResponse.json({ tarefa: mapTaskRow(data as DbTaskRow) });
}
```

- [ ] **Step 2: Criar `app/api/tarefas/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapTaskRow, type DbTaskRow } from "@/lib/tarefas/mapper";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.titulo === "string") update.titulo = body.titulo;
  if (typeof body.prioridade === "string") update.prioridade = body.prioridade;
  if (typeof body.vencimento === "string") update.vencimento = body.vencimento;
  if (typeof body.tipo === "string") update.tipo = body.tipo;
  if (typeof body.concluida === "boolean") update.concluida = body.concluida;
  if ("contatoId" in body) update.contact_id = body.contatoId || null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[tarefas/patch]", error);
    return NextResponse.json(
      { error: "Não foi possível atualizar a tarefa." },
      { status: 500 }
    );
  }

  return NextResponse.json({ tarefa: mapTaskRow(data as DbTaskRow) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) {
    console.error("[tarefas/delete]", error);
    return NextResponse.json(
      { error: "Não foi possível excluir a tarefa." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`

Expected: sem erros.

- [ ] **Step 4: Testar (dev server rodando, com um contato real criado — pegue o `id`)**

```bash
curl -s -X POST "http://localhost:3000/api/tarefas" \
  -H "Content-Type: application/json" \
  -d '{"titulo":"Tarefa Teste","prioridade":"alta","vencimento":"2026-08-01","tipo":"ligacao"}'
```

Expected: `{"tarefa":{"id":"...","titulo":"Tarefa Teste","concluida":false,"prioridade":"alta",...,"responsavelId":"Gabriel Pereira"}}`.

```bash
curl -s -X PATCH "http://localhost:3000/api/tarefas/<id>" -H "Content-Type: application/json" -d '{"concluida": true}'
curl -s -X DELETE "http://localhost:3000/api/tarefas/<id>"
```

Expected: `concluida: true` na resposta do PATCH; `{"ok":true}` no DELETE.

- [ ] **Step 5: Commit**

```bash
git add app/api/tarefas
git commit -m "feat: add tasks API routes"
```

---

### Task 3: Rotas de Eventos

**Files:**
- Create: `app/api/eventos/route.ts`
- Create: `app/api/eventos/[id]/route.ts`

**Interfaces:**
- Consumes: `createSupabaseServerClient`, `mapEventRow`/`DbEventRow` (Task 1).
- Produces: `GET /api/eventos` → `{ eventos: EventoAgenda[] }`; `POST /api/eventos` (body `{ titulo, inicio, fim, tipo, local?, contatoId? }`) → `{ evento: EventoAgenda }`; `PATCH /api/eventos/[id]` → `{ evento: EventoAgenda }`; `DELETE /api/eventos/[id]` → `{ ok: true }`. Consumidos pela Task 5.

- [ ] **Step 1: Criar `app/api/eventos/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapEventRow, type DbEventRow } from "@/lib/eventos/mapper";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("inicio", { ascending: true });

  if (error) {
    console.error("[eventos/get]", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os eventos." },
      { status: 500 }
    );
  }

  const eventos = (data as DbEventRow[]).map(mapEventRow);
  return NextResponse.json({ eventos });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const titulo = typeof body.titulo === "string" ? body.titulo.trim() : "";
  const inicio = typeof body.inicio === "string" ? body.inicio : "";
  const fim = typeof body.fim === "string" ? body.fim : "";
  const tipo = typeof body.tipo === "string" ? body.tipo : "reuniao";
  const local = typeof body.local === "string" ? body.local.trim() : "";
  const contatoId =
    typeof body.contatoId === "string" && body.contatoId ? body.contatoId : null;

  if (!titulo || !inicio || !fim) {
    return NextResponse.json(
      { error: "Título, início e fim são obrigatórios." },
      { status: 400 }
    );
  }

  if (new Date(fim).getTime() <= new Date(inicio).getTime()) {
    return NextResponse.json(
      { error: "O fim precisa ser depois do início." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .insert({ titulo, inicio, fim, tipo, local, contact_id: contatoId })
    .select()
    .single();

  if (error) {
    console.error("[eventos/post]", error);
    return NextResponse.json(
      { error: "Não foi possível criar o evento." },
      { status: 500 }
    );
  }

  return NextResponse.json({ evento: mapEventRow(data as DbEventRow) });
}
```

- [ ] **Step 2: Criar `app/api/eventos/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapEventRow, type DbEventRow } from "@/lib/eventos/mapper";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.titulo === "string") update.titulo = body.titulo;
  if (typeof body.inicio === "string") update.inicio = body.inicio;
  if (typeof body.fim === "string") update.fim = body.fim;
  if (typeof body.tipo === "string") update.tipo = body.tipo;
  if (typeof body.local === "string") update.local = body.local;
  if ("contatoId" in body) update.contact_id = body.contatoId || null;

  if (
    typeof update.inicio === "string" &&
    typeof update.fim === "string" &&
    new Date(update.fim).getTime() <= new Date(update.inicio).getTime()
  ) {
    return NextResponse.json(
      { error: "O fim precisa ser depois do início." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[eventos/patch]", error);
    return NextResponse.json(
      { error: "Não foi possível atualizar o evento." },
      { status: 500 }
    );
  }

  return NextResponse.json({ evento: mapEventRow(data as DbEventRow) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("events").delete().eq("id", id);

  if (error) {
    console.error("[eventos/delete]", error);
    return NextResponse.json(
      { error: "Não foi possível excluir o evento." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`

Expected: sem erros.

- [ ] **Step 4: Testar**

```bash
curl -s -X POST "http://localhost:3000/api/eventos" \
  -H "Content-Type: application/json" \
  -d '{"titulo":"Evento Teste","inicio":"2026-08-01T14:00:00.000Z","fim":"2026-08-01T15:00:00.000Z","tipo":"reuniao","local":"Google Meet"}'
```

Expected: `{"evento":{"id":"...","titulo":"Evento Teste",...}}`.

```bash
curl -s -X POST "http://localhost:3000/api/eventos" \
  -H "Content-Type: application/json" \
  -d '{"titulo":"Invalido","inicio":"2026-08-01T15:00:00.000Z","fim":"2026-08-01T14:00:00.000Z","tipo":"reuniao"}'
```

Expected: `400` com `{"error":"O fim precisa ser depois do início."}`.

```bash
curl -s -X DELETE "http://localhost:3000/api/eventos/<id do Evento Teste>"
```

Expected: `{"ok":true}`.

- [ ] **Step 5: Commit**

```bash
git add app/api/eventos
git commit -m "feat: add events API routes"
```

---

### Task 4: Telas de Tarefas

**Files:**
- Create: `components/app/tarefas/nova-tarefa-dialog.tsx`
- Create: `components/app/tarefas/editar-tarefa-dialog.tsx`
- Modify: `app/(app)/tarefas/page.tsx`
- Delete: `lib/tarefas-data.ts`

**Interfaces:**
- Consumes: `GET/POST /api/tarefas`, `PATCH/DELETE /api/tarefas/[id]` (Task 2); `GET /api/contatos` (já existente).

- [ ] **Step 1: Criar `components/app/tarefas/nova-tarefa-dialog.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";

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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ATIVIDADE_LABEL,
  PRIORIDADE_LABEL,
  type Contato,
  type Prioridade,
  type Tarefa,
  type TipoAtividade,
} from "@/lib/types";

const PRIORIDADES: Prioridade[] = ["alta", "media", "baixa"];
const TIPOS: TipoAtividade[] = ["ligacao", "email", "reuniao", "nota", "tarefa"];

export function NovaTarefaDialog({
  contatos,
  onCriada,
}: {
  contatos: Contato[];
  onCriada: (tarefa: Tarefa) => void;
}) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [prioridade, setPrioridade] = useState<Prioridade>("media");
  const [vencimento, setVencimento] = useState("");
  const [tipo, setTipo] = useState<TipoAtividade>("tarefa");
  const [contatoId, setContatoId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function limpar() {
    setTitulo("");
    setPrioridade("media");
    setVencimento("");
    setTipo("tarefa");
    setContatoId("");
    setErro(null);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch("/api/tarefas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          prioridade,
          vencimento,
          tipo,
          contatoId: contatoId || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const { tarefa } = await res.json();
      onCriada(tarefa);
      limpar();
      setOpen(false);
    } catch {
      setErro("Não foi possível salvar a tarefa. Tente novamente.");
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
          Nova tarefa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova tarefa</DialogTitle>
          <DialogDescription>Cadastre uma tarefa ou lembrete.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={salvar}>
          <div className="grid gap-1.5">
            <Label htmlFor="tarefa-titulo">Título</Label>
            <Input
              id="tarefa-titulo"
              placeholder="Ex: Ligar para o cliente"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="tarefa-prioridade">Prioridade</Label>
              <Select
                value={prioridade}
                onValueChange={(v) => setPrioridade(v as Prioridade)}
              >
                <SelectTrigger id="tarefa-prioridade">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDADES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORIDADE_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tarefa-vencimento">Vencimento</Label>
              <Input
                id="tarefa-vencimento"
                type="date"
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="tarefa-tipo">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoAtividade)}>
                <SelectTrigger id="tarefa-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ATIVIDADE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tarefa-contato">Contato (opcional)</Label>
              <Select
                value={contatoId || "none"}
                onValueChange={(v) => setContatoId(v === "none" ? "" : v)}
              >
                <SelectTrigger id="tarefa-contato">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum contato</SelectItem>
                  {contatos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {enviando ? "Salvando…" : "Salvar tarefa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Criar `components/app/tarefas/editar-tarefa-dialog.tsx`**

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
import {
  ATIVIDADE_LABEL,
  PRIORIDADE_LABEL,
  type Contato,
  type Prioridade,
  type Tarefa,
  type TipoAtividade,
} from "@/lib/types";

const PRIORIDADES: Prioridade[] = ["alta", "media", "baixa"];
const TIPOS: TipoAtividade[] = ["ligacao", "email", "reuniao", "nota", "tarefa"];

export function EditarTarefaDialog({
  tarefa,
  contatos,
  onOpenChange,
  onSalvo,
}: {
  tarefa: Tarefa | null;
  contatos: Contato[];
  onOpenChange: (open: boolean) => void;
  onSalvo: (tarefa: Tarefa) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [prioridade, setPrioridade] = useState<Prioridade>("media");
  const [vencimento, setVencimento] = useState("");
  const [tipo, setTipo] = useState<TipoAtividade>("tarefa");
  const [contatoId, setContatoId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (tarefa) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preenche o formulário quando a tarefa selecionada muda
      setTitulo(tarefa.titulo);
      setPrioridade(tarefa.prioridade);
      setVencimento(tarefa.vencimento);
      setTipo(tarefa.tipo);
      setContatoId(tarefa.contatoId ?? "");
      setErro(null);
    }
  }, [tarefa]);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!tarefa) return;
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/tarefas/${tarefa.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          prioridade,
          vencimento,
          tipo,
          contatoId: contatoId || null,
        }),
      });
      if (!res.ok) throw new Error();
      const { tarefa: atualizada } = await res.json();
      onSalvo(atualizada);
      onOpenChange(false);
    } catch {
      setErro("Não foi possível salvar as alterações. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={tarefa !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar tarefa</DialogTitle>
          <DialogDescription>Atualize os dados de {tarefa?.titulo}.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={salvar}>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-tarefa-titulo">Título</Label>
            <Input
              id="edit-tarefa-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-tarefa-prioridade">Prioridade</Label>
              <Select
                value={prioridade}
                onValueChange={(v) => setPrioridade(v as Prioridade)}
              >
                <SelectTrigger id="edit-tarefa-prioridade">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDADES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORIDADE_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-tarefa-vencimento">Vencimento</Label>
              <Input
                id="edit-tarefa-vencimento"
                type="date"
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-tarefa-tipo">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoAtividade)}>
                <SelectTrigger id="edit-tarefa-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ATIVIDADE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-tarefa-contato">Contato (opcional)</Label>
              <Select
                value={contatoId || "none"}
                onValueChange={(v) => setContatoId(v === "none" ? "" : v)}
              >
                <SelectTrigger id="edit-tarefa-contato">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum contato</SelectItem>
                  {contatos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

- [ ] **Step 3: Substituir `app/(app)/tarefas/page.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Circle,
  CheckCircle2,
  Phone,
  Mail,
  Video,
  StickyNote,
  CheckSquare,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

import { Topbar } from "@/components/app/topbar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NovaTarefaDialog } from "@/components/app/tarefas/nova-tarefa-dialog";
import { EditarTarefaDialog } from "@/components/app/tarefas/editar-tarefa-dialog";
import {
  PRIORIDADE_LABEL,
  type Contato,
  type Prioridade,
  type Tarefa,
  type TipoAtividade,
} from "@/lib/types";
import { cn, formatDate, initials } from "@/lib/utils";

const RESPONSAVEL_ATUAL = "Gabriel Pereira";

const TIPO_ICON: Record<TipoAtividade, LucideIcon> = {
  ligacao: Phone,
  email: Mail,
  reuniao: Video,
  nota: StickyNote,
  tarefa: CheckSquare,
};

const PRIO_BARRA: Record<Prioridade, string> = {
  alta: "bg-foreground",
  media: "bg-subtle",
  baixa: "bg-border",
};

type Filtro = "todas" | "minhas" | "alta";
const FILTROS: { id: Filtro; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "minhas", label: "Minhas" },
  { id: "alta", label: "Alta prioridade" },
];

function diasDeHoje(iso: string, hoje: Date) {
  const d = new Date(iso + "T00:00:00");
  return Math.round((d.getTime() - hoje.getTime()) / 86400000);
}

export default function TarefasPage() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [editando, setEditando] = useState<Tarefa | null>(null);

  const hoje = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  useEffect(() => {
    fetch("/api/tarefas", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { tarefas: [] }))
      .then(({ tarefas: lista }) => setTarefas(lista ?? []));
    fetch("/api/contatos", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { contatos: [] }))
      .then(({ contatos: lista }) => setContatos(lista ?? []));
  }, []);

  function getContato(id?: string) {
    return id ? contatos.find((c) => c.id === id) : undefined;
  }

  async function alternar(t: Tarefa) {
    const concluida = !t.concluida;
    setTarefas((prev) => prev.map((x) => (x.id === t.id ? { ...x, concluida } : x)));
    await fetch(`/api/tarefas/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concluida }),
    });
  }

  function aoCriar(tarefa: Tarefa) {
    setTarefas((prev) => [...prev, tarefa]);
  }

  function aoSalvarEdicao(tarefa: Tarefa) {
    setTarefas((prev) => prev.map((t) => (t.id === tarefa.id ? tarefa : t)));
  }

  async function excluir(tarefa: Tarefa) {
    if (!window.confirm(`Excluir "${tarefa.titulo}" permanentemente?`)) return;
    const res = await fetch(`/api/tarefas/${tarefa.id}`, { method: "DELETE" });
    if (!res.ok) return;
    setTarefas((prev) => prev.filter((t) => t.id !== tarefa.id));
  }

  const filtradas = useMemo(
    () =>
      tarefas.filter((t) => {
        if (filtro === "minhas") return t.responsavelId === RESPONSAVEL_ATUAL;
        if (filtro === "alta") return t.prioridade === "alta";
        return true;
      }),
    [tarefas, filtro]
  );

  const grupos = useMemo(() => {
    const g = {
      atrasadas: [] as Tarefa[],
      hoje: [] as Tarefa[],
      proximas: [] as Tarefa[],
      concluidas: [] as Tarefa[],
    };
    for (const t of filtradas) {
      if (t.concluida) g.concluidas.push(t);
      else {
        const d = diasDeHoje(t.vencimento, hoje);
        if (d < 0) g.atrasadas.push(t);
        else if (d === 0) g.hoje.push(t);
        else g.proximas.push(t);
      }
    }
    return g;
  }, [filtradas, hoje]);

  const atrasadas = grupos.atrasadas.length;
  const hojeCount = grupos.hoje.length;

  const SECOES: { key: keyof typeof grupos; label: string }[] = [
    { key: "atrasadas", label: "Atrasadas" },
    { key: "hoje", label: "Hoje" },
    { key: "proximas", label: "Próximas" },
    { key: "concluidas", label: "Concluídas" },
  ];

  return (
    <>
      <Topbar
        title="Tarefas & lembretes"
        description={`${atrasadas} atrasadas · ${hojeCount} para hoje`}
      />

      <div className="space-y-4 p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                aria-pressed={filtro === f.id}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  filtro === f.id
                    ? "bg-brand-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <NovaTarefaDialog contatos={contatos} onCriada={aoCriar} />
        </div>

        <div className="mx-auto max-w-3xl space-y-5">
          {SECOES.map((s) => {
            const itens = grupos[s.key];
            if (itens.length === 0) return null;
            return (
              <section key={s.key}>
                <div className="mb-2 flex items-center gap-2">
                  <h2 className="font-display text-sm font-semibold tracking-tight">
                    {s.label}
                  </h2>
                  <span className="tabular rounded-sm bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {itens.length}
                  </span>
                </div>
                <div className="overflow-hidden rounded-lg border border-border bg-card divide-y divide-border panel-sm">
                  {itens.map((t) => (
                    <TarefaRow
                      key={t.id}
                      tarefa={t}
                      contato={getContato(t.contatoId)}
                      hoje={hoje}
                      onToggle={() => alternar(t)}
                      onEditar={() => setEditando(t)}
                      onExcluir={() => excluir(t)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <EditarTarefaDialog
        tarefa={editando}
        contatos={contatos}
        onOpenChange={(open) => {
          if (!open) setEditando(null);
        }}
        onSalvo={aoSalvarEdicao}
      />
    </>
  );
}

function TarefaRow({
  tarefa: t,
  contato,
  hoje,
  onToggle,
  onEditar,
  onExcluir,
}: {
  tarefa: Tarefa;
  contato: Contato | undefined;
  hoje: Date;
  onToggle: () => void;
  onEditar: () => void;
  onExcluir: () => void;
}) {
  const Icon = TIPO_ICON[t.tipo];
  const atrasada = !t.concluida && diasDeHoje(t.vencimento, hoje) < 0;

  return (
    <div className="flex items-center gap-3 p-3">
      <span
        className={cn("h-8 w-0.5 shrink-0 rounded-full", PRIO_BARRA[t.prioridade])}
        aria-hidden
      />
      <button
        onClick={onToggle}
        aria-label={t.concluida ? "Reabrir tarefa" : "Concluir tarefa"}
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      >
        {t.concluida ? (
          <CheckCircle2 className="size-5 text-brand" />
        ) : (
          <Circle className="size-5" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-medium",
            t.concluida && "text-muted-foreground line-through"
          )}
        >
          {t.titulo}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Icon className="size-3" />
            {PRIORIDADE_LABEL[t.prioridade]}
          </span>
          {contato ? <span>· {contato.empresa}</span> : null}
          <span
            className={cn("tabular", atrasada && "font-semibold text-foreground")}
          >
            · {formatDate(t.vencimento)}
            {atrasada ? " · atrasada" : ""}
          </span>
        </div>
      </div>

      <Avatar className="size-7 shrink-0">
        <AvatarFallback className="text-[10px]">
          {initials(t.responsavelId)}
        </AvatarFallback>
      </Avatar>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Ações de ${t.titulo}`}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEditar}>Editar</DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={onExcluir}
          >
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
```

- [ ] **Step 4: Remover o mock não usado mais**

Run: `rm lib/tarefas-data.ts`

- [ ] **Step 5: Verificar tipos e lint**

Run: `npx tsc --noEmit && npm run lint`

Expected: sem erros novos (ignorar os 2 erros pré-existentes em `sidebar-context.tsx`/`stat-tile.tsx`).

- [ ] **Step 6: Testar no navegador**

1. Abra `/tarefas` — deve carregar vazia (ou com a tarefa de teste da Task 2, se ainda existir).
2. Crie uma tarefa vinculada a um contato real.
3. Marque como concluída, recarregue a página — deve continuar concluída.
4. Edite a tarefa (mude prioridade e vencimento).
5. Exclua a tarefa.

- [ ] **Step 7: Commit**

```bash
git add components/app/tarefas "app/(app)/tarefas/page.tsx"
git rm lib/tarefas-data.ts
git commit -m "feat: wire Tarefas page to real Supabase data"
```

---

### Task 5: Telas de Agenda

**Files:**
- Modify: `lib/agenda-data.ts`
- Modify: `components/app/agenda/week-view.tsx`
- Create: `components/app/agenda/novo-evento-dialog.tsx`
- Create: `components/app/agenda/editar-evento-dialog.tsx`
- Modify: `app/(app)/agenda/page.tsx`

**Interfaces:**
- Consumes: `GET/POST /api/eventos`, `PATCH/DELETE /api/eventos/[id]` (Task 3); `GET /api/contatos`.
- Produces: `WeekView` ganha `agoraHora: number` e `onSelecionar?: (evento: Evento) => void`.

- [ ] **Step 1: Substituir `lib/agenda-data.ts`**

```typescript
/** Tipos e constantes de exibição da agenda semanal (usados pelo WeekView). */

export type EventoTipo = "reuniao" | "call" | "tarefa" | "pessoal";

export interface Evento {
  id: string;
  titulo: string;
  dia: number; // 0 = segunda … 6 = domingo
  inicio: number; // hora decimal (ex.: 9.5 = 09:30)
  fim: number;
  tipo: EventoTipo;
  contatoId?: string;
  local?: string;
}

export const TIPO_LABEL: Record<EventoTipo, string> = {
  reuniao: "Reunião",
  call: "Ligação",
  tarefa: "Tarefa",
  pessoal: "Pessoal",
};

/** Faixa de horas exibida na grade. */
export const HORA_INICIO = 8;
export const HORA_FIM = 20;
```

- [ ] **Step 2: Editar `components/app/agenda/week-view.tsx`**

Trocar o import do topo:

```tsx
import {
  HORA_FIM,
  HORA_INICIO,
  TIPO_LABEL,
  type Evento,
  type EventoTipo,
} from "@/lib/agenda-data";
```

(remove `AGORA_HORA` do import).

Trocar a assinatura da função:

```tsx
export function WeekView({
  dias,
  eventos,
  showNow,
  agoraHora,
  onSelecionar,
}: {
  dias: DiaSemana[];
  eventos: Evento[];
  showNow: boolean;
  agoraHora: number;
  onSelecionar?: (evento: Evento) => void;
}) {
```

Trocar a linha "agora" (usa `agoraHora` em vez da constante):

```tsx
              {d.isToday && showNow ? (
                <div
                  style={{ top: (agoraHora - HORA_INICIO) * HORA_ALTURA }}
                  className="absolute inset-x-0 z-20 flex items-center"
                >
                  <span className="-ml-1 size-2 rounded-full bg-brand" />
                  <span className="h-px flex-1 bg-brand" />
                </div>
              ) : null}
```

E adicionar `onClick` no botão do evento:

```tsx
                    <button
                      key={e.id}
                      onClick={() => onSelecionar?.(e)}
                      style={{ top: top + 1, height: altura - 2 }}
                      className={cn(
                        "absolute inset-x-1 z-10 overflow-hidden rounded-md border p-1.5 text-left transition-colors hover:border-brand/50",
                        TIPO_CLASSE[e.tipo]
                      )}
                      title={`${TIPO_LABEL[e.tipo]} · ${fmtHora(e.inicio)}–${fmtHora(e.fim)}`}
                    >
```

- [ ] **Step 3: Criar `components/app/agenda/novo-evento-dialog.tsx`**

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
import { TIPO_LABEL, type EventoTipo } from "@/lib/agenda-data";
import type { Contato, EventoAgenda } from "@/lib/types";

const TIPOS: EventoTipo[] = ["reuniao", "call", "tarefa", "pessoal"];

function paraDataHora(data: string, hora: string): string {
  return new Date(`${data}T${hora}:00`).toISOString();
}

function hojeISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function NovoEventoDialog({
  open,
  onOpenChange,
  contatos,
  diaSelecionado,
  onCriado,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contatos: Contato[];
  diaSelecionado: Date;
  onCriado: (evento: EventoAgenda) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFim, setHoraFim] = useState("10:00");
  const [tipo, setTipo] = useState<EventoTipo>("reuniao");
  const [local, setLocal] = useState("");
  const [contatoId, setContatoId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reseta o formulário toda vez que o diálogo abre
      setTitulo("");
      setData(hojeISO(diaSelecionado));
      setHoraInicio("09:00");
      setHoraFim("10:00");
      setTipo("reuniao");
      setLocal("");
      setContatoId("");
      setErro(null);
    }
  }, [open, diaSelecionado]);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const inicio = paraDataHora(data, horaInicio);
    const fim = paraDataHora(data, horaFim);
    if (new Date(fim).getTime() <= new Date(inicio).getTime()) {
      setErro("O fim precisa ser depois do início.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch("/api/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          inicio,
          fim,
          tipo,
          local,
          contatoId: contatoId || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const { evento } = await res.json();
      onCriado(evento);
      onOpenChange(false);
    } catch {
      setErro("Não foi possível salvar o evento. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo evento</DialogTitle>
          <DialogDescription>Cadastre uma reunião ou compromisso.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={salvar}>
          <div className="grid gap-1.5">
            <Label htmlFor="evento-titulo">Título</Label>
            <Input
              id="evento-titulo"
              placeholder="Ex: Demo com cliente"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="evento-data">Data</Label>
              <Input
                id="evento-data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="evento-inicio">Início</Label>
              <Input
                id="evento-inicio"
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="evento-fim">Fim</Label>
              <Input
                id="evento-fim"
                type="time"
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="evento-tipo">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as EventoTipo)}>
                <SelectTrigger id="evento-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TIPO_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="evento-local">Local (opcional)</Label>
              <Input
                id="evento-local"
                value={local}
                onChange={(e) => setLocal(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="evento-contato">Contato (opcional)</Label>
            <Select
              value={contatoId || "none"}
              onValueChange={(v) => setContatoId(v === "none" ? "" : v)}
            >
              <SelectTrigger id="evento-contato">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum contato</SelectItem>
                {contatos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" variant="brand" disabled={enviando}>
              {enviando ? "Salvando…" : "Salvar evento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Criar `components/app/agenda/editar-evento-dialog.tsx`**

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
import { TIPO_LABEL, type EventoTipo } from "@/lib/agenda-data";
import type { Contato, EventoAgenda } from "@/lib/types";

const TIPOS: EventoTipo[] = ["reuniao", "call", "tarefa", "pessoal"];

function paraData(iso: string): string {
  return iso.slice(0, 10);
}
function paraHora(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function paraDataHora(data: string, hora: string): string {
  return new Date(`${data}T${hora}:00`).toISOString();
}

export function EditarEventoDialog({
  evento,
  contatos,
  onOpenChange,
  onSalvo,
  onExcluido,
}: {
  evento: EventoAgenda | null;
  contatos: Contato[];
  onOpenChange: (open: boolean) => void;
  onSalvo: (evento: EventoAgenda) => void;
  onExcluido: (id: string) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [tipo, setTipo] = useState<EventoTipo>("reuniao");
  const [local, setLocal] = useState("");
  const [contatoId, setContatoId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (evento) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preenche o formulário quando o evento selecionado muda
      setTitulo(evento.titulo);
      setData(paraData(evento.inicio));
      setHoraInicio(paraHora(evento.inicio));
      setHoraFim(paraHora(evento.fim));
      setTipo(evento.tipo);
      setLocal(evento.local);
      setContatoId(evento.contatoId ?? "");
      setErro(null);
    }
  }, [evento]);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!evento) return;
    const inicio = paraDataHora(data, horaInicio);
    const fim = paraDataHora(data, horaFim);
    if (new Date(fim).getTime() <= new Date(inicio).getTime()) {
      setErro("O fim precisa ser depois do início.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/eventos/${evento.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          inicio,
          fim,
          tipo,
          local,
          contatoId: contatoId || null,
        }),
      });
      if (!res.ok) throw new Error();
      const { evento: atualizado } = await res.json();
      onSalvo(atualizado);
      onOpenChange(false);
    } catch {
      setErro("Não foi possível salvar as alterações. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  async function excluir() {
    if (!evento) return;
    if (!window.confirm(`Excluir "${evento.titulo}" permanentemente?`)) return;
    const res = await fetch(`/api/eventos/${evento.id}`, { method: "DELETE" });
    if (!res.ok) return;
    onExcluido(evento.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={evento !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar evento</DialogTitle>
          <DialogDescription>Atualize os dados de {evento?.titulo}.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={salvar}>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-evento-titulo">Título</Label>
            <Input
              id="edit-evento-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-evento-data">Data</Label>
              <Input
                id="edit-evento-data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-evento-inicio">Início</Label>
              <Input
                id="edit-evento-inicio"
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-evento-fim">Fim</Label>
              <Input
                id="edit-evento-fim"
                type="time"
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-evento-tipo">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as EventoTipo)}>
                <SelectTrigger id="edit-evento-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TIPO_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-evento-local">Local (opcional)</Label>
              <Input
                id="edit-evento-local"
                value={local}
                onChange={(e) => setLocal(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-evento-contato">Contato (opcional)</Label>
            <Select
              value={contatoId || "none"}
              onValueChange={(v) => setContatoId(v === "none" ? "" : v)}
            >
              <SelectTrigger id="edit-evento-contato">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum contato</SelectItem>
                {contatos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
          <DialogFooter>
            <div className="flex w-full items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={excluir}
              >
                Excluir
              </Button>
              <div className="flex gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit" variant="brand" disabled={enviando}>
                  {enviando ? "Salvando…" : "Salvar alterações"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: Substituir `app/(app)/agenda/page.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarClock,
  Video,
  Phone,
  CheckSquare,
  User,
  type LucideIcon,
} from "lucide-react";

import { Topbar } from "@/components/app/topbar";
import { Button } from "@/components/ui/button";
import { WeekView, type DiaSemana } from "@/components/app/agenda/week-view";
import { MiniMonth } from "@/components/app/agenda/mini-month";
import { NovoEventoDialog } from "@/components/app/agenda/novo-evento-dialog";
import { EditarEventoDialog } from "@/components/app/agenda/editar-evento-dialog";
import { TIPO_LABEL, type Evento, type EventoTipo } from "@/lib/agenda-data";
import type { Contato, EventoAgenda } from "@/lib/types";
import { cn } from "@/lib/utils";

const LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const TIPO_ICON: Record<EventoTipo, LucideIcon> = {
  reuniao: Video,
  call: Phone,
  tarefa: CheckSquare,
  pessoal: User,
};

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function mondayOf(d: Date) {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function paraEventoSemana(ev: EventoAgenda, weekDates: Date[]): Evento | null {
  const inicio = new Date(ev.inicio);
  const fim = new Date(ev.fim);
  const diaIndex = weekDates.findIndex((d) => sameDay(d, inicio));
  if (diaIndex === -1) return null;
  return {
    id: ev.id,
    titulo: ev.titulo,
    dia: diaIndex,
    inicio: inicio.getHours() + inicio.getMinutes() / 60,
    fim: fim.getHours() + fim.getMinutes() / 60,
    tipo: ev.tipo,
    contatoId: ev.contatoId,
    local: ev.local,
  };
}

export default function AgendaPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [novoAberto, setNovoAberto] = useState(false);
  const [editando, setEditando] = useState<EventoAgenda | null>(null);

  const hoje = useMemo(() => new Date(), []);

  useEffect(() => {
    fetch("/api/eventos", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { eventos: [] }))
      .then(({ eventos: lista }) => setEventos(lista ?? []));
    fetch("/api/contatos", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { contatos: [] }))
      .then(({ contatos: lista }) => setContatos(lista ?? []));
  }, []);

  function aoCriar(evento: EventoAgenda) {
    setEventos((prev) => [...prev, evento]);
  }

  function aoSalvarEdicao(evento: EventoAgenda) {
    setEventos((prev) => prev.map((e) => (e.id === evento.id ? evento : e)));
  }

  const baseMonday = mondayOf(hoje);
  const monday = addDays(baseMonday, weekOffset * 7);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const dias: DiaSemana[] = weekDates.map((dt, i) => ({
    label: LABELS[i],
    num: dt.getDate(),
    isToday: sameDay(dt, hoje),
  }));

  const eventosSemana = eventos
    .map((e) => paraEventoSemana(e, weekDates))
    .filter((e): e is Evento => e !== null);

  const agoraHora = hoje.getHours() + hoje.getMinutes() / 60;
  const mostrarAgora = weekDates.some((d) => sameDay(d, hoje));

  const mesRaw = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(monday);
  const mesLabel = mesRaw.charAt(0).toUpperCase() + mesRaw.slice(1);

  const proximos = [...eventos]
    .filter((e) => new Date(e.inicio).getTime() >= hoje.getTime())
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
    .slice(0, 5);

  function selecionarEvento(evView: Evento) {
    const original = eventos.find((e) => e.id === evView.id);
    if (original) setEditando(original);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Topbar title="Agenda" description="Reuniões e compromissos" />

      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-elevated px-3 py-2">
          <CalendarClock className="size-4 shrink-0 text-brand" />
          <p className="text-xs text-muted-foreground">Agenda nativa do CRM.</p>
          <Link
            href="/configuracoes/integracoes"
            className="text-xs font-medium text-brand hover:underline"
          >
            Conectar Google Agenda
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md border border-border">
              <button
                onClick={() => setWeekOffset((w) => w - 1)}
                aria-label="Semana anterior"
                className="flex size-8 items-center justify-center rounded-l-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={() => setWeekOffset((w) => w + 1)}
                aria-label="Próxima semana"
                className="flex size-8 items-center justify-center rounded-r-md border-l border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
              Hoje
            </Button>
            <h2 className="font-display text-sm font-semibold tracking-tight">
              {mesLabel}
            </h2>
          </div>
          <Button
            variant="brand"
            size="sm"
            className="gap-1.5"
            onClick={() => setNovoAberto(true)}
          >
            <Plus className="size-4" />
            Novo evento
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 gap-4">
          <WeekView
            dias={dias}
            eventos={eventosSemana}
            showNow={mostrarAgora}
            agoraHora={agoraHora}
            onSelecionar={selecionarEvento}
          />

          <aside className="hidden w-72 shrink-0 space-y-4 overflow-y-auto xl:block">
            <div className="rounded-lg border border-border bg-card p-3 panel-sm">
              <MiniMonth viewDate={monday} weekDates={weekDates} today={hoje} />
            </div>

            <div className="rounded-lg border border-border bg-card panel-sm">
              <header className="border-b border-border p-3">
                <h3 className="font-display text-sm font-medium tracking-tight">
                  Próximos compromissos
                </h3>
              </header>
              <ul className="divide-y divide-border">
                {proximos.map((e) => {
                  const Icon = TIPO_ICON[e.tipo];
                  const dt = new Date(e.inicio);
                  return (
                    <li key={e.id} className="flex gap-2.5 p-3">
                      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-elevated">
                        <Icon className="size-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{e.titulo}</p>
                        <p className="text-xs text-muted-foreground">
                          {dt.toLocaleDateString("pt-BR", {
                            weekday: "short",
                            day: "numeric",
                          })}{" "}
                          ·{" "}
                          {dt.toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </li>
                  );
                })}
                {proximos.length === 0 ? (
                  <li className="p-3 text-xs text-muted-foreground">
                    Nenhum compromisso futuro.
                  </li>
                ) : null}
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-card p-3 panel-sm">
              <h3 className="mb-2.5 font-display text-sm font-medium tracking-tight">
                Tipos
              </h3>
              <ul className="space-y-2">
                {(Object.keys(TIPO_LABEL) as EventoTipo[]).map((t) => {
                  const Icon = TIPO_ICON[t];
                  return (
                    <li
                      key={t}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <span
                        className={cn(
                          "flex size-5 items-center justify-center rounded-sm border",
                          t === "reuniao" && "border-l-2 border-l-brand border-border",
                          t === "call" && "border-l-2 border-l-subtle border-border",
                          t === "tarefa" && "border-dashed border-border",
                          t === "pessoal" && "border-border bg-muted"
                        )}
                      >
                        <Icon className="size-3" />
                      </span>
                      {TIPO_LABEL[t]}
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      </div>

      <NovoEventoDialog
        open={novoAberto}
        onOpenChange={setNovoAberto}
        contatos={contatos}
        diaSelecionado={monday}
        onCriado={aoCriar}
      />

      <EditarEventoDialog
        evento={editando}
        contatos={contatos}
        onOpenChange={(open) => {
          if (!open) setEditando(null);
        }}
        onSalvo={aoSalvarEdicao}
        onExcluido={(id) => setEventos((prev) => prev.filter((e) => e.id !== id))}
      />
    </div>
  );
}
```

- [ ] **Step 6: Verificar tipos e lint**

Run: `npx tsc --noEmit && npm run lint`

Expected: sem erros novos.

- [ ] **Step 7: Testar no navegador**

1. Abra `/agenda` — grade deve carregar vazia (ou com o Evento Teste da Task 3, se ainda existir).
2. Clique em "Novo evento", crie um evento hoje às 14h–15h — deve aparecer na grade na posição certa.
3. Navegue para a semana seguinte e volte com "Hoje" — confirme que o evento só aparece na semana correta.
4. Clique no bloco do evento — deve abrir "Editar evento" pré-preenchido.
5. Mude o horário e salve — o bloco deve se mover na grade.
6. Clique em "Excluir" dentro do diálogo de edição — o bloco deve sumir.
7. Recarregue a página e confirme que tudo persistiu (exceto o excluído).

- [ ] **Step 8: Commit**

```bash
git add lib/agenda-data.ts components/app/agenda "app/(app)/agenda/page.tsx"
git commit -m "feat: wire Agenda page to real Supabase events with week grid"
```

---

### Task 6: Verificação final

**Files:** nenhum arquivo novo — só verificação manual do fluxo completo.

- [ ] **Step 1: Fluxo completo — Tarefas**

Criar, concluir/reabrir, editar e excluir uma tarefa vinculada a um contato real.

- [ ] **Step 2: Fluxo completo — Agenda**

Criar um evento na semana atual, navegar semanas, editar (via clique no bloco), excluir.

- [ ] **Step 3: Revisão final**

Run: `npx tsc --noEmit && npm run lint`

Expected: sem erros novos (os 2 erros pré-existentes em `sidebar-context.tsx`/`stat-tile.tsx` continuam).

- [ ] **Step 4: Confirmar que `lib/mock-data.ts` continua intacto**

Run: `git diff --stat lib/mock-data.ts`

Expected: sem saída.
