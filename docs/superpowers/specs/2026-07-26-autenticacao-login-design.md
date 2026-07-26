# Autenticação (login/senha) — Supabase Auth

Data: 2026-07-26

## Contexto e objetivo

Hoje o CRM **não tem autenticação**: todas as rotas em `app/(app)/` estão abertas, não há middleware, e o "dono" dos registros é fixo (`"Gabriel Pereira"`). O usuário quer um sistema de **login e senha bem feito e seguro**.

Decisões acordadas (brainstorming 2026-07-26):

- **Motor:** Supabase Auth (o backend já é Supabase), com sessão em cookies via `@supabase/ssr`.
- **Cadastro:** sem signup aberto. O admin **cria os acessos direto no CRM** (e-mail + senha temporária, acesso imediato). Nada de gerenciar usuário no painel do Supabase.
- **Permissões:** **só login** nesta v1 — todo usuário autenticado enxerga o CRM inteiro. Papéis (admin/vendedor) ficam para depois.
- **Extras nesta v1:** **reset de senha por e-mail**. Verificação de e-mail não é um passo separado — contas criadas pelo admin já nascem confirmadas (`email_confirm: true`).

Objetivo de segurança: senha com hash bcrypt (Supabase), sessão em cookie **httpOnly/Secure/SameSite**, decisão de confiança sempre via `auth.getUser()` (valida o JWT no servidor), toda rota atrás do login, sem enumeração de usuário nas mensagens de erro.

## Arquitetura

Três clientes Supabase com papéis separados:

| Cliente | Arquivo | Chave | Uso |
|---|---|---|---|
| Browser | `lib/supabase/client.ts` (novo) | anon | Formulário de login/reset no client component |
| Servidor c/ sessão | `lib/supabase/auth-server.ts` (novo) | anon + cookies | Middleware, layouts e páginas de auth — lê/valida a sessão |
| Admin | `lib/supabase/server.ts` (existe) | service_role | Rotas de dados (inalteradas) e operações de admin (criar/remover usuário) |

**As rotas de dados atuais não mudam** — seguem no `createSupabaseServerClient()` (service_role). Elas passam a ficar protegidas pelo middleware (exigem sessão), mas o acesso ao banco continua via service_role (sem RLS por usuário nesta v1). Isso evita risco de quebrar contatos/pipeline/tarefas/etc.

Regra de ouro: decisões de acesso usam `supabase.auth.getUser()` (revalida no servidor do Supabase), **nunca** `getSession()` sozinho (que só lê o cookie).

## O portão: `middleware.ts` (raiz do projeto)

Roda em toda requisição relevante. Faz duas coisas:

1. **Renova a sessão** (o `@supabase/ssr` reescreve os cookies de refresh).
2. **Bloqueia o não autenticado:**
   - Rotas de página → redireciona para `/login` (com `?redirect=<rota>` para voltar depois).
   - Rotas `/api/*` → responde **401 JSON** (não redireciona HTML).

**Allow-list pública** (não exige sessão): `/login`, `/esqueci-senha`, `/nova-senha`, `/auth/callback`, `/auth/signout`, **`/api/whatsapp/webhook`** (chamado pela Evolution API, protegido pelo próprio `EVOLUTION_WEBHOOK_SECRET`), e os assets do Next (`_next/*`, favicon, etc.) via `matcher`.

Defesa em profundidade: `app/(app)/layout.tsx` vira Server Component e revalida `getUser()`; se não houver usuário, `redirect("/login")`.

## Telas

Novo route group **`app/(auth)/`** com layout próprio (centralizado, tema dark do CRM, sem sidebar):

- **`/login`** — e-mail + senha → `supabase.auth.signInWithPassword`. Link "Esqueci minha senha". Em erro: mensagem genérica "E-mail ou senha inválidos" (sem revelar se o e-mail existe). Sucesso → redireciona para `?redirect` ou `/painel`.
- **`/esqueci-senha`** — informa o e-mail → `resetPasswordForEmail(email, { redirectTo: <origin>/auth/callback?next=/nova-senha })`. Mensagem sempre neutra ("Se o e-mail existir, enviaremos um link"), sem enumeração.
- **`/nova-senha`** — define/redefine a senha (`supabase.auth.updateUser({ password })`). Chega com sessão de recuperação já ativa (via `/auth/callback`). Valida força mínima e confirmação.
- **`/auth/callback`** (route handler) — troca o `code` do link de e-mail por sessão em cookie (`exchangeCodeForSession`) e redireciona para `next`.
- **`/auth/signout`** (route handler, POST) — `signOut()` + limpa cookies → `/login`.

