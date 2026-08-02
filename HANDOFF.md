# HANDOFF — Plataforma de Afiliação Shopee

> **Para a próxima sessão do Claude Code.** Leia este arquivo inteiro antes de
> escrever qualquer código. Ele descreve o estado atual, as convenções do
> projeto, o que já foi construído, o que falta e **como** fazer cada parte.
> A especificação original completa está em
> `especificacao-plataforma-afiliacao-shopee.md` (fonte da verdade dos
> requisitos). Em caso de conflito, a especificação vence.

---

## 0. Contexto em 30 segundos

Estamos transformando um CRM existente (`meu_crm`) numa **plataforma de afiliado
da Shopee** que:

1. Busca/ranqueia produtos da Shopee (comissão × vendas)
2. Gera conteúdo de divulgação (descrição + cupom + link)
3. Envia automático para grupos de WhatsApp
4. Gera conteúdo de Instagram **com aprovação manual** (nunca posta sozinho)
5. Mantém histórico do que foi divulgado (não repetir produtos)
6. Tem um guia de cadastro de afiliado Shopee

**v1 = só Shopee.** Arquitetura já prevê Mercado Livre (campo `marketplace`),
mas **não implementar** Mercado Livre agora.

O CRM base já trouxe de graça: **Auth (Supabase), Evolution API (WhatsApp),
inbox 1:1, deploy Vercel** e uma arquitetura modular limpa. Reaproveitar tudo.

---

## 1. Stack e decisões já tomadas (NÃO reabrir)

| Área | Decisão |
|---|---|
| Framework | **Next.js 16 (App Router) + React 19 + TypeScript** |
| Estilo | **Tailwind CSS v4** + Radix UI (componentes em `components/ui/`) |
| Banco/Auth | **Supabase** (Postgres + Auth) |
| WhatsApp | **Evolution API** (usuário domina; risco de ban mitigado com limites + pausa) |
| Deploy | **Vercel** (auto-deploy da branch `main`) |
| IA (geração de conteúdo) | **Vercel AI Gateway** (usar strings `"provider/model"`, não SDK direto de provider) |

**Branch de trabalho:** `main` (deploy automático). O usuário confirmou que as
env de produção já estão configuradas na Vercel.

---

## 2. Arquitetura modular — SIGA ISSO À RISCA

O projeto usa **módulos autocontidos** em `modules/<feature>/`. Regras (de
`modules/README.md`):

```
modules/<feature>/
  index.ts     # PORTA PÚBLICA — único ponto de import externo
  types.ts     # tipos/view-models do módulo
  data/        # mappers de linha do banco (snake_case → camelCase)
  api/         # lógica dos route handlers (GET/POST/PATCH/DELETE)
  ui/          # componentes e página do módulo
```

- **Importe só pela porta pública:** `@/modules/<feature>` (o `index.ts`).
  Nunca importe subpasta de outro módulo direto.
- **`app/` fica fino:** cada `page.tsx` / `route.ts` é só um re-export:
  ```ts
  // app/(app)/grupos/page.tsx
  export { GruposPage as default } from "@/modules/grupos";
  // app/api/grupos/route.ts
  export { GET, POST } from "@/modules/grupos/api/grupos";
  ```
- Compartilhado NÃO vira módulo: `components/ui/*`, `lib/supabase/*`,
  `lib/utils.ts`, `lib/types.ts`.

**Módulo de referência (padrão-ouro):** `modules/agenda/` — copie a estrutura
dele. O `modules/grupos/` (que acabamos de criar) também serve de exemplo.

### Convenções de código observadas
- Banco em **snake_case**, app em **camelCase** — sempre há um `mapper.ts`.
- Route handlers: validam input manualmente (`typeof x === "string" ? ... : ""`),
  logam erro com `console.error("[feature/acao]", error)` e retornam
  `NextResponse.json({ error }, { status })`.
- Cliente Supabase **service_role** (`lib/supabase/server.ts`) para queries no
  servidor; **auth client** (`lib/supabase/auth-server.ts`) para pegar o usuário
  logado (`.auth.getUser()`).
- UI: `"use client"`, busca dados com `fetch("/api/...", { cache: "no-store" })`
  em `useEffect`. Cabeçalho sempre via `<Topbar title description />`.
