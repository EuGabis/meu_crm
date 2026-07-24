# Integração WhatsApp (Evolution API) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o card mockado de WhatsApp em Configurações → Integrações por um fluxo real de conexão (QR code) via Evolution API, e substituir o Inbox mockado por conversas/mensagens reais persistidas no Supabase, recebidas via webhook e enviadas via Evolution API.

**Architecture:** Toda chamada à Evolution API e ao Supabase acontece só em Route Handlers do Next.js (`app/api/whatsapp/**`) ou em libs `server-only`. O browser só fala com nossas próprias rotas. Sem Supabase Realtime nesta fase — o Inbox faz polling (~4s) numa rota nossa que usa a `service_role` key por trás. Ver spec completo: `docs/superpowers/specs/2026-07-24-evolution-whatsapp-integration-design.md`.

**Tech Stack:** Next.js 16 (App Router) + TypeScript + Tailwind v4 (stack já existente) + `@supabase/supabase-js` (novo) + Evolution API v2 (self-hosted, já rodando).

## Global Constraints

- Repositório: `c:\Users\Gabriel\Documents\meu_crm`. Sem framework de testes automatizados — verificação é manual (curl / navegador), conforme aprovado no spec.
- Segredos só em `.env.local` (já no `.gitignore`, nunca commitar). Nunca usar prefixo `NEXT_PUBLIC_` para a `service_role` key ou para `EVOLUTION_API_KEY`.
- Toda chamada à Evolution API e ao Supabase com `service_role` roda em `app/api/**/route.ts` ou em arquivos `lib/**` marcados `import "server-only"` — nunca em componentes `"use client"`.
- Reusar primitivas de UI existentes (`components/ui/button.tsx`, `badge.tsx`, `dialog.tsx`) — não introduzir nova lib de UI.
- Instância Evolution API: nome `Teste`, URL `https://expensiveportuguesemanowar-evolution.cloudfy.live`. MVP cobre só texto (sem mídia), só mensagens novas (sem backfill do histórico), uma única instância.
- Projeto Supabase: ref `qhrnnunkjlhipispkusy`, URL `https://qhrnnunkjlhipispkusy.supabase.co`.
- O webhook existente na instância `Teste` (apontando para `solution-atendimento.vercel.app`, hoje desabilitado) será sobrescrito — usuário confirmou que não está mais em uso.
- Comandos de verificação usam `curl` via Git Bash (ambiente Windows).

---

### Task 1: Dependências, variáveis de ambiente e schema no Supabase

**Files:**
- Modify: `package.json` (via `npm install`)
- Create: `.env.local`
- Create: `.env.example`
- Create: `lib/supabase/server.ts`

**Interfaces:**
- Produces: `createSupabaseServerClient(): SupabaseClient` — usado por todas as rotas das próximas tasks.

- [ ] **Step 1: Instalar dependências**

Run: `npm install @supabase/supabase-js server-only`

Expected: `package.json` e `package-lock.json` atualizados, sem erros.

- [ ] **Step 2: Gerar o segredo do webhook**

Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Guarde o valor impresso — vai virar `EVOLUTION_WEBHOOK_SECRET` no passo seguinte.

- [ ] **Step 3: Criar `.env.local`**

```
EVOLUTION_API_URL=https://expensiveportuguesemanowar-evolution.cloudfy.live
EVOLUTION_API_KEY=3899AD688746-4E4C-9CC6-2EB1335BFC22
EVOLUTION_INSTANCE_NAME=Teste
EVOLUTION_WEBHOOK_SECRET=<valor gerado no Step 2>

SUPABASE_URL=https://qhrnnunkjlhipispkusy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key fornecida pelo usuário>
NEXT_PUBLIC_SUPABASE_URL=https://qhrnnunkjlhipispkusy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key fornecida pelo usuário>

APP_URL=
```

(`APP_URL` fica vazio por enquanto — só é preenchido se for testar localmente com um túnel tipo ngrok; em produção na Vercel o código usa `VERCEL_URL` automaticamente, ver Task 3.)

- [ ] **Step 4: Criar `.env.example`** (este arquivo é commitado, sem valores reais)

```
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE_NAME=
EVOLUTION_WEBHOOK_SECRET=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

APP_URL=
```

- [ ] **Step 5: Criar o schema no Supabase (manual — feito por você no dashboard)**

Abra `https://supabase.com/dashboard/project/qhrnnunkjlhipispkusy/sql/new`, cole o SQL abaixo e clique em **Run**:

```sql
create table whatsapp_instances (
  id uuid primary key default gen_random_uuid(),
  evolution_instance_id text,
  name text not null unique,
  status text not null default 'close',
  phone_number text,
  profile_name text,
  profile_pic_url text,
  last_connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  remote_jid text not null unique,
  phone_number text not null,
  display_name text,
  atendido_por text not null default 'aguardando',
  last_message_at timestamptz,
  unread_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references whatsapp_conversations(id) on delete cascade,
  evolution_message_id text not null unique,
  direction text not null,
  sender text not null,
  body text not null,
  status text,
  sent_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table whatsapp_instances enable row level security;
alter table whatsapp_conversations enable row level security;
alter table whatsapp_messages enable row level security;
```

