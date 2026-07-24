# Pipeline/Negócios real (Supabase) — segundo módulo da migração do CRM

Data: 2026-07-24

## Contexto e objetivo

Continuação da migração do CRM de dados mockados para o Supabase. Ordem combinada com o usuário: Contatos (já migrado) → **Pipeline/Negócios (esta spec)** → Tarefas/Agenda → Metas/Notificações.

A tela de Pipeline hoje (`app/(app)/pipeline/page.tsx`) é só leitura mockada: um Kanban com os negócios de `lib/mock-data.ts` (`NEGOCIOS`), com a única ação real sendo mover um card entre etapas (que nem persiste, é só estado local). Não existe criar, editar ou excluir negócio em lugar nenhum da UI atual.

Como Contatos já é real (tabela `contacts`, ref `qhrnnunkjlhipispkusy`), os negócios novos devem referenciar contatos reais — não mais os ids fake do mock (`c1`–`c14`).

## Arquitetura

Mesmo padrão do módulo WhatsApp e de Contatos: tabela `deals` no Supabase, acessada só por Route Handlers (`app/api/negocios/**`) via `service_role` key (`lib/supabase/server.ts`). RLS habilitado, sem policies para `anon`/`authenticated`. Sem autenticação de usuário ainda (gap conhecido, aceito nas sessões anteriores) — owner fixo (`"Gabriel Pereira"`), mesmo padrão de Contatos.

## Modelo de dados (Supabase)

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

`contact_id` referencia `contacts(id)` com `on delete cascade`: excluir um contato remove os negócios vinculados a ele.

## Endpoints (`app/api/negocios/`)

| Rota | Método | Ação |
|---|---|---|
| `/` | GET | Lista todos os negócios |
| `/` | POST | Cria um negócio (`titulo`, `contatoId`, `empresa`, `valor`, `fechamentoPrevisto?`) |
| `/[id]` | PATCH | Edita campos, ou move de etapa (`stage`) |
| `/[id]` | DELETE | Exclui permanentemente |

## Telas

**`app/(app)/pipeline/page.tsx`**: troca `NEGOCIOS`/`getContato` (`lib/mock-data.ts`) por dados reais — busca `GET /api/negocios` e `GET /api/contatos` ao montar, e faz o mesmo lookup client-side que a tela já faz hoje (equivalente a `getContato`), só que a partir dos dados buscados em vez de import estático.

- Menu "..." de cada card (hoje só "Mover para"): ganha **"Editar"** e **"Excluir"**, além do que já existe.
- **Novo botão "Novo negócio"** na barra de ações, abrindo um diálogo com um select dos contatos reais.
- **"Mover para"**: continua funcionando igual, mas agora com `PATCH /api/negocios/[id]` (`{ stage }`) de verdade.

**Diálogo "Novo negócio"** (`components/app/negocios/novo-negocio-dialog.tsx`, reutilizável): campos título, contato (select), empresa, valor, data prevista de fechamento (opcional). Usado em dois lugares:
- Pipeline: contato escolhido livremente no select.
- Contatos (menu de ações → "Criar negócio", hoje desabilitado): abre o mesmo diálogo com o contato **pré-selecionado e travado**.

**Diálogo "Editar negócio"**: título, empresa, valor, probabilidade, data prevista de fechamento. Não permite trocar o contato vinculado — reatribuir um negócio para outro contato fica fora do escopo.

**Botão "Criar negócio" do Inbox** (`components/app/inbox/contact-panel.tsx`): continua desabilitado. As conversas do WhatsApp ainda não têm um contato real vinculado (`contatoId` sempre vazio — ligar Inbox↔Contatos é um projeto à parte, fora desta spec).

## Erros e casos de borda

- Sem contatos cadastrados: o diálogo "Novo negócio" mostra aviso pedindo para cadastrar um contato primeiro (o select fica vazio).
- Falha ao criar/editar/mover/excluir → mensagem de erro inline, sem fechar o diálogo nem perder o que foi digitado.
- Exclusão é permanente — sem lixeira/histórico.
- Excluir um contato exclui em cascata os negócios vinculados a ele (comportamento do banco, não uma ação separada na UI de Negócios).

## Fora do escopo desta spec

- Reatribuir um negócio para outro contato.
- Ligar o botão "Criar negócio" do Inbox (depende da integração Inbox↔Contatos, ainda não construída).
- Vínculo com Atividades/Tarefas/Agenda (próximos sub-projetos).
- Painel, Relatórios e demais telas que hoje leem `NEGOCIOS`/`CONTATOS` do mock continuam mockadas — só a tela de Pipeline passa a usar dados reais nesta spec.

## Verificação

Sem framework de testes automatizados no repo. Verificação manual:

1. Rodar o SQL de criação da tabela no Supabase SQL Editor e confirmar via `curl` no Data API.
2. Testar no navegador: criar um negócio vinculado a um contato real, movê-lo entre etapas, editá-lo, e excluí-lo — confirmando que tudo persiste após recarregar a página.
3. Testar o fluxo "Criar negócio" a partir da tela de Contatos, com o contato pré-selecionado.