- Cores/tokens: use `destructive` (NÃO existe `danger`). Badge tem variantes
  `default | outline | won | lost | open | progress` (NÃO tem `secondary`).

---

## 3. O que JÁ ESTÁ FEITO ✅

Commit `524b0c4` na `main`.

### 3.1 Migration — `docs/sql/2026-08-02-afiliacao.sql`
Cria TODAS as tabelas da spec §5:
- `affiliate_configs` (user_id, marketplace, codigo_afiliado, cupom)
- `products` (marketplace, external_id, nome, imagem_url, preco, comissao_pct,
  vendas, avaliacao, link_afiliado) + índice `(comissao_pct desc, vendas desc)`
- `contents` (product_id, tipo `whatsapp|instagram`, texto, imagem_sugerida,
  status `rascunho|aguardando_aprovacao|aprovado|enviado`)
- `whatsapp_groups` (user_id, nome, identificador_grupo=JID, ativo)
- `dispatch_log` (content_id, group_id, enviado_em, status, erro)
- `dispatch_settings` (msgs_por_minuto, msgs_por_hora, intervalo_ms, **pausado**)
  — linha única, já semeada.

> ⚠️ **AÇÃO MANUAL PENDENTE:** rodar esse SQL no **Supabase → SQL Editor**.
> Sem isso, `/grupos` quebra. Todo módulo novo que criar tabela precisa do
> mesmo passo manual (não há migration automática neste projeto).

### 3.2 Evolution client — `lib/evolution/client.ts`
Adicionadas 3 funções (as antigas 1:1 continuam intactas):
- `fetchGroups()` → lista grupos do WhatsApp conectado
- `sendGroupTextMessage(groupJid, text)` → texto para grupo `@g.us`
- `sendGroupMediaMessage(groupJid, {mediatype, mimetype, base64, fileName, caption})`

> Diferença crítica: as funções de grupo **não** fazem `split("@")` no JID (isso
> quebraria grupos). As funções 1:1 originais fazem, e devem continuar assim.

### 3.3 Módulo `grupos` — `modules/grupos/`
CRUD completo de grupos, escopado por usuário logado (isolamento §3.1):
- `GET/POST /api/grupos` — listar/criar
- `PATCH/DELETE /api/grupos/[id]` — renomear/ativar-desativar/excluir
- `GET /api/grupos/sincronizar` — puxa grupos da Evolution e marca os já cadastrados
- UI `/grupos` com sincronização 1-clique, cadastro manual, toggle ativo, exclusão
- Já no menu lateral (`components/app/sidebar.tsx`, ícone `Users2`)

---

## 4. O que FALTA — roadmap com o COMO de cada parte

Ordem recomendada (da spec §7). Itens 1–3 são construíveis JÁ (não dependem da
Shopee). Item 4 depende de resolver o bloqueio da API (ver §5).

### FALTA 1 — Módulo `disparos` ✅ FEITO (commit `c7b01ff`)
Implementado em `modules/disparos/`:
- `POST /api/disparos` body `{ contentId, groupIds? }` — envia aos grupos ativos
  do usuário, respeita `pausado` (retorna 423) e os limites por minuto/hora
  (conta envios recentes em `dispatch_log`, envia até o orçamento), com
  `sleep(intervalo_ms)` entre mensagens. Grava `dispatch_log` e marca
  `content.status='enviado'`. **Instagram é bloqueado** (nunca envia sozinho).
- `GET/PATCH /api/disparos/settings` — limites + **pausa de emergência**.
- `GET /api/disparos/log` — histórico recente (join com nome do grupo).
- UI `/disparos` — botão de pausa em destaque, edição de limites, histórico.
- Helper novo: `lib/auth/current-user.ts` (`currentUserId()`).

> ⚠️ Limite conhecido: para MUITOS grupos, o loop sequencial pode estourar o
> timeout de 300s da Vercel Function. Para escala, migrar para **Vercel Queues**
> ou background job. Para v1 (poucos grupos) está ok.
>
> 🔌 **Ponto de integração:** o módulo `conteudos` (FALTA 2) deve chamar
> `POST /api/disparos` com o `contentId` recém-gerado (tipo whatsapp) para
> disparar automaticamente após gerar.

