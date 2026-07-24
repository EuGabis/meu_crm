# Inbox↔Contatos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vincular conversas do WhatsApp a contatos reais — auto-criar contato em mensagens novas, backfill retroativo, troca manual, e painel lateral do Inbox com contato/negócios reais e "Criar negócio" funcionando.

**Architecture:** `whatsapp_conversations` ganha `contact_id` (nullable, `on delete set null`). Helper compartilhado `resolveOrCreateContact` (match de telefone por sufixo de dígitos, senão cria) usado pelo webhook e por uma rota de backfill idempotente. O painel lateral do Inbox troca o mock por dados reais e reusa o `NovoNegocioDialog`.

**Tech Stack:** os mesmos de sempre (Next.js 16, Supabase via service_role, sem novas dependências).

## Global Constraints

- Repositório: `c:\Users\Gabriel\Documents\meu_crm`. Verificação manual.
- Origem nova `"whatsapp"` entra no tipo `Origem` e no `ORIGEM_LABEL` (`lib/types.ts`).
- Match de telefone: comparar apenas dígitos, por sufixo, exigindo no mínimo 8 dígitos coincidentes (evita falso-positivo em números curtos).
- "Agendar reunião" no painel do Inbox continua decorativo — fora do escopo.
- `lib/mock-data.ts` continua intocado (Painel/Relatórios/etc. ainda o usam) — apenas `contact-panel.tsx` deixa de importá-lo.
- Projeto Supabase: ref `qhrnnunkjlhipispkusy`.

---

### Task 1: Schema, origem "whatsapp" e helper de vinculação

**Files:**
- Modify: `lib/types.ts`
- Create: `lib/whatsapp/contact-link.ts`
- Modify: `lib/whatsapp/mapper.ts`

**Interfaces:**
- Produces: `resolveOrCreateContact(supabase: SupabaseClient, phoneNumber: string, displayName: string | null): Promise<string>` (retorna o contact_id) — usado pelas Tasks 2 e 3. `DbConversationRow` ganha `contact_id: string | null`; `mapConversationRow` passa `contatoId` real.

- [ ] **Step 1: Alterar a tabela no Supabase (manual — feito por você no dashboard)**

Abra `https://supabase.com/dashboard/project/qhrnnunkjlhipispkusy/sql/new` e rode:

```sql
alter table whatsapp_conversations
  add column contact_id uuid references contacts(id) on delete set null;
```

- [ ] **Step 2: Verificar a coluna**

```bash
curl -s "https://qhrnnunkjlhipispkusy.supabase.co/rest/v1/whatsapp_conversations?select=id,contact_id&limit=1" \
  -H "apikey: <service_role_key>" -H "Authorization: Bearer <service_role_key>"
```

Expected: 200 com `contact_id` presente (null) nas linhas existentes.

- [ ] **Step 3: Adicionar a origem `whatsapp` em `lib/types.ts`**

No tipo `Origem`, adicionar `| "whatsapp"` (antes de `| "outro"`):

```typescript
export type Origem =
  | "site"
  | "indicacao"
  | "anuncio"
  | "evento"
  | "outbound"
  | "whatsapp"
  | "outro";
```

E em `ORIGEM_LABEL`, adicionar a entrada:

```typescript
export const ORIGEM_LABEL: Record<Origem, string> = {
  site: "Site",
  indicacao: "Indicação",
  anuncio: "Anúncio",
  evento: "Evento",
  outbound: "Outbound",
  whatsapp: "WhatsApp",
  outro: "Outro",
};
```

- [ ] **Step 4: Criar `lib/whatsapp/contact-link.ts`**

```typescript
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const MIN_DIGITOS = 8;

function apenasDigitos(s: string): string {
  return s.replace(/\D/g, "");
}

function telefonesBatem(a: string, b: string): boolean {
  const da = apenasDigitos(a);
  const db = apenasDigitos(b);
  if (da.length < MIN_DIGITOS || db.length < MIN_DIGITOS) return false;
  return da.endsWith(db) || db.endsWith(da);
}

/**
 * Encontra um contato cujo telefone bata com o número do WhatsApp
 * (comparação por sufixo de dígitos), ou cria um contato novo.
 * Retorna o id do contato.
 */
export async function resolveOrCreateContact(
  supabase: SupabaseClient,
  phoneNumber: string,
  displayName: string | null
): Promise<string> {
  const { data: candidatos, error: buscaError } = await supabase
    .from("contacts")
    .select("id, telefone")
    .order("criado_em", { ascending: true });

  if (buscaError) throw buscaError;

  const existente = (candidatos ?? []).find((c) =>
    telefonesBatem(c.telefone, phoneNumber)
  );
  if (existente) return existente.id;

  const { data: novo, error: criaError } = await supabase
    .from("contacts")
    .insert({
      nome: displayName?.trim() || phoneNumber,
      email: "",
      telefone: phoneNumber,
      origem: "whatsapp",
    })
    .select("id")
    .single();

  if (criaError) throw criaError;
  return novo.id;
}
```

