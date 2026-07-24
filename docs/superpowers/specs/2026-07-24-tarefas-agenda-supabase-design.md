# Tarefas/Agenda real (Supabase) — terceiro módulo da migração do CRM

Data: 2026-07-24

## Contexto e objetivo

Terceiro sub-projeto da migração do CRM para dados reais. Ordem: Contatos (migrado) → Pipeline/Negócios (migrado) → **Tarefas/Agenda (esta spec)** → Metas/Notificações.

Hoje `app/(app)/tarefas/page.tsx` e `app/(app)/agenda/page.tsx` são mockadas (`lib/tarefas-data.ts`, `lib/agenda-data.ts`). "Nova tarefa" e "Novo evento" existem na UI mas não fazem nada. Concluir/reabrir uma tarefa funciona só em estado local (some ao recarregar).

A Agenda mostra hoje um banner "Você está vendo uma agenda de exemplo" com link para "Conectar Google Agenda" — o plano de produto original era sincronizar com o Google Calendar via OAuth. Essa spec **não** faz essa integração (é um projeto grande e separado, envolvendo app OAuth no Google e sincronização bidirecional). Em vez disso, cria uma agenda nativa real no Supabase agora; a sincronização com Google Calendar fica como possível projeto futuro, independente desta migração.

## Arquitetura

Mesmo padrão de Contatos e Pipeline: tabelas `tasks` e `events` no Supabase, acessadas só por Route Handlers (`app/api/tarefas/**`, `app/api/eventos/**`) via `service_role` key. RLS habilitado, sem policies para `anon`/`authenticated`. Sem autenticação de usuário ainda — responsável fixo (`"Gabriel Pereira"`), mesmo padrão usado em Contatos e Negócios.

`contact_id`, em ambas as tabelas, usa `on delete set null` (diferente de `deals`, que usa `cascade`): uma tarefa ou evento pode existir sem contato vinculado, e excluir um contato não deve apagar o histórico de tarefas/eventos — só desvincular.

## Modelo de dados (Supabase)

```sql
create table tasks (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  concluida boolean not null default false,
  prioridade text not null default 'media',   -- alta | media | baixa
  vencimento date not null,
  tipo text not null default 'tarefa',         -- ligacao | email | reuniao | nota | tarefa
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
  tipo text not null default 'reuniao',        -- reuniao | call | tarefa | pessoal
  local text not null default '',
  contact_id uuid references contacts(id) on delete set null,
  criado_em timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tasks enable row level security;
alter table events enable row level security;
```

## Endpoints

**`app/api/tarefas/`**
| Rota | Método | Ação |
|---|---|---|
| `/` | GET | Lista todas as tarefas |
| `/` | POST | Cria (`titulo`, `prioridade`, `vencimento`, `tipo`, `contatoId?`) |
| `/[id]` | PATCH | Edita campos, ou alterna `concluida` |
| `/[id]` | DELETE | Exclui permanentemente |

**`app/api/eventos/`**
| Rota | Método | Ação |
|---|---|---|
| `/` | GET | Lista todos os eventos |
| `/` | POST | Cria (`titulo`, `inicio`, `fim`, `tipo`, `local?`, `contatoId?`) |
| `/[id]` | PATCH | Edita campos |
| `/[id]` | DELETE | Exclui permanentemente |

## Telas

**`app/(app)/tarefas/page.tsx`**: troca `TAREFAS`/`getContato`/`getUsuario` (`lib/mock-data.ts`, `lib/tarefas-data.ts`) por fetch real de `/api/tarefas` e `/api/contatos`. Cada linha ganha um menu de ações (não existe hoje) com **Editar** e **Excluir**; concluir/reabrir passa a fazer `PATCH` de verdade. "Nova tarefa" ganha um diálogo (título, prioridade, vencimento, tipo, contato opcional via select). O filtro "Minhas" continua na tela, mas como só existe um responsável fixo, fica equivalente a "Todas" até a Equipe/Auth virar real. `const HOJE = new Date(2026, 6, 24)` vira `new Date()` de verdade, para "Atrasadas"/"Hoje"/"Próximas" continuarem corretas no futuro.

**`app/(app)/agenda/page.tsx`**: troca `EVENTOS` (`lib/agenda-data.ts`) por fetch real de `/api/eventos` e `/api/contatos`. Os eventos reais têm `inicio`/`fim` como timestamp; a página converte, para a semana exibida, cada evento para o formato dia-da-semana (0–6) e hora decimal que o `WeekView` já espera — sem alterar a grade visual em si. "Novo evento" ganha um diálogo (título, data, hora início, hora fim, tipo, local opcional, contato opcional). `const HOJE` também vira `new Date()` real, e `AGORA_HORA` (linha do "agora" na grade) passa a ser calculado a partir da hora atual real, em vez do valor fixo do mock.

**`components/app/agenda/week-view.tsx`**: ganha uma prop opcional `onSelecionar?: (evento: Evento) => void`, chamada ao clicar num bloco de evento — abre o diálogo de edição. Sem outras mudanças na grade.

**`lib/agenda-data.ts`**: perde o array `EVENTOS` (mock morto, substituído pelos dados reais) e `HOJE_INDICE` (não faz mais sentido com datas reais). Mantém `Evento`, `EventoTipo`, `TIPO_LABEL`, `HORA_INICIO`, `HORA_FIM` — usados pelo `WeekView` e pela página.

## Erros e casos de borda

- Falha ao criar/editar/excluir → mensagem de erro inline, sem fechar o diálogo nem perder o que foi digitado.
- Exclusão é permanente — sem lixeira/histórico.
- Evento com `fim` antes de `inicio`: validado no formulário (não permite salvar).
- Sem contatos cadastrados: os selects de contato (opcionais) mostram só a opção "Nenhum contato".

## Fora do escopo desta spec

- Sincronização com Google Calendar (OAuth, bidirecional) — projeto futuro separado, independente desta agenda nativa.
- Responsável real por tarefa (depende de Equipe/Auth).
- Recorrência de eventos/tarefas.
- Notificações/lembretes de vencimento (fica para o sub-projeto de Notificações).
- Painel, Relatórios e demais telas que ainda leem dados mockados continuam como estão.

## Verificação

Sem framework de testes automatizados no repo. Verificação manual:

1. Rodar o SQL de criação das tabelas no Supabase SQL Editor e confirmar via `curl` no Data API.
2. Testar no navegador: criar uma tarefa vinculada a um contato real, concluir/reabrir, editar e excluir — confirmando que tudo persiste após recarregar.
3. Testar no navegador: criar um evento em um dia real da semana atual, confirmar que aparece na grade na posição/horário certos, navegar para a semana seguinte e anterior, editar (clicando no bloco) e excluir.