### FALTA 2 — Módulo `conteudos` (geração de conteúdo) 🔜 PRÓXIMO
**Objetivo:** dado um `product`, gerar automaticamente descrição + bullets +
inserir cupom/link, em duas versões (WhatsApp e Instagram).

**Como fazer:**
- Usar **Vercel AI Gateway** via AI SDK (`generateText`/`generateObject`),
  modelo por string `"anthropic/claude-..."` ou similar. Carregar a skill
  `vercel:ai-sdk` antes de codar.
- `POST /api/conteudos` body `{ productId, tipo }` → gera texto, insere em
  `contents` com `status`:
  - `whatsapp` → `status='aprovado'` (pode ir para disparo automático)
  - `instagram` → **`status='aguardando_aprovacao'`** (NUNCA enviar sozinho §2.2)
- Prompt: tom de oferta, pt-BR, bullets curtos, incluir cupom e link de afiliado
  vindos de `affiliate_configs`. Para Instagram, gerar também `imagem_sugerida`.
- UI: botão "Gerar conteúdo" na tela de produto; preview editável.

### FALTA 3 — Módulo `historico` (dashboard)
**Objetivo:** ver tudo que já foi divulgado, para não repetir produto (§2.4).
**Como fazer:**
- `GET /api/historico` → join `dispatch_log` × `contents` × `products` ×
  `whatsapp_groups`. Retornar: imagem, nome, data, grupos que receberam, status.
- UI `/historico`: grid visual com busca/filtro. Usa `components/ui/table` ou cards.

### FALTA 4 — Módulo `produtos` (Shopee) ⚠️ BLOQUEADO pela API (ver §5)
**Objetivo:** buscar e ranquear produtos.
**Como fazer:**
- Isolar TODA integração Shopee atrás de uma interface
  (`modules/produtos/data/shopee-client.ts`) com uma implementação **mock**
  enquanto a API não estiver liberada. Assim o resto do app não trava.
- Shopee Affiliate Open API: assinatura via SHA256 (appId + timestamp + payload +
  secret). Endpoint GraphQL de busca de ofertas/produtos. **Confirmar credenciais
  antes** (§5). Guardar `SHOPEE_APP_ID` / `SHOPEE_APP_SECRET` em env.
- Ranqueamento: ordenar por `comissao_pct` e `vendas` combinados (a spec deixa o
  peso em aberto — perguntar ao usuário ou usar score = normaliza(comissao) +
  normaliza(vendas)). Persistir em `products`.
- UI `/produtos`: busca por termo/categoria, cards com imagem/preço/comissão/
  vendas/avaliação, seleção múltipla → dispara geração de conteúdo (FALTA 2).

### FALTA 5 — Módulo `instagram` (fluxo de aprovação)
**Objetivo:** fila de conteúdos `aguardando_aprovacao` → notifica → revisa → aprova.
**Como fazer:**
- `GET /api/instagram/pendentes` (contents tipo=instagram, status=aguardando_aprovacao)
- `PATCH /api/conteudos/[id]` para editar texto e mudar status para `aprovado`.
- Usar o sino de notificações existente (`components/app/notification-bell.tsx`).
- **NÃO** integrar publicação automática no Instagram. Só marcar como aprovado
  (o post em si é manual pelo usuário). Reforçar isso na UI.

### FALTA 6 — Guia de cadastro Shopee (conteúdo estático)
- Página `/guia` (rota simples, sem módulo pesado): passo a passo de como se
  cadastrar como afiliado, gerar links, cupons/comissões, acompanhar ganhos,
  boas práticas. Conteúdo estático em MDX ou JSX. Baixo esforço, fazer por último.

### FALTA 7 — Config de afiliado (`affiliate_configs`)
- Tela em `/configuracoes` para o usuário salvar `codigo_afiliado` e `cupom`.
  Necessário para FALTA 2 (geração insere esses dados). Fazer junto com FALTA 2.
- Spec §3.2 pede **cupom/token de afiliado criptografados no banco** — avaliar
  cripto em nível de app antes de gravar (pgcrypto ou cripto no servidor).

---

## 5. O ÚNICO BLOQUEIO REAL — Shopee Affiliate Open API

A spec (§2.1, §7, §8) **exige validar a API oficial antes de codar** o módulo de
produtos e **proíbe scraping agressivo**.

