-- Adiciona o campo Observações aos contatos.
-- Rode no Supabase → SQL Editor antes de usar a importação / o campo Observações.
alter table contacts add column if not exists observacoes text not null default '';
