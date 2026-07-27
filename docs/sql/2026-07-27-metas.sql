-- Meta comercial do time (linha única de configuração).
-- Rode no Supabase → SQL Editor antes de usar a tela de Metas.
create table if not exists metas (
  id uuid primary key default gen_random_uuid(),
  alvo_receita numeric not null default 0,
  alvo_negocios integer not null default 0,
  atualizado_em timestamptz not null default now()
);

alter table metas enable row level security;