**PERGUNTA ABERTA ao usuário (ainda não respondida):**
> Você já é afiliado Shopee aprovado e tem o **App ID + App Secret** da
> Affiliate Open API?

- **Se SIM:** guardar em env (`SHOPEE_APP_ID`, `SHOPEE_APP_SECRET`), implementar
  o cliente real. A API usa GraphQL + assinatura SHA256 por request.
- **Se NÃO / indisponível:** construir `modules/produtos` com o **mock** isolado
  e **discutir alternativas com o usuário** (spec §7 é explícita: nada de
  paliativo sem conversar antes). NÃO fazer scraping.

Até resolver isso, priorizar FALTA 1, 2, 3 (não dependem da Shopee).

---

## 6. Requisitos de segurança (spec §3) — checklist contínuo

Verificar em CADA módulo novo:
- [x] Auth Supabase + sessão (já existe)
- [x] Segredos em `.env` (nunca no código); `.env` no `.gitignore`
- [ ] Cupom/token de afiliado **criptografados** no banco (FALTA 7)
- [ ] Validação/sanitização de input (fazer em todo route handler — já é o padrão)
- [ ] **Rate limit** em endpoints de login e públicos (avaliar Vercel Firewall/WAF)
- [ ] WhatsApp: **limites de envio configuráveis** + **pausa de emergência**
      + logs de auditoria (tabelas prontas; implementar em FALTA 1)
- [ ] Backup automático do banco (Supabase já faz; confirmar plano)
- [ ] Logs sem vazar dados sensíveis
- [ ] LGPD: coletar mínimo de dados de terceiros (membros de grupo)

**Proibições (spec §8):** não postar no Instagram sozinho; não implementar
Mercado Livre; não hardcodar chaves; não scraping agressivo; não enviar em massa
sem limites; não adicionar features fora da spec sem confirmar.

---

## 7. Variáveis de ambiente (`.env.local` / Vercel)

Já definidas no `.env.example` do projeto:
```
EVOLUTION_API_URL=            # base da Evolution API
EVOLUTION_API_KEY=            # apikey global
EVOLUTION_INSTANCE_NAME=      # nome da instância conectada
EVOLUTION_WEBHOOK_SECRET=     # segredo do webhook
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ADMIN_EMAILS=                 # e-mails que gerenciam usuários
APP_URL=
```
**A adicionar quando entrar cada módulo:**
```
SHOPEE_APP_ID=               # FALTA 4
SHOPEE_APP_SECRET=           # FALTA 4
AI_GATEWAY_API_KEY=          # FALTA 2 (Vercel AI Gateway) — ou usar OIDC da Vercel
```

---

## 8. Como rodar / verificar

```bash
npm install
npm run dev          # http://localhost:3000
npx tsc --noEmit     # type-check (deve passar limpo)
npx eslint modules/<feature>   # lint do módulo novo
```
Antes de qualquer teste real: rodar a migration pendente no Supabase (§3.1) e ter
`.env.local` preenchido. Rodar as migrations em ordem cronológica pelo nome do
arquivo em `docs/sql/`.

**Regra de ouro antes de dizer "pronto":** rode `tsc --noEmit` e `eslint`, e só
afirme que funciona depois de ver a saída passar.

---

## 9. Fluxo de trabalho recomendado para a próxima sessão

1. Ler este arquivo + `especificacao-plataforma-afiliacao-shopee.md` +
   `modules/README.md`.
2. Confirmar com o usuário o bloqueio da Shopee (§5).
3. Rodar a migration pendente no Supabase (§3.1) se ainda não foi.
4. Implementar **FALTA 1 (`disparos`)** — é a peça que fecha o ciclo WhatsApp e
   não depende de nada externo.
5. Depois FALTA 2 (`conteudos`) + FALTA 7 (config afiliado), FALTA 3 (`historico`),
   FALTA 5 (`instagram`), FALTA 4 (`produtos`, quando a API liberar), FALTA 6 (guia).
6. Commit por módulo. Push para `main` só quando o usuário pedir (auto-deploy).
   `tsc` + `eslint` limpos antes de cada commit.

---

_Estado deste handoff: após o commit `524b0c4` (módulo grupos + base). Atualize
este arquivo ao concluir cada FALTA._
