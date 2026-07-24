# Contatos real (Supabase) — primeiro módulo da migração do CRM

Data: 2026-07-24

## Contexto e objetivo

O CRM inteiro (exceto o módulo WhatsApp/Inbox, já migrado) roda sobre dados mockados em `lib/*-data.ts`. O usuário quer "limpar o CRM deixando apenas informações reais, para começar a ter controle do sistema" — ou seja, dados reais persistidos em vez de listas fake que resetam a cada reload.

Dado o tamanho do CRM (Contatos, Pipeline, Tarefas, Metas, Notificações, Agenda, Automações, Agentes de IA, Integrações Google/Gmail/Meta Ads), a migração foi quebrada em sub-projetos sequenciais, cada um com seu próprio spec → plano → implementação. Esta spec cobre o **primeiro**: **Contatos**, por ser a entidade base referenciada por Negócios, Atividades, Tarefas e Agenda.

Ordem acordada para os próximos sub-projetos (fora do escopo desta spec): Pipeline (Negócios) → Tarefas/Agenda → Metas/Notificações. Automações, Agentes de IA e as integrações Google/Gmail/Meta Ads ficam de fora da migração por enquanto — são telas decorativas sem motor de execução ou OAuth real por trás; persistir a configuração delas não as tornaria funcionais.

## Arquitetura

Mesmo padrão já estabelecido no módulo WhatsApp: toda escrita/leitura no Supabase acontece em Route Handlers do Next.js (`app/api/contatos/**`), usando a `service_role` key (`lib/supabase/server.ts`). O browser nunca fala com o Supabase diretamente. RLS habilitado na tabela, sem policies para `anon`/`authenticated` — apenas o servidor acessa.

Sem autenticação de usuário ainda (gap conhecido, aceito nas sessões anteriores). O campo de "responsável" do contato mockado (que apontava para pessoas fake como Marina/Rafael) vira um valor fixo (`"Gabriel Pereira"`), preparado para quando a Equipe/Auth virar real.

## Modelo de dados (Supabase)

```sql
create table contacts (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null,
  telefone text not null,
  empresa text not null default '',
  cargo text not null default '',
  status text not null default 'lead',        -- lead | ativo | cliente | inativo
  origem text not null default 'outro',        -- site | indicacao | anuncio | evento | outbound | outro
  valor_estimado numeric not null default 0,
  owner_nome text not null default 'Gabriel Pereira',
  criado_em timestamptz not null default now(),
  ultimo_contato timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table contacts enable row level security;
```

## Endpoints (`app/api/contatos/`)

| Rota | Método | Ação |
|---|---|---|
| `/` | GET | Lista todos os contatos |
| `/` | POST | Cria um contato |
| `/[id]` | PATCH | Edita campos, ou arquiva (`status: "inativo"`) |
| `/[id]` | DELETE | Exclui permanentemente |

## Telas

**`app/(app)/contatos/page.tsx`**: troca o import estático de `CONTATOS` (`lib/mock-data.ts`) por um fetch em `GET /api/contatos` ao montar a página, com recarga manual após criar/editar/arquivar/excluir (sem polling — não é um feed em tempo real como o Inbox). Busca por nome/empresa/e-mail e filtro por status continuam client-side, como hoje.

- **"Novo contato"**: o diálogo já existe na tela, mas hoje não salva nada (`onSubmit` vazio). Passa a fazer `POST /api/contatos` de verdade e atualizar a lista.
- **"Editar"**: diálogo novo (não existe hoje), pré-preenchido com os dados do contato, que faz `PATCH /api/contatos/[id]`.
- **"Arquivar"**: `PATCH` com `{ status: "inativo" }`.
- **"Excluir"**: item novo no menu de ações, com confirmação via `window.confirm` antes de chamar `DELETE /api/contatos/[id]`.
- **"Ver detalhes" / "Criar negócio"**: ficam com `disabled` no menu (sem ação) até existirem, respectivamente, uma página de detalhe do contato e o módulo de Pipeline migrado.

## Erros e casos de borda

- Falha ao criar/editar/excluir → mensagem de erro inline no diálogo (ou um toast simples), sem fechar o diálogo nem perder o que foi digitado.
- Exclusão é permanente — não há tabela de histórico/lixeira nesta spec.
- Sem paginação: a lista carrega todos os contatos de uma vez (volume esperado é pequeno para uma pequena empresa); pode ser revisitado depois se crescer.

## Fora do escopo desta spec

- Página de detalhe do contato.
- Vínculo com Negócios/Atividades/Tarefas (ainda mockados — chega nos próximos sub-projetos).
- Campo de responsável real (depende de Equipe/Auth).
- Automações, Agentes de IA, integrações Google/Gmail/Meta Ads.
- Paginação/busca no servidor.

## Verificação

Sem framework de testes automatizados no repo (mesma decisão do módulo WhatsApp). Verificação manual:

1. Rodar o SQL de criação da tabela no Supabase SQL Editor e confirmar via `curl` no Data API.
2. Testar no navegador: criar, editar, arquivar e excluir um contato de teste, e confirmar que a lista reflete corretamente após cada ação e após recarregar a página.