Nota: `email` é `not null` na tabela `contacts` — string vazia é aceita. A rota `POST /api/contatos` continua exigindo e-mail no formulário; só a criação automática usa vazio.

- [ ] **Step 5: Atualizar `lib/whatsapp/mapper.ts`**

Em `DbConversationRow`, adicionar o campo:

```typescript
  contact_id: string | null;
```

E em `mapConversationRow`, trocar `contatoId: "",` por:

```typescript
    contatoId: row.contact_id ?? "",
```

- [ ] **Step 6: Verificar tipos**

Run: `npx tsc --noEmit`

Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add lib/types.ts lib/whatsapp/contact-link.ts lib/whatsapp/mapper.ts
git commit -m "feat: add contact linking helper and whatsapp contact origin"
```

---

### Task 2: Webhook auto-vincula + PATCH aceita contatoId + backfill

**Files:**
- Modify: `app/api/whatsapp/webhook/route.ts`
- Modify: `app/api/whatsapp/conversas/[id]/route.ts`
- Create: `app/api/whatsapp/conversas/backfill-contatos/route.ts`

**Interfaces:**
- Consumes: `resolveOrCreateContact` (Task 1).
- Produces: `POST /api/whatsapp/conversas/backfill-contatos` → `{ processadas: number }`; `PATCH /api/whatsapp/conversas/[id]` aceita `contatoId: string`.

- [ ] **Step 1: Editar `app/api/whatsapp/webhook/route.ts`**

Adicionar o import:

```typescript
import { resolveOrCreateContact } from "@/lib/whatsapp/contact-link";
```

Em `handleMessagesUpsert`, logo depois do bloco que incrementa `unread_count` (e antes do upsert da mensagem), adicionar:

```typescript
  if (!conversation.contact_id) {
    try {
      const contactId = await resolveOrCreateContact(
        supabase,
        phoneNumber,
        pushName
      );
      await supabase
        .from("whatsapp_conversations")
        .update({ contact_id: contactId })
        .eq("id", conversation.id);
    } catch (error) {
      console.error("[whatsapp/webhook] vínculo de contato falhou", error);
      // não bloqueia a gravação da mensagem
    }
  }
```

- [ ] **Step 2: Editar `app/api/whatsapp/conversas/[id]/route.ts`**

No `PATCH`, junto das outras condições do `update`, adicionar:

```typescript
  if (typeof body.contatoId === "string" && body.contatoId) {
    update.contact_id = body.contatoId;
  }
```

- [ ] **Step 3: Criar `app/api/whatsapp/conversas/backfill-contatos/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveOrCreateContact } from "@/lib/whatsapp/contact-link";

export async function POST() {
  const supabase = createSupabaseServerClient();
  const { data: conversas, error } = await supabase
    .from("whatsapp_conversations")
    .select("id, phone_number, display_name")
    .is("contact_id", null);

  if (error) {
    console.error("[backfill-contatos]", error);
    return NextResponse.json(
      { error: "Não foi possível carregar as conversas." },
      { status: 500 }
    );
  }

  let processadas = 0;
  for (const conversa of conversas ?? []) {
    try {
      const contactId = await resolveOrCreateContact(
        supabase,
        conversa.phone_number,
        conversa.display_name
      );
      await supabase
        .from("whatsapp_conversations")
        .update({ contact_id: contactId })
        .eq("id", conversa.id);
      processadas++;
    } catch (err) {
      console.error("[backfill-contatos] conversa", conversa.id, err);
    }
  }

  return NextResponse.json({ processadas });
}
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`

Expected: sem erros.

- [ ] **Step 5: Testar o backfill local (dev server rodando)**

```bash
curl -s -X POST "http://localhost:3000/api/whatsapp/conversas/backfill-contatos"
```

Expected: `{"processadas":N}` (N = quantidade de conversas sem contato — a de produção "Você" só existe em produção; local pode ser 0).

Rodar de novo → `{"processadas":0}` (idempotente).

- [ ] **Step 6: Commit**

```bash
git add app/api/whatsapp
git commit -m "feat: auto-link WhatsApp conversations to contacts with backfill"
```

---

### Task 3: Painel lateral do Inbox com dados reais

**Files:**
- Modify: `components/app/inbox/contact-panel.tsx`
- Modify: `app/(app)/inbox/page.tsx`

**Interfaces:**
- Consumes: `GET /api/contatos`, `GET /api/negocios`, `PATCH /api/whatsapp/conversas/[id]` (`contatoId`), `NovoNegocioDialog` (já existente).
- Produces: `<ContactPanel conversa contatos negocios onTrocarContato={(contatoId: string) => void} onNegocioCriado={(negocio: Negocio) => void} />`.

- [ ] **Step 1: Substituir `components/app/inbox/contact-panel.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mail,
  Phone,
  Building2,
  ExternalLink,
  Plus,
  CalendarPlus,
  ArrowLeftRight,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NovoNegocioDialog } from "@/components/app/negocios/novo-negocio-dialog";
