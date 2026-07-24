# Integração WhatsApp (Evolution API) — painel de conexão + Inbox real

Data: 2026-07-24

## Contexto e objetivo

O CRM hoje é 100% front-end com dados mockados (`lib/*-data.ts`). O objetivo desta spec é:

1. Criar um painel em **Configurações → Integrações** para conectar/desconectar o número de WhatsApp via QR code, usando a Evolution API (self-hosted, já rodando), sem precisar abrir o Evolution Manager.
2. Ligar o **Inbox** (hoje mock) a mensagens reais: receber mensagens novas via webhook e enviar mensagens pelo Inbox.

Instância Evolution já existente: `Teste` (WHATSAPP-BAILEYS, status atual `close`/desconectada, com histórico de 642 mensagens / 39 contatos / 105 conversas — esse histórico **não** será importado nesta spec, ver "Fora do escopo").

## Arquitetura

Toda comunicação com a Evolution API e com o Supabase acontece **apenas no servidor** (Next.js Route Handlers). O browser nunca recebe a API key da Evolution nem a `service_role` key do Supabase — ele só fala com as rotas próprias do app em `/api/whatsapp/*`.

Não será usado Supabase Realtime no navegador nesta fase: isso exigiria expor as tabelas de conversas/mensagens via `anon` key, e o CRM ainda não tem autenticação de usuário (qualquer pessoa com a URL do site teria acesso). Em vez disso, o Inbox faz **polling** (a cada ~4s) em uma rota própria, que roda com a `service_role` key por trás. Migrar para Realtime/WebSocket fica como melhoria futura, condicionada a existir login real.

Fluxos:

- **Conectar**: usuário clica "Conectar" no painel → `POST /api/whatsapp/connect` garante que o webhook da instância está configurado e chama o `connect` da Evolution → retorna QR code em base64 → UI faz polling de `GET /api/whatsapp/status` a cada 2s até status `open` → Evolution também manda um webhook `connection.update` confirmando, que atualiza o Supabase.
- **Receber mensagem**: Evolution dispara `POST /api/whatsapp/webhook?token=...` a cada evento (`messages.upsert`, `connection.update`) → rota valida o token secreto → grava/atualiza `whatsapp_conversations` e `whatsapp_messages` no Supabase.
- **Enviar mensagem**: Inbox chama `POST /api/whatsapp/conversas/[id]/mensagens` → rota chama `sendText` na Evolution API → grava a mensagem outbound no Supabase.

## Modelo de dados (Supabase)

Três tabelas novas. RLS habilitado em todas, **sem policies para `anon`/`authenticated`** — apenas a `service_role` (usada só no servidor) acessa. Isso é seguro mesmo sem login hoje e continua correto quando a autenticação for adicionada.

```sql
create table whatsapp_instances (
  id uuid primary key default gen_random_uuid(),
  evolution_instance_id text not null,
  name text not null,
  status text not null default 'close',        -- close | connecting | open
  phone_number text,
  profile_name text,
  profile_pic_url text,
  last_connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  remote_jid text not null unique,             -- ex: 5511999999999@s.whatsapp.net
  phone_number text not null,
  display_name text,
  atendido_por text not null default 'aguardando', -- humano | agente | aguardando
  last_message_at timestamptz,
  unread_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references whatsapp_conversations(id) on delete cascade,
  evolution_message_id text not null unique,   -- dedupe de reentrega de webhook
  direction text not null,                     -- inbound | outbound
  sender text not null,                        -- cliente | atendente | agente
  body text not null,
  status text,                                 -- sent | delivered | read | failed
  sent_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table whatsapp_instances enable row level security;
alter table whatsapp_conversations enable row level security;
alter table whatsapp_messages enable row level security;
```

`contato_id` fica de fora da tabela de conversas por enquanto: o módulo Contatos ainda é mock (não está no Supabase); ligar as duas coisas é um passo futuro separado.

## Variáveis de ambiente

`.env.local` (já coberto por `.gitignore`, nunca commitado):