Não crie nenhuma policy para `anon`/`authenticated` — isso é intencional (deny-all; só a `service_role` acessa).

- [ ] **Step 6: Verificar que as tabelas existem e estão acessíveis via Data API**

Run (substitua `<service_role_key>` pela chave real):

```bash
curl -s "https://qhrnnunkjlhipispkusy.supabase.co/rest/v1/whatsapp_instances?select=id" \
  -H "apikey: <service_role_key>" \
  -H "Authorization: Bearer <service_role_key>"
```

Expected: `[]` (200 OK, array vazio). Se vier `relation "whatsapp_instances" does not exist`, o SQL do Step 5 não rodou. Se vier erro de permissão, confira em Project Settings → Data API se o schema `public` está na lista de "Exposed schemas".

- [ ] **Step 7: Criar `lib/supabase/server.ts`**

```typescript
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createSupabaseServerClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar definidos em .env.local"
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
```

- [ ] **Step 8: Verificar tipos**

Run: `npx tsc --noEmit`

Expected: sem erros.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json .env.example lib/supabase/server.ts
git commit -m "feat: add Supabase client and WhatsApp schema setup"
```

(`.env.local` não entra no commit — já está no `.gitignore`.)

---

### Task 2: Cliente da Evolution API

**Files:**
- Create: `lib/evolution/client.ts`

**Interfaces:**
- Consumes: variáveis de ambiente `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE_NAME`.
- Produces: `connectInstance()`, `getConnectionState()`, `getInstanceInfo()`, `logoutInstance()`, `setWebhook(url, events)`, `sendTextMessage(remoteJid, text)` — usados pelas rotas das próximas tasks.

- [ ] **Step 1: Criar `lib/evolution/client.ts`**

```typescript
import "server-only";

export interface EvolutionQrCode {
  base64: string | null;
  code: string | null;
  pairingCode: string | null;
}

export interface EvolutionInstanceInfo {
  name: string;
  connectionStatus: "open" | "close" | "connecting";
  ownerJid: string | null;
  profileName: string | null;
  profilePicUrl: string | null;
  number: string | null;
}

function evolutionConfig() {
  const baseUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instanceName = process.env.EVOLUTION_INSTANCE_NAME;

  if (!baseUrl || !apiKey || !instanceName) {
    throw new Error(
      "EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE_NAME precisam estar definidos em .env.local"
    );
  }

  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey, instanceName };
}

async function evolutionFetch(path: string, init?: RequestInit) {
  const { baseUrl, apiKey } = evolutionConfig();
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Evolution API ${path} falhou (${res.status}): ${body}`);
  }

  return res.json();
}

export async function connectInstance(): Promise<EvolutionQrCode> {
  const { instanceName } = evolutionConfig();
  const data = await evolutionFetch(`/instance/connect/${instanceName}`);
  return {
    base64: data.base64 ?? null,
    code: data.code ?? null,
    pairingCode: data.pairingCode ?? null,
  };
}

export async function getConnectionState(): Promise<string> {
  const { instanceName } = evolutionConfig();
  const data = await evolutionFetch(`/instance/connectionState/${instanceName}`);
  return data.instance?.state ?? "close";
}

export async function getInstanceInfo(): Promise<EvolutionInstanceInfo | null> {
  const { instanceName } = evolutionConfig();
  const data = await evolutionFetch(
    `/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`
  );
  const found = Array.isArray(data) ? data[0] : null;
  if (!found) return null;
  return {
    name: found.name,
    connectionStatus: found.connectionStatus,
    ownerJid: found.ownerJid ?? null,
    profileName: found.profileName ?? null,
    profilePicUrl: found.profilePicUrl ?? null,
    number: found.number ?? null,
  };
}

export async function logoutInstance(): Promise<void> {
  const { instanceName } = evolutionConfig();
  await evolutionFetch(`/instance/logout/${instanceName}`, { method: "DELETE" });
}

export async function setWebhook(url: string, events: string[]): Promise<void> {
  const { instanceName } = evolutionConfig();
  await evolutionFetch(`/webhook/set/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      webhook: { enabled: true, url, events, byEvents: false, base64: false },
    }),
  });
}