Menu do usuário no topo (Topbar) com nome/e-mail e botão **Sair** (POST para `/auth/signout`).

## Gestão de usuários no CRM (`Configurações → Equipe`)

A tela hoje é mock (`lib/config-data.ts`). Passa a ser real:

- **Listar** usuários: `supabaseAdmin.auth.admin.listUsers()` (via route handler `GET /api/usuarios`).
- **Criar acesso**: `POST /api/usuarios` → `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nome } })`. O admin define uma senha temporária e repassa ao vendedor; acesso imediato.
- **Resetar senha de alguém** (opcional, útil): `POST /api/usuarios/[id]/reset` → dispara link de reset por e-mail, ou redefine direto.
- **Remover acesso**: `DELETE /api/usuarios/[id]` → `admin.deleteUser(id)`.

**Quem pode gerenciar (v1, sem papéis):** qualquer usuário autenticado acessa a tela de Equipe. Como ainda não há papéis, isso é aceito conscientemente para um time pequeno e confiável; fica um `TODO` claro para restringir a admins quando papéis existirem. (Gancho opcional já previsto: se a env `ADMIN_EMAILS` estiver definida, a tela e as rotas de usuários passam a exigir que o e-mail logado esteja na lista; se não estiver definida, ficam abertas a qualquer autenticado.)

## Bootstrap do primeiro usuário

Como os acessos são criados de dentro do CRM, o primeiro admin precisa existir antes de qualquer login. Script único:

- **`scripts/criar-usuario.mjs`** — roda com `node scripts/criar-usuario.mjs <email> <senha> ["Nome"]`, lê `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` do `.env.local`, chama `admin.createUser({ email_confirm: true })`. Também serve de "quebra-galho" se o admin se trancar para fora. Não toca no painel do Supabase.

## Segurança aplicada (checklist)

- Hash de senha bcrypt (responsabilidade do Supabase).
- Cookies de sessão httpOnly + Secure + SameSite=Lax (padrão do `@supabase/ssr`).
- `getUser()` (revalidação server-side) em toda decisão de acesso — middleware **e** layout.
- Toda rota de página e de API atrás do login (exceto allow-list mínima).
- Mensagens sem enumeração de usuário no login e no "esqueci a senha".
- Senha mínima configurável no Supabase (recomendado ≥ 8, com verificação de senha vazada se disponível no plano).
- Rate-limit nativo do Supabase Auth em login/reset.
- Segredos só no servidor: `service_role` nunca vai ao browser; só `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` são públicos.

## O que precisa ser configurado (fora do código)

1. **Supabase → Authentication → Providers → Email** habilitado; senha mínima definida.
2. **SMTP próprio** (ex.: Resend/SendGrid) em Authentication → SMTP — **necessário só para o reset de senha por e-mail**. Login e criação de acesso funcionam sem SMTP.
3. **Redirect URLs** (Authentication → URL Configuration): adicionar `http://localhost:3000/auth/callback` e `https://<dominio-de-producao>/auth/callback`.
4. **`.env.local` / Vercel:** confirmar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. (Opcional: `ADMIN_EMAILS`.)
5. Rodar o script de bootstrap uma vez para criar o primeiro acesso.

## Fora do escopo desta v1

- Papéis/permissões (admin × vendedor) e restrição da tela de Equipe por papel.
- "Dono" do registro = usuário logado (segue `"Gabriel Pereira"`).
- RLS por usuário (rotas seguem em service_role, agora **atrás do login**).
- MFA/2FA.
- SSO/login social (Google etc.).

## Verificação

Sem framework de testes automatizados no repo (mesma decisão dos módulos anteriores). Verificação manual, com Supabase configurado e `.env.local` preenchido:

1. `node scripts/criar-usuario.mjs meu@email.com SenhaForte1` cria o primeiro acesso.
2. Acessar qualquer rota (`/painel`) deslogado → redireciona para `/login`.
3. Logar → cai no `/painel`; recarregar mantém a sessão; `Sair` volta pro login e re-bloqueia.
4. `/api/contatos` sem sessão → 401; com sessão → 200.
5. `/api/whatsapp/webhook` continua acessível sem sessão.
6. "Esqueci a senha" → e-mail chega (com SMTP) → link abre `/nova-senha` → troca a senha → loga com a nova.
7. Em Configurações → Equipe: criar um segundo usuário, logar com ele, remover, e confirmar o bloqueio.
8. `npm run build` passa.