```
EVOLUTION_API_URL=https://expensiveportuguesemanowar-evolution.cloudfy.live
EVOLUTION_API_KEY=<api key da instância>
EVOLUTION_INSTANCE_NAME=Teste
EVOLUTION_WEBHOOK_SECRET=<gerado aleatoriamente>

SUPABASE_URL=https://qhrnnunkjlhipispkusy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
NEXT_PUBLIC_SUPABASE_URL=https://qhrnnunkjlhipispkusy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` é guardada para quando existir autenticação — nenhum código client-side a usa nesta spec.

## Cliente Evolution API

`lib/evolution/client.ts` — wrapper server-only sobre a Evolution API v2:

- `connectInstance()` — inicia/retoma conexão, retorna QR code base64
- `getInstanceStatus()` — status atual da instância na Evolution
- `logoutInstance()` — desconecta
- `setWebhook(url, secret)` — configura o webhook da instância apontando pro nosso endpoint
- `sendTextMessage(remoteJid, text)` — envia mensagem de texto

## Endpoints (`app/api/whatsapp/`)

| Rota | Método | Ação |
|---|---|---|
| `/connect` | POST | Garante webhook configurado, chama connect na Evolution, devolve QR code |
| `/status` | GET | Status atual da instância (lido do Supabase, mantido por webhook) |
| `/disconnect` | POST | Logout na Evolution + atualiza status no Supabase |
| `/webhook` | POST | Recebe eventos da Evolution (`?token=<secret>`); trata `connection.update` e `messages.upsert`, com dedupe por `evolution_message_id` |
| `/conversas` | GET | Lista conversas + mensagens (substitui o mock `CONVERSAS`) |
| `/conversas/[id]/mensagens` | POST | Envia mensagem de texto (chama Evolution `sendText` + grava outbound) |

O token do webhook vai como query param (`?token=`) porque a Evolution API não assina payloads — mitigação padrão para esse tipo de integração. Toda rota que grava no banco valida o corpo recebido (schema mínimo) antes de gravar.

## Telas

**Configurações → Integrações** (`app/(app)/configuracoes/integracoes/page.tsx`): o card do WhatsApp deixa de alternar um status mockado. "Conectar" abre um modal com o QR code, faz polling de `/api/whatsapp/status` a cada 2s, fecha automaticamente mostrando "Conectado como {telefone}" quando o status virar `open`. "Desconectar" chama `/disconnect` e volta o badge para "Desconectado". Se a Evolution API estiver inacessível, mostra estado de erro inline com "Tentar novamente".

**Inbox** (`app/(app)/inbox/page.tsx`): troca `import { CONVERSAS } from "@/lib/inbox-data"` por fetch em `/api/whatsapp/conversas`, com polling a cada ~4s (mesmo padrão `useState`/`useEffect` já usado no app). `enviar()` passa a fazer `POST` em `/conversas/[id]/mensagens`; se o envio falhar, a mensagem fica marcada como "falhou" em vez de desaparecer.

## Erros e casos de borda

- Evolution API fora do ar ao conectar → erro inline, sem crash.
- Webhook com token inválido/ausente → 401, não grava nada.
- Payload de webhook malformado → 400, log server-side, não derruba a rota.
- Mensagem duplicada (reentrega de webhook) → `evolution_message_id` único, upsert idempotente.
- Falha ao enviar mensagem → mensagem gravada com `status = 'failed'`, UI mostra indicador de erro.

## Fora do escopo desta spec

- Importar o histórico existente (642 mensagens / 105 conversas) da instância `Teste` — fica como script de backfill futuro.
- Mensagens de mídia (imagem/áudio/documento) — só texto por enquanto.
- Vincular conversas do WhatsApp a Contatos reais (Contatos continua mock).
- Múltiplas instâncias/números de WhatsApp.
- Supabase Realtime / WebSocket no Inbox (fica polling).

## Verificação

Não há framework de testes automatizados no repo. Verificação manual:

1. Rodar o dev server e testar o fluxo de conexão com o QR code real da instância `Teste`.
2. Simular eventos de webhook via `curl` para confirmar gravação correta no Supabase.
3. Testar envio e recebimento de mensagem de texto ponta a ponta com um número real.
4. Conferir que desconectar/reconectar atualiza o status corretamente no painel.