export async function sendTextMessage(
  remoteJid: string,
  text: string
): Promise<{ evolutionMessageId: string }> {
  const { instanceName } = evolutionConfig();
  const number = remoteJid.split("@")[0];
  const data = await evolutionFetch(`/message/sendText/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({ number, text }),
  });
  return { evolutionMessageId: data?.key?.id ?? `local-${crypto.randomUUID()}` };
}
```

- [ ] **Step 2: Verificar manualmente contra a Evolution API real**

Crie um arquivo temporário `scripts/check-evolution.mjs` (não commitar) só para validar a leitura de env vars e o fetch básico:

```bash
node -e "
const url = 'https://expensiveportuguesemanowar-evolution.cloudfy.live/instance/connectionState/Teste';
fetch(url, { headers: { apikey: '3899AD688746-4E4C-9CC6-2EB1335BFC22' } })
  .then((r) => r.json())
  .then((d) => console.log(JSON.stringify(d)));
"
```

Expected: `{"instance":{"instanceName":"Teste","state":"close"}}` (ou `"open"` se alguém já conectou nesse meio-tempo).

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`

Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add lib/evolution/client.ts
git commit -m "feat: add Evolution API server-only client"
```

---

### Task 3: Rota de webhook (recebe eventos da Evolution API)

**Files:**
- Create: `lib/whatsapp/instance-store.ts`
- Create: `app/api/whatsapp/webhook/route.ts`

**Interfaces:**
- Consumes: `createSupabaseServerClient` (Task 1), `getInstanceInfo` (Task 2).
- Produces: `refreshInstanceFromEvolution(): Promise<void>`, `setInstanceStatus(status: string): Promise<void>` — usados pela Task 4 (status/connect/disconnect).

- [ ] **Step 1: Criar `lib/whatsapp/instance-store.ts`**

```typescript
import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getInstanceInfo } from "@/lib/evolution/client";

export async function refreshInstanceFromEvolution(): Promise<void> {
  const info = await getInstanceInfo();
  if (!info) return;

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("whatsapp_instances").upsert(
    {
      evolution_instance_id: info.name,
      name: process.env.EVOLUTION_INSTANCE_NAME!,
      status: info.connectionStatus,
      phone_number: info.number,
      profile_name: info.profileName,
      profile_pic_url: info.profilePicUrl,
      last_connected_at:
        info.connectionStatus === "open" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "name" }
  );

  if (error) throw error;
}

export async function setInstanceStatus(status: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("whatsapp_instances").upsert(
    {
      name: process.env.EVOLUTION_INSTANCE_NAME!,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "name" }
  );
  if (error) throw error;
}
```

- [ ] **Step 2: Criar `app/api/whatsapp/webhook/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { refreshInstanceFromEvolution, setInstanceStatus } from "@/lib/whatsapp/instance-store";

interface EvolutionWebhookBody {
  event: string;
  instance: string;
  data: Record<string, unknown>;
}

function extractText(message: Record<string, unknown> | undefined): string | null {
  if (!message) return null;
  const conversation = message["conversation"];
  if (typeof conversation === "string") return conversation;
  const extended = message["extendedTextMessage"] as { text?: string } | undefined;
  if (extended?.text) return extended.text;
  return null;
}

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token || token !== process.env.EVOLUTION_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  let body: EvolutionWebhookBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!body?.event) {
    return NextResponse.json({ error: "Evento ausente." }, { status: 400 });
  }

  try {
    if (body.event === "connection.update") {
      await handleConnectionUpdate(body.data ?? {});
    } else if (body.event === "messages.upsert") {
      await handleMessagesUpsert(body.data ?? {});
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[whatsapp/webhook]", error);
    return NextResponse.json({ error: "Erro ao processar webhook." }, { status: 500 });
  }
}

async function handleConnectionUpdate(data: Record<string, unknown>) {
  const state = (data?.state as string) ?? "close";
  if (state === "open") {
    await refreshInstanceFromEvolution();
  } else {
    await setInstanceStatus(state);
  }
}

async function handleMessagesUpsert(data: Record<string, unknown>) {
  const key = data?.key as { remoteJid?: string; fromMe?: boolean; id?: string } | undefined;
  const remoteJid = key?.remoteJid;
  if (!remoteJid || remoteJid.endsWith("@g.us")) return; // ignora grupos

  const text = extractText(data?.message as Record<string, unknown> | undefined);
  if (!text) return; // MVP só suporta texto — mídia é ignorada por enquanto

  const messageId = key?.id;
  if (!messageId) return;

  const fromMe = key?.fromMe === true;
  const pushName = (data?.pushName as string) ?? null;
  const timestampRaw = data?.messageTimestamp as number | string | undefined;
  const sentAt = timestampRaw
    ? new Date(Number(timestampRaw) * 1000).toISOString()
    : new Date().toISOString();

  const supabase = createSupabaseServerClient();
  const phoneNumber = remoteJid.split("@")[0];

  const { data: conversation, error: convError } = await supabase
    .from("whatsapp_conversations")
    .upsert(
      {
        remote_jid: remoteJid,
        phone_number: phoneNumber,
        display_name: pushName,
        last_message_at: sentAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "remote_jid" }
    )
    .select()
    .single();

  if (convError) throw convError;

  if (!fromMe) {
    await supabase
      .from("whatsapp_conversations")
      .update({ unread_count: (conversation.unread_count ?? 0) + 1 })
      .eq("id", conversation.id);
  }

  const { error: msgError } = await supabase.from("whatsapp_messages").upsert(
    {
      conversation_id: conversation.id,
      evolution_message_id: messageId,
      direction: fromMe ? "outbound" : "inbound",
      sender: fromMe ? "atendente" : "cliente",
      body: text,
      status: "delivered",
      sent_at: sentAt,
    },
    { onConflict: "evolution_message_id", ignoreDuplicates: true }
  );

  if (msgError) throw msgError;
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`

Expected: sem erros.

- [ ] **Step 4: Rodar o dev server e simular um webhook de mensagem recebida**

Run: `npm run dev` (em um terminal separado, deixe rodando)

Em outro terminal, usando o `EVOLUTION_WEBHOOK_SECRET` gerado na Task 1:

```bash
curl -s -X POST "http://localhost:3000/api/whatsapp/webhook?token=<EVOLUTION_WEBHOOK_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "messages.upsert",
    "instance": "Teste",
    "data": {
      "key": { "remoteJid": "5511999998888@s.whatsapp.net", "fromMe": false, "id": "TESTE123" },
      "pushName": "Cliente Teste",
      "message": { "conversation": "Mensagem de teste" },
      "messageTimestamp": 1732450000
    }
  }'
```

Expected: `{"ok":true}`.

- [ ] **Step 5: Confirmar a gravação no Supabase**

```bash
curl -s "https://qhrnnunkjlhipispkusy.supabase.co/rest/v1/whatsapp_messages?select=*&evolution_message_id=eq.TESTE123" \
  -H "apikey: <service_role_key>" \
  -H "Authorization: Bearer <service_role_key>"
```

Expected: um array com um objeto onde `body` é `"Mensagem de teste"` e `sender` é `"cliente"`.

- [ ] **Step 6: Testar rejeição de token inválido**

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3000/api/whatsapp/webhook?token=errado" \
  -H "Content-Type: application/json" -d '{"event":"messages.upsert","data":{}}'
```

Expected: `401`.

- [ ] **Step 7: Commit**

```bash
git add lib/whatsapp/instance-store.ts app/api/whatsapp/webhook/route.ts
git commit -m "feat: add WhatsApp webhook handler for connection and message events"
```

---

### Task 4: Rotas de conexão (connect / status / disconnect)

**Files:**
- Create: `app/api/whatsapp/connect/route.ts`
- Create: `app/api/whatsapp/status/route.ts`
- Create: `app/api/whatsapp/disconnect/route.ts`

**Interfaces:**
- Consumes: `connectInstance`, `getConnectionState`, `getInstanceInfo`, `logoutInstance`, `setWebhook` (Task 2); `refreshInstanceFromEvolution`, `setInstanceStatus` (Task 3).
- Produces: `POST /api/whatsapp/connect` → `{ base64, code, pairingCode }`; `GET /api/whatsapp/status` → `{ status, phoneNumber, profileName, profilePicUrl }`; `POST /api/whatsapp/disconnect` → `{ ok: true }`. Consumidos pela Task 5 (UI).

- [ ] **Step 1: Criar `app/api/whatsapp/connect/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { connectInstance, setWebhook } from "@/lib/evolution/client";

function getAppBaseUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function POST() {
  try {
    const webhookUrl = `${getAppBaseUrl()}/api/whatsapp/webhook?token=${process.env.EVOLUTION_WEBHOOK_SECRET}`;
    await setWebhook(webhookUrl, ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]);
    const qr = await connectInstance();
    return NextResponse.json(qr);
  } catch (error) {
    console.error("[whatsapp/connect]", error);
    return NextResponse.json(
      { error: "Não foi possível conectar à Evolution API." },
      { status: 502 }
    );
  }
}
```

- [ ] **Step 2: Criar `app/api/whatsapp/status/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { getConnectionState, getInstanceInfo } from "@/lib/evolution/client";
import { refreshInstanceFromEvolution } from "@/lib/whatsapp/instance-store";

export async function GET() {
  try {
    const state = await getConnectionState();

    if (state === "open") {
      const info = await getInstanceInfo();
      await refreshInstanceFromEvolution();
      return NextResponse.json({
        status: "open",
        phoneNumber: info?.number ?? null,
        profileName: info?.profileName ?? null,
        profilePicUrl: info?.profilePicUrl ?? null,
      });
    }

    return NextResponse.json({
      status: state,
      phoneNumber: null,
      profileName: null,
      profilePicUrl: null,
    });
  } catch (error) {
    console.error("[whatsapp/status]", error);
    return NextResponse.json(
      { error: "Não foi possível consultar o status da instância." },
      { status: 502 }
    );
  }
}
```

- [ ] **Step 3: Criar `app/api/whatsapp/disconnect/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { logoutInstance } from "@/lib/evolution/client";
import { setInstanceStatus } from "@/lib/whatsapp/instance-store";

export async function POST() {
  try {
    await logoutInstance();
    await setInstanceStatus("close");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[whatsapp/disconnect]", error);
    return NextResponse.json(
      { error: "Não foi possível desconectar a instância." },
      { status: 502 }
    );
  }
}
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`

Expected: sem erros.

- [ ] **Step 5: Testar o fluxo de conexão manualmente (dev server rodando)**

```bash
curl -s -X POST "http://localhost:3000/api/whatsapp/connect"
```

Expected: JSON com `base64` começando em `data:image/png;base64,...` (é o QR code — pode até colar o valor de `base64` num navegador para conferir visualmente).

```bash
curl -s "http://localhost:3000/api/whatsapp/status"
```

Expected: `{"status":"close",...}` ou `{"status":"connecting",...}` (ainda não escaneado).

- [ ] **Step 6: Confirmar que o webhook foi reconfigurado na Evolution API**

```bash
curl -s "https://expensiveportuguesemanowar-evolution.cloudfy.live/webhook/find/Teste" \
  -H "apikey: 3899AD688746-4E4C-9CC6-2EB1335BFC22"
```

Expected: `url` apontando para `.../api/whatsapp/webhook?token=...` (não mais `solution-atendimento.vercel.app`), `enabled: true`.

- [ ] **Step 7: Commit**

```bash
git add app/api/whatsapp/connect app/api/whatsapp/status app/api/whatsapp/disconnect
git commit -m "feat: add WhatsApp connect/status/disconnect API routes"
```

---

### Task 5: Painel de conexão em Configurações → Integrações

**Files:**
- Create: `components/app/configuracoes/whatsapp-connect-dialog.tsx`
- Modify: `app/(app)/configuracoes/integracoes/page.tsx`

**Interfaces:**
- Consumes: `POST /api/whatsapp/connect`, `GET /api/whatsapp/status`, `POST /api/whatsapp/disconnect` (Task 4).

- [ ] **Step 1: Criar `components/app/configuracoes/whatsapp-connect-dialog.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function WhatsappConnectDialog({
  open,
  onOpenChange,
  onConectado,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConectado: (info: { phoneNumber: string | null }) => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function pararPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function iniciarPolling() {
    pararPolling();
    pollRef.current = setInterval(async () => {
      const res = await fetch("/api/whatsapp/status", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === "open") {
        pararPolling();
        onConectado({ phoneNumber: data.phoneNumber ?? null });
        onOpenChange(false);
      }
    }, 2000);
  }

  async function iniciar() {
    setErro(null);
    setCarregando(true);
    setQr(null);
    try {
      const res = await fetch("/api/whatsapp/connect", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQr(data.base64 ?? null);
      iniciarPolling();
    } catch {
      setErro(
        "Não foi possível gerar o QR code. Verifique a Evolution API e tente novamente."
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (open) {
      iniciar();
    } else {
      pararPolling();
    }
    return () => pararPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp</DialogTitle>
          <DialogDescription>
            Abra o WhatsApp no celular do número que atende pelo CRM → Aparelhos
            conectados → Conectar aparelho, e escaneie o QR code abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-2">
          {carregando ? (
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          ) : erro ? (
            <>
              <p className="text-center text-sm text-destructive">{erro}</p>
              <Button variant="outline" size="sm" onClick={iniciar} className="gap-2">
                <RefreshCw className="size-4" />
                Tentar novamente
              </Button>
            </>
          ) : qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qr}
              alt="QR code de conexão do WhatsApp"
              className="size-56 rounded-md border border-border"
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Modificar `app/(app)/configuracoes/integracoes/page.tsx`**

Substituir o arquivo inteiro por:

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  MessageCircle,
  Calendar,
  Mail,
  Megaphone,
  ShieldCheck,
  Check,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WhatsappConnectDialog } from "@/components/app/configuracoes/whatsapp-connect-dialog";
import { INTEGRACOES } from "@/lib/config-data";
import {
  INTEGRACAO_STATUS_LABEL,
  type Integracao,
  type IntegracaoStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONES: Record<string, LucideIcon> = {
  "int-whatsapp": MessageCircle,
  "int-google": Calendar,
  "int-gmail": Mail,
  "int-meta-ads": Megaphone,
};

const STATUS_VARIANT: Record<IntegracaoStatus, "won" | "lost" | "default"> = {
  conectado: "won",
  erro: "lost",
  desconectado: "default",
};

const WHATSAPP_ID = "int-whatsapp";

export default function IntegracoesPage() {
  const [itens, setItens] = useState<Integracao[]>(INTEGRACOES);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [carregandoStatus, setCarregandoStatus] = useState(true);

  useEffect(() => {
    let ativo = true;
    fetch("/api/whatsapp/status", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!ativo || !data) return;
        aplicarStatusWhatsapp(data.status === "open" ? "conectado" : "desconectado");
      })
      .catch(() => {
        if (ativo) aplicarStatusWhatsapp("erro");
      })
      .finally(() => {
        if (ativo) setCarregandoStatus(false);
      });
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function aplicarStatusWhatsapp(status: IntegracaoStatus) {
    setItens((prev) => prev.map((i) => (i.id === WHATSAPP_ID ? { ...i, status } : i)));
  }

  async function desconectarWhatsapp() {
    const res = await fetch("/api/whatsapp/disconnect", { method: "POST" });
    if (res.ok) aplicarStatusWhatsapp("desconectado");
  }

  function alternar(id: string) {
    if (id === WHATSAPP_ID) {
      const atual = itens.find((i) => i.id === WHATSAPP_ID);
      if (atual?.status === "conectado") {
        desconectarWhatsapp();
      } else {
        setDialogAberto(true);
      }
      return;
    }

    setItens((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              status: i.status === "conectado" ? "desconectado" : "conectado",
            }
          : i
      )
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Integrações
        </h2>
        <p className="text-sm text-muted-foreground">
          Conecte serviços externos. A autorização é feita por OAuth e os
          segredos ficam no servidor — nunca no navegador.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {itens.map((i) => {
          const Icon = ICONES[i.id] ?? MessageCircle;
          const conectado = i.status === "conectado";
          const carregando = i.id === WHATSAPP_ID && carregandoStatus;
          return (
            <div
              key={i.id}
              className="flex flex-col rounded-lg border border-border bg-card panel-sm"
            >
              <div className="flex items-start gap-3 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-elevated">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{i.nome}</p>
                    <Badge variant="outline">{i.categoria}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    por {i.provedor}
                  </p>
                </div>
                <Badge
                  variant={STATUS_VARIANT[i.status]}
                  className="shrink-0 gap-1"
                >
                  {conectado ? <Check className="size-3" /> : null}
                  {INTEGRACAO_STATUS_LABEL[i.status]}
                </Badge>
              </div>

              <div className="flex-1 space-y-3 px-4">
                <p className="text-sm text-muted-foreground">{i.descricao}</p>
                <div className="flex flex-wrap gap-1.5">
                  {i.escopos.map((e) => (
                    <span
                      key={e}
                      className="rounded-sm bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {e}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 rounded-md border border-border bg-elevated p-2.5">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" />
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    {i.seguranca}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4">
                <span className="text-xs text-muted-foreground">
                  {conectado && i.ultimaSync
                    ? "Sincronizado agora há pouco"
                    : "Não conectado"}
                </span>
                <Button
                  variant={conectado ? "outline" : "brand"}
                  size="sm"
                  disabled={carregando}
                  onClick={() => alternar(i.id)}
                  className={cn(conectado && "text-muted-foreground")}
                >
                  {conectado ? "Desconectar" : "Conectar"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <WhatsappConnectDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        onConectado={() => aplicarStatusWhatsapp("conectado")}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verificar tipos e lint**

Run: `npx tsc --noEmit && npm run lint`

Expected: sem erros.

- [ ] **Step 4: Testar no navegador (dev server rodando)**

1. Abra `http://localhost:3000/configuracoes/integracoes`.
2. Clique em "Conectar" no card do WhatsApp — deve abrir o modal e mostrar um QR code real.
3. Escaneie com o celular do número que vai atender pelo CRM (WhatsApp → Aparelhos conectados → Conectar aparelho).
4. O modal deve fechar sozinho e o badge do card deve virar "Conectado" em poucos segundos.
5. Clique em "Desconectar" — o badge deve voltar para "Desconectado".

- [ ] **Step 5: Commit**

```bash
git add components/app/configuracoes/whatsapp-connect-dialog.tsx "app/(app)/configuracoes/integracoes/page.tsx"
git commit -m "feat: wire WhatsApp integration card to real Evolution API connect flow"
```

---

### Task 6: Mapeamento de conversas e rotas de leitura/atualização

**Files:**
- Create: `lib/whatsapp/mapper.ts`
- Create: `app/api/whatsapp/conversas/route.ts`
- Create: `app/api/whatsapp/conversas/[id]/route.ts`

**Interfaces:**
- Consumes: `createSupabaseServerClient` (Task 1); tipos `Conversa`, `Mensagem`, `AtendidoPor`, `MsgAutor` de `lib/types.ts`.
- Produces: `mapConversationRow(row): Conversa`; `GET /api/whatsapp/conversas` → `{ conversas: Conversa[] }`; `PATCH /api/whatsapp/conversas/[id]` (body `{ unreadCount?, atendidoPor? }`) → `{ ok: true }`. Consumidos pela Task 8.

- [ ] **Step 1: Criar `lib/whatsapp/mapper.ts`**

```typescript
import type { AtendidoPor, Conversa, Mensagem, MsgAutor } from "@/lib/types";

export interface DbMessageRow {
  id: string;
  direction: "inbound" | "outbound";
  sender: string;
  body: string;
  sent_at: string;
}

export interface DbConversationRow {
  id: string;
  phone_number: string;
  display_name: string | null;
  atendido_por: string;
  unread_count: number;
  whatsapp_messages: DbMessageRow[];
}

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function mapConversationRow(row: DbConversationRow): Conversa {
  const mensagens: Mensagem[] = [...row.whatsapp_messages]
    .sort((a, b) => a.sent_at.localeCompare(b.sent_at))
    .map((m) => ({
      id: m.id,
      autor: m.sender as MsgAutor,
      texto: m.body,
      hora: formatHora(m.sent_at),
    }));

  return {
    id: row.id,
    contatoId: "",
    nome: row.display_name || row.phone_number,
    telefone: row.phone_number,
    ultimaHora: mensagens[mensagens.length - 1]?.hora ?? "",
    naoLidas: row.unread_count,
    atendidoPor: row.atendido_por as AtendidoPor,
    mensagens,
  };
}
```

- [ ] **Step 2: Criar `app/api/whatsapp/conversas/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapConversationRow, type DbConversationRow } from "@/lib/whatsapp/mapper";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("whatsapp_conversations")
    .select("*, whatsapp_messages(id, direction, sender, body, sent_at)")
    .order("last_message_at", { ascending: false });

  if (error) {
    console.error("[whatsapp/conversas]", error);
    return NextResponse.json(
      { error: "Não foi possível carregar as conversas." },
      { status: 500 }
    );
  }

  const conversas = (data as DbConversationRow[]).map(mapConversationRow);
  return NextResponse.json({ conversas });
}
```

- [ ] **Step 3: Criar `app/api/whatsapp/conversas/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.unreadCount === "number") update.unread_count = body.unreadCount;
  if (typeof body.atendidoPor === "string") update.atendido_por = body.atendidoPor;

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("whatsapp_conversations")
    .update(update)
    .eq("id", id);

  if (error) {
    console.error("[whatsapp/conversas/patch]", error);
    return NextResponse.json(
      { error: "Não foi possível atualizar a conversa." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`

Expected: sem erros.

- [ ] **Step 5: Testar com a mensagem de teste criada na Task 3**

```bash
curl -s "http://localhost:3000/api/whatsapp/conversas"
```

Expected: `{"conversas":[{"nome":"Cliente Teste","telefone":"5511999998888",...,"mensagens":[{"texto":"Mensagem de teste",...}]}]}`.

Pegue o `id` da conversa retornada e teste o PATCH:

```bash
curl -s -X PATCH "http://localhost:3000/api/whatsapp/conversas/<id>" \
  -H "Content-Type: application/json" \
  -d '{"unreadCount": 0}'
```

Expected: `{"ok":true}`. Rodando o GET de novo, `naoLidas` deve estar `0`.

- [ ] **Step 6: Commit**

```bash
git add lib/whatsapp/mapper.ts app/api/whatsapp/conversas
git commit -m "feat: add WhatsApp conversations read/update API routes"
```

---

### Task 7: Rota de envio de mensagem

**Files:**
- Create: `app/api/whatsapp/conversas/[id]/mensagens/route.ts`

**Interfaces:**
- Consumes: `sendTextMessage` (Task 2), `createSupabaseServerClient` (Task 1).
- Produces: `POST /api/whatsapp/conversas/[id]/mensagens` (body `{ texto: string }`) → `{ mensagem: Mensagem }` ou `{ error }`. Consumido pela Task 8.

- [ ] **Step 1: Criar `app/api/whatsapp/conversas/[id]/mensagens/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendTextMessage } from "@/lib/evolution/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const texto = typeof body.texto === "string" ? body.texto.trim() : "";

  if (!texto) {
    return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data: conversation, error: convError } = await supabase
    .from("whatsapp_conversations")
    .select("id, remote_jid")
    .eq("id", id)
    .single();

  if (convError || !conversation) {
    return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  }

  const sentAt = new Date().toISOString();

  try {
    const { evolutionMessageId } = await sendTextMessage(conversation.remote_jid, texto);

    const { data: message, error: msgError } = await supabase
      .from("whatsapp_messages")
      .insert({
        conversation_id: conversation.id,
        evolution_message_id: evolutionMessageId,
        direction: "outbound",
        sender: "atendente",
        body: texto,
        status: "sent",
        sent_at: sentAt,
      })
      .select()
      .single();

    if (msgError) throw msgError;

    await supabase
      .from("whatsapp_conversations")
      .update({ last_message_at: sentAt, atendido_por: "humano", updated_at: sentAt })
      .eq("id", conversation.id);

    return NextResponse.json({
      mensagem: {
        id: message.id,
        autor: "atendente",
        texto,
        hora: new Date(sentAt).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    });
  } catch (error) {
    console.error("[whatsapp/enviar]", error);

    await supabase.from("whatsapp_messages").insert({
      conversation_id: conversation.id,
      evolution_message_id: `failed-${crypto.randomUUID()}`,
      direction: "outbound",
      sender: "atendente",
      body: texto,
      status: "failed",
      sent_at: sentAt,
    });

    return NextResponse.json(
      { error: "Falha ao enviar mensagem pelo WhatsApp." },
      { status: 502 }
    );
  }
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`

Expected: sem erros.

- [ ] **Step 3: Testar envio real (instância já conectada via Task 5, Step 4)**

Pegue o `id` de uma conversa real (a sua, testando de outro celular, ou a que já existe) via `GET /api/whatsapp/conversas` e rode:

```bash
curl -s -X POST "http://localhost:3000/api/whatsapp/conversas/<id>/mensagens" \
  -H "Content-Type: application/json" \
  -d '{"texto": "Teste de envio pelo CRM"}'
```

Expected: `{"mensagem":{"autor":"atendente","texto":"Teste de envio pelo CRM",...}}`, e a mensagem chega de verdade no WhatsApp do destinatário.

- [ ] **Step 4: Commit**

```bash
git add app/api/whatsapp/conversas
git commit -m "feat: add WhatsApp send-message API route"
```

---

### Task 8: Inbox real (troca do mock por dados via API)

**Files:**
- Modify: `app/(app)/inbox/page.tsx`
- Delete: `lib/inbox-data.ts`

**Interfaces:**
- Consumes: `GET /api/whatsapp/conversas`, `PATCH /api/whatsapp/conversas/[id]`, `POST /api/whatsapp/conversas/[id]/mensagens` (Tasks 6 e 7).

- [ ] **Step 1: Substituir `app/(app)/inbox/page.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { Topbar } from "@/components/app/topbar";
import { ConversationList } from "@/components/app/inbox/conversation-list";
import { MessageThread } from "@/components/app/inbox/message-thread";
import { ContactPanel } from "@/components/app/inbox/contact-panel";
import type { Conversa } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function InboxPage() {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"lista" | "thread">("lista");

  const carregar = useCallback(async () => {
    const res = await fetch("/api/whatsapp/conversas", { cache: "no-store" });
    if (!res.ok) return;
    const { conversas: novas } = (await res.json()) as { conversas: Conversa[] };
    setConversas(novas);
    setSelId((atual) => atual ?? novas[0]?.id ?? null);
  }, []);

  useEffect(() => {
    carregar();
    const id = setInterval(carregar, 4000);
    return () => clearInterval(id);
  }, [carregar]);

  const sel = conversas.find((c) => c.id === selId) ?? null;

  function selecionar(id: string) {
    setSelId(id);
    setMobileView("thread");
    setConversas((prev) => prev.map((c) => (c.id === id ? { ...c, naoLidas: 0 } : c)));
    fetch(`/api/whatsapp/conversas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unreadCount: 0 }),
    });
  }

  async function enviar(texto: string) {
    if (!selId) return;
    const res = await fetch(`/api/whatsapp/conversas/${selId}/mensagens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto }),
    });

    if (!res.ok) {
      await carregar();
      return;
    }

    const { mensagem } = await res.json();
    setConversas((prev) =>
      prev.map((c) =>
        c.id === selId
          ? {
              ...c,
              atendidoPor: "humano",
              ultimaHora: mensagem.hora,
              mensagens: [...c.mensagens, mensagem],
            }
          : c
      )
    );
  }

  function assumir() {
    if (!selId) return;
    setConversas((prev) =>
      prev.map((c) => (c.id === selId ? { ...c, atendidoPor: "humano" } : c))
    );
    fetch(`/api/whatsapp/conversas/${selId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ atendidoPor: "humano" }),
    });
  }

  if (!sel) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <Topbar title="Inbox" description="Conversas do WhatsApp" />
        <div className="flex flex-1 items-center justify-center px-8 text-center text-sm text-muted-foreground">
          Nenhuma conversa ainda. Assim que chegar uma mensagem no WhatsApp
          conectado, ela aparece aqui.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Topbar title="Inbox" description="Conversas do WhatsApp" />

      <div className="flex min-h-0 flex-1">
        <ConversationList
          conversas={conversas}
          selId={sel.id}
          onSelect={selecionar}
          className={cn(
            "w-full shrink-0 border-border md:w-80 md:border-r",
            mobileView === "thread" && "hidden md:flex"
          )}
        />

        <MessageThread
          conversa={sel}
          onEnviar={enviar}
          onAssumir={assumir}
          onVoltar={() => setMobileView("lista")}
          className={cn(
            "min-w-0 flex-1",
            mobileView === "lista" && "hidden md:flex"
          )}
        />

        <ContactPanel
          conversa={sel}
          className="hidden w-80 shrink-0 border-l border-border xl:flex"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Remover o arquivo de mock não usado mais**

Run: `rm lib/inbox-data.ts`

- [ ] **Step 3: Verificar tipos e lint**

Run: `npx tsc --noEmit && npm run lint`

Expected: sem erros (confirma que nada mais importa `lib/inbox-data.ts`).

- [ ] **Step 4: Testar no navegador**

1. Com a instância já conectada (Task 5), abra `http://localhost:3000/inbox`.
2. Mande uma mensagem de um WhatsApp real para o número conectado — em até ~4s ela deve aparecer na lista e na conversa.
3. Responda pela caixa de texto do Inbox — a mensagem deve sair de verdade no WhatsApp do destinatário.
4. Clique em outra conversa e confirme que o contador de não lidas zera.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/inbox/page.tsx"
git rm lib/inbox-data.ts
git commit -m "feat: wire Inbox to real WhatsApp conversations via Supabase"
```

---

### Task 9: Verificação ponta a ponta

**Files:** nenhum arquivo novo — só verificação manual do fluxo completo.

- [ ] **Step 1: Reiniciar do zero**

Se a instância já estiver conectada de testes anteriores, desconecte pelo painel (Configurações → Integrações → Desconectar).

- [ ] **Step 2: Conectar de novo pelo painel**

Repita o fluxo da Task 5 Step 4 (escanear QR real) e confirme que o badge fica "Conectado".

- [ ] **Step 3: Testar mensagem recebida real**

De outro número de WhatsApp, mande uma mensagem de texto para o número conectado. Confirme que ela aparece no Inbox em até ~4s, com nome/telefone corretos.

- [ ] **Step 4: Testar mensagem enviada real**

Responda pelo Inbox. Confirme que chega no WhatsApp do outro número.

- [ ] **Step 5: Testar reentrega de webhook (dedupe)**

Repita o `curl` do Task 3 Step 4 com o mesmo `"id": "TESTE123"` uma segunda vez.

```bash
curl -s "https://qhrnnunkjlhipispkusy.supabase.co/rest/v1/whatsapp_messages?select=id&evolution_message_id=eq.TESTE123" \
  -H "apikey: <service_role_key>" -H "Authorization: Bearer <service_role_key>"
```

Expected: ainda só **um** registro (sem duplicar).

- [ ] **Step 6: Testar desconexão**

Clique em "Desconectar" no painel. Confirme que o badge volta para "Desconectado" e que `GET /api/whatsapp/status` retorna `"status":"close"`.

- [ ] **Step 7: Revisão final**

Run: `npx tsc --noEmit && npm run lint`

Expected: sem erros — projeto pronto para deploy na Vercel (lembrar de configurar as mesmas variáveis de `.env.local` em Vercel → Project Settings → Environment Variables, e trocar `APP_URL`/depender de `VERCEL_URL` conforme o domínio final).