import {
  CONTATO_STATUS_LABEL,
  STAGES,
  type Contato,
  type Conversa,
  type Negocio,
} from "@/lib/types";
import { cn, formatBRL, initials } from "@/lib/utils";

export function ContactPanel({
  conversa,
  contatos,
  negocios,
  onTrocarContato,
  onNegocioCriado,
  className,
}: {
  conversa: Conversa;
  contatos: Contato[];
  negocios: Negocio[];
  onTrocarContato: (contatoId: string) => void;
  onNegocioCriado: (negocio: Negocio) => void;
  className?: string;
}) {
  const [negocioAberto, setNegocioAberto] = useState(false);
  const [trocando, setTrocando] = useState(false);

  const contato = conversa.contatoId
    ? contatos.find((c) => c.id === conversa.contatoId)
    : undefined;
  const negociosDoContato = contato
    ? negocios.filter((n) => n.contatoId === contato.id)
    : [];

  return (
    <aside className={cn("flex min-h-0 flex-col overflow-y-auto bg-surface", className)}>
      <div className="flex flex-col items-center gap-2 border-b border-border p-5 text-center">
        <Avatar className="size-16 text-lg">
          <AvatarFallback>{initials(contato?.nome ?? conversa.nome)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-display font-semibold tracking-tight">
            {contato?.nome ?? conversa.nome}
          </p>
          {contato && (contato.cargo || contato.empresa) ? (
            <p className="text-xs text-muted-foreground">
              {[contato.cargo, contato.empresa].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
        {contato ? (
          <Badge variant="outline">{CONTATO_STATUS_LABEL[contato.status]}</Badge>
        ) : null}
      </div>

      {/* Dados */}
      <div className="space-y-2.5 border-b border-border p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Dados
        </p>
        <InfoRow icon={<Phone className="size-4" />} texto={conversa.telefone} />
        {contato?.email ? (
          <InfoRow icon={<Mail className="size-4" />} texto={contato.email} />
        ) : null}
        {contato?.empresa ? (
          <InfoRow icon={<Building2 className="size-4" />} texto={contato.empresa} />
        ) : null}
      </div>

      {/* Negócios */}
      <div className="space-y-2.5 border-b border-border p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Negócios ({negociosDoContato.length})
        </p>
        {negociosDoContato.length > 0 ? (
          negociosDoContato.map((n) => {
            const stage = STAGES.find((s) => s.id === n.stage)!;
            return (
              <div
                key={n.id}
                className="rounded-md border border-border bg-elevated p-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{n.titulo}</p>
                  <span className="tabular shrink-0 text-sm font-medium">
                    {formatBRL(n.valor)}
                  </span>
                </div>
                <div className="mt-1.5">
                  <Badge variant={stage.variant}>{stage.label}</Badge>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-xs text-muted-foreground">Nenhum negócio vinculado.</p>
        )}
      </div>

      {/* Ações */}
      <div className="space-y-2 p-4">
        {contato ? (
          <Button variant="outline" className="w-full justify-start gap-2" asChild>
            <Link href="/contatos">
              <ExternalLink className="size-4" />
              Ver contato completo
            </Link>
          </Button>
        ) : null}
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          disabled={!contato}
          onClick={() => setNegocioAberto(true)}
        >
          <Plus className="size-4" />
          Criar negócio
        </Button>
        <Button variant="outline" className="w-full justify-start gap-2" disabled>
          <CalendarPlus className="size-4" />
          Agendar reunião
        </Button>

        {trocando ? (
          <Select
            value={contato?.id ?? ""}
            onValueChange={(v) => {
              onTrocarContato(v);
              setTrocando(false);
            }}
          >
            <SelectTrigger aria-label="Escolher contato">
              <SelectValue placeholder="Escolha um contato" />
            </SelectTrigger>
            <SelectContent>
              {contatos.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome} — {c.telefone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <button
            onClick={() => setTrocando(true)}
            className="flex w-full items-center gap-1.5 px-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftRight className="size-3" />
            Trocar contato vinculado
          </button>
        )}
      </div>

      {contato ? (
        <NovoNegocioDialog
          open={negocioAberto}
          onOpenChange={setNegocioAberto}
          contatos={contatos}
          contatoFixo={contato}
          onCriado={onNegocioCriado}
        />
      ) : null}
    </aside>
  );
}

function InfoRow({ icon, texto }: { icon: React.ReactNode; texto: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <span className="text-subtle">{icon}</span>
      <span className="min-w-0 truncate">{texto}</span>
    </div>
  );
}
```

- [ ] **Step 2: Editar `app/(app)/inbox/page.tsx`**

Adicionar aos imports:

```tsx
import type { Contato, Conversa, Negocio } from "@/lib/types";
```

(substituindo o import atual de `Conversa`).

Adicionar os estados, junto de `conversas`:

```tsx
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [negocios, setNegocios] = useState<Negocio[]>([]);
```

No `carregar` (dentro do `useCallback`), buscar também contatos e negócios:

```tsx
  const carregar = useCallback(async () => {
    const [resConversas, resContatos, resNegocios] = await Promise.all([
      fetch("/api/whatsapp/conversas", { cache: "no-store" }),
      fetch("/api/contatos", { cache: "no-store" }),
      fetch("/api/negocios", { cache: "no-store" }),
    ]);
    if (resConversas.ok) {
      const { conversas: novas } = (await resConversas.json()) as {
        conversas: Conversa[];
      };
      setConversas(novas);
      setSelId((atual) => atual ?? novas[0]?.id ?? null);
    }
    if (resContatos.ok) {
      const { contatos: lista } = await resContatos.json();
      setContatos(lista ?? []);
    }
    if (resNegocios.ok) {
      const { negocios: lista } = await resNegocios.json();
      setNegocios(lista ?? []);
    }
  }, []);
```

Adicionar as funções, junto de `assumir`:

```tsx
  async function trocarContato(contatoId: string) {
    if (!selId) return;
    setConversas((prev) =>
      prev.map((c) => (c.id === selId ? { ...c, contatoId } : c))
    );
    await fetch(`/api/whatsapp/conversas/${selId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contatoId }),
    });
  }

  function aoNegocioCriado(negocio: Negocio) {
    setNegocios((prev) => [...prev, negocio]);
  }
```

E trocar o `<ContactPanel ... />` por:

```tsx
        <ContactPanel
          conversa={sel}
          contatos={contatos}
          negocios={negocios}
          onTrocarContato={trocarContato}
          onNegocioCriado={aoNegocioCriado}
          className="hidden w-80 shrink-0 border-l border-border xl:flex"
        />
```

- [ ] **Step 3: Verificar tipos e lint**

Run: `npx tsc --noEmit && npm run lint`

Expected: sem erros novos.

- [ ] **Step 4: Testar no navegador (local)**

1. Criar um contato de teste e simular uma mensagem via webhook `curl` (mesmo payload da spec do WhatsApp, com telefone que bata com o contato) — a conversa deve vincular ao contato existente sem criar duplicado.
2. Simular mensagem de um telefone novo → contato deve ser auto-criado (conferir em `/contatos`, origem "WhatsApp").
3. No Inbox, painel lateral mostra nome/empresa/status reais do contato.
4. "Criar negócio" → diálogo abre com contato travado → salvar → aparece no Pipeline.
5. "Trocar contato vinculado" → escolher outro contato → painel atualiza e persiste após reload.

- [ ] **Step 5: Commit**

```bash
git add components/app/inbox/contact-panel.tsx "app/(app)/inbox/page.tsx"
git commit -m "feat: show real linked contact in Inbox panel with working Criar negócio"
```

---

### Task 4: Deploy e backfill em produção

**Files:** nenhum — deploy e verificação.

- [ ] **Step 1: Push (deploy automático via GitHub→Vercel)**

```bash
git push origin main
```

- [ ] **Step 2: Rodar o backfill em produção (após o deploy ficar READY)**

```bash
curl -s -X POST "https://meu-crm-plum.vercel.app/api/whatsapp/conversas/backfill-contatos"
```

Expected: `{"processadas":1}` (a conversa real existente).

- [ ] **Step 3: Verificar em produção**

1. Abrir `meu-crm-plum.vercel.app/inbox` — painel lateral da conversa existente deve mostrar o contato auto-criado.
2. Abrir `/contatos` — o contato novo deve estar lá com origem "WhatsApp".
3. "Criar negócio" pelo painel → conferir no `/pipeline`.
