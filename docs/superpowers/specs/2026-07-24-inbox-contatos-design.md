# Integração Inbox↔Contatos — vincular conversas do WhatsApp a contatos reais

Data: 2026-07-24

## Contexto e objetivo

As conversas do WhatsApp (`whatsapp_conversations`, populadas pelo webhook) não têm nenhum vínculo com a tabela `contacts` real — `contatoId` é sempre `""` no mapper (`lib/whatsapp/mapper.ts`). Por isso o painel lateral do Inbox mostra só telefone, e os botões "Criar negócio" e "Ver contato completo" ficaram decorativos (sem ação), pendência anotada nas specs do WhatsApp e do Pipeline.

O usuário tentou clicar em "Criar negócio" numa conversa e nada aconteceu — pediu explicitamente para construir essa ligação agora.

## Decisões de produto (confirmadas com o usuário)

- **Auto-criar contato**: mensagem nova de um número sem contato vinculado → cria um contato automaticamente (nome = pushName do WhatsApp, telefone, status `lead`, origem `whatsapp`) e vincula.
- **Backfill retroativo**: conversas já existentes ganham contato ao rodar a migração (mesma lógica das novas).
- **Troca manual**: o painel do Inbox permite trocar o contato vinculado por outro contato existente (caso o vínculo automático erre).

## Arquitetura

Mesmo padrão de sempre: Route Handlers com `service_role`, RLS deny-all. Sem autenticação de usuário ainda.

- **Schema**: `whatsapp_conversations` ganha `contact_id uuid references contacts(id) on delete set null` (nullable).
- **Helper compartilhado** (`lib/whatsapp/contact-link.ts`): `resolveOrCreateContact(phoneNumber, displayName)` — busca um contato cujo telefone bata com o número do WhatsApp comparando apenas os dígitos, por sufixo (cobre diferenças de código do país/formatação, ex: `5511914815169` no WhatsApp vs `(11) 91481-5169` no cadastro); se não encontrar, cria um contato novo. Usado pelo webhook e pelo backfill.
- **Nova origem de contato**: `"whatsapp"` é adicionada ao tipo `Origem` (`lib/types.ts`) e ao `ORIGEM_LABEL` — contatos auto-criados aparecem como "WhatsApp" em vez de "Outro".

## Endpoints

| Rota | Método | Ação |
|---|---|---|
| `/api/whatsapp/conversas/[id]` | PATCH | Já existe (`unreadCount`, `atendidoPor`) — ganha suporte a `contatoId` para trocar o vínculo manualmente |
| `/api/whatsapp/conversas/backfill-contatos` | POST | Processa todas as conversas sem `contact_id`, resolvendo/criando contatos. Idempotente — rodar de novo não duplica nada. |

**Webhook** (`app/api/whatsapp/webhook/route.ts`): no `messages.upsert`, após o upsert da conversa, se ela ainda não tem `contact_id`, chama `resolveOrCreateContact` e grava o vínculo.

**Mapper** (`lib/whatsapp/mapper.ts`): `contatoId` passa a vir de `contact_id` (era `""` fixo).

## Telas

**`app/(app)/inbox/page.tsx`**: busca também `/api/contatos` (na carga inicial e no polling, para pegar contatos auto-criados por mensagens novas) e repassa a lista ao painel lateral.

**`components/app/inbox/contact-panel.tsx`**: deixa de usar `getContato`/`NEGOCIOS` de `lib/mock-data.ts`:
- Contato real vinculado: nome, cargo, empresa, status e e-mail de verdade.
- Negócios do contato: busca real em `/api/negocios` (filtrados por `contatoId` no cliente).
- **"Ver contato completo"**: continua levando a `/contatos` (não há página de detalhe ainda), mas agora sempre visível quando há contato.
- **"Criar negócio"**: abre o `NovoNegocioDialog` já existente (de `components/app/negocios/`), com o contato vinculado travado.
- **"Trocar contato"**: novo — um select discreto com os contatos existentes; ao escolher, faz `PATCH` na conversa com o novo `contatoId`.
- "Agendar reunião": continua decorativo (fora do escopo — poderia abrir o diálogo de evento futuramente).

## Erros e casos de borda

- Dois contatos com telefones que batem por sufixo: usa o primeiro encontrado (ordenado por criação) — a troca manual cobre o caso raro de escolher errado.
- `pushName` vazio/ausente: usa o número de telefone como nome do contato criado.
- Contato vinculado excluído em `/contatos`: `on delete set null` — a conversa volta a ficar sem contato (e será re-vinculada/re-criada na próxima mensagem recebida).
- Backfill em conversa cujo telefone agora bate com contato existente: vincula sem criar duplicado.

## Fora do escopo

- Página de detalhe do contato (o botão "Ver contato completo" continua indo para a lista `/contatos`).
- "Agendar reunião" no painel do Inbox.
- Merge/dedupe de contatos duplicados.

## Verificação

Manual:
1. Rodar o SQL (`alter table`) no Supabase e o backfill via `curl`; conferir que a conversa existente ganhou contato (auto-criado com origem "whatsapp").
2. No Inbox, conferir que o painel lateral mostra o contato real e seus negócios.
3. "Criar negócio" pelo painel → negócio aparece no Pipeline vinculado ao contato certo.
4. Trocar o contato manualmente pelo select e conferir persistência.
5. (Produção) Mandar mensagem de um número novo → contato criado automaticamente.
