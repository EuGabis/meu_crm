# "Enviar mensagem" a partir de Contatos — iniciar conversa de WhatsApp

Data: 2026-07-24

## Contexto e objetivo

O Inbox só mostra conversas que já existem (criadas pelo webhook quando uma mensagem chega). Não há como iniciar uma conversa com um contato cadastrado — o usuário tentou abrir um contato criado manualmente ("Esfihão da Suplicy") para mandar mensagem e não havia caminho. Aprovado com instrução de implementar direto.

## Design

**Fluxo**: menu de ações do contato (em `/contatos`) ganha **"Enviar mensagem"** → `POST /api/whatsapp/conversas/iniciar` com `{ contatoId }` → a rota encontra a conversa existente do contato (por `contact_id`, ou por telefone usando o mesmo matching por sufixo de dígitos do `contact-link.ts`) ou cria uma nova (vazia) já vinculada ao contato → redireciona para `/inbox?conversa=<id>` → o Inbox lê o query param e seleciona a conversa → envio usa o fluxo existente.

**Normalização de telefone → remote_jid**:
- Extrai apenas dígitos do telefone do contato.
- 10–11 dígitos (padrão brasileiro sem código do país) → prefixa `55`.
- 12–13 dígitos começando com `55` → usa como está.
- Fora desses padrões → 400 com mensagem amigável ("Verifique o telefone do contato.").
- `remote_jid = <digitos>@s.whatsapp.net`.

**Reuso/dedupe**: prioridade para conversa com o mesmo `contact_id`; senão, conversa cujo telefone bata por sufixo (≥8 dígitos) — nesse caso também grava o `contact_id` nela. Só cria nova se nada bater.

## Arquivos

- `lib/whatsapp/contact-link.ts`: exporta também `normalizarParaJid(telefone): string | null` (nova função).
- `app/api/whatsapp/conversas/iniciar/route.ts`: nova rota POST.
- `app/(app)/contatos/page.tsx`: item "Enviar mensagem" no menu de ações (com `useRouter` para navegar).
- `app/(app)/inbox/page.tsx`: lê `?conversa=` (via `useSearchParams`) e seleciona a conversa na primeira carga.

## Fora do escopo

- Validar se o número existe no WhatsApp antes de criar a conversa (a Evolution API falha no envio e a mensagem fica com status failed — comportamento já existente).
- Compose de mensagem direto na tela de Contatos (a digitação acontece no Inbox).

## Verificação

Manual: clicar em "Enviar mensagem" num contato manual sem conversa → Inbox abre com a conversa nova selecionada → enviar texto → chega no WhatsApp. Repetir no mesmo contato → reusa a mesma conversa (sem duplicar). Contato com telefone inválido (ex. 5 dígitos) → erro amigável.
