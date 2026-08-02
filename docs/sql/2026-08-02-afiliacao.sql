-- Plataforma de Afiliação (v1: Shopee) — tabelas base.
-- Rode no Supabase → SQL Editor antes de usar os módulos de produtos,
-- conteúdos, grupos e disparos.
--
-- Todas as tabelas usam RLS habilitado. O acesso é feito pelo servidor com
-- a service_role (que ignora RLS), atrás do login — mesmo padrão do resto do app.

-- ---------------------------------------------------------------------------
-- 1) Configuração de afiliado por usuário/marketplace
--    codigo_afiliado e cupom guardam dados sensíveis do afiliado.
-- ---------------------------------------------------------------------------
create table if not exists affiliate_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  marketplace text not null default 'shopee'
    check (marketplace in ('shopee', 'mercado_livre')),
  codigo_afiliado text not null default '',
  cupom text not null default '',
  criado_em timestamptz not null default now(),
  unique (user_id, marketplace)
);

alter table affiliate_configs enable row level security;

-- ---------------------------------------------------------------------------
-- 2) Produtos buscados na Shopee (ranqueáveis por comissão × vendas)
--    external_id = id do produto no marketplace (itemid/shopid da Shopee).
-- ---------------------------------------------------------------------------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  marketplace text not null default 'shopee'
    check (marketplace in ('shopee', 'mercado_livre')),
  external_id text not null,
  nome text not null,
  imagem_url text not null default '',
  preco numeric not null default 0,
  comissao_pct numeric not null default 0,   -- % de comissão de afiliado
  vendas integer not null default 0,          -- volume de vendas
  avaliacao numeric not null default 0,       -- nota média (0-5)
  link_afiliado text not null default '',     -- link de afiliado gerado
  buscado_em timestamptz not null default now(),
  unique (marketplace, external_id)
);

alter table products enable row level security;

create index if not exists products_ranking_idx
  on products (comissao_pct desc, vendas desc);

-- ---------------------------------------------------------------------------
-- 3) Conteúdos gerados (WhatsApp e Instagram)
--    Instagram NUNCA é enviado automaticamente: passa por aprovação manual.
-- ---------------------------------------------------------------------------
create table if not exists contents (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  tipo text not null check (tipo in ('whatsapp', 'instagram')),
  texto text not null default '',
  imagem_sugerida text not null default '',   -- sugestão de imagem (Instagram)
  status text not null default 'rascunho'
    check (status in ('rascunho', 'aguardando_aprovacao', 'aprovado', 'enviado')),
  criado_em timestamptz not null default now()
);

alter table contents enable row level security;

create index if not exists contents_product_idx on contents (product_id);
create index if not exists contents_status_idx on contents (tipo, status);

-- ---------------------------------------------------------------------------
-- 4) Grupos de WhatsApp cadastrados
--    identificador_grupo = JID do grupo na Evolution API (ex.: 12036...@g.us)
-- ---------------------------------------------------------------------------
create table if not exists whatsapp_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  identificador_grupo text not null,          -- JID (@g.us)
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (user_id, identificador_grupo)
);

alter table whatsapp_groups enable row level security;

-- ---------------------------------------------------------------------------
-- 5) Log de disparos (auditoria: qual conteúdo foi para qual grupo e quando)
-- ---------------------------------------------------------------------------
create table if not exists dispatch_log (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references contents(id) on delete cascade,
  group_id uuid not null references whatsapp_groups(id) on delete cascade,
  enviado_em timestamptz not null default now(),
  status text not null default 'enviado'
    check (status in ('enviado', 'falhou', 'pausado')),
  erro text                                    -- mensagem de erro quando falhou
);

alter table dispatch_log enable row level security;

create index if not exists dispatch_log_content_idx on dispatch_log (content_id);
create index if not exists dispatch_log_group_idx on dispatch_log (group_id);
create index if not exists dispatch_log_enviado_idx on dispatch_log (enviado_em desc);

-- ---------------------------------------------------------------------------
-- 6) Configuração de disparo (limites anti-ban + pausa de emergência)
--    Linha única de configuração global (§3.4 da especificação).
-- ---------------------------------------------------------------------------
create table if not exists dispatch_settings (
  id uuid primary key default gen_random_uuid(),
  msgs_por_minuto integer not null default 10,
  msgs_por_hora integer not null default 200,
  intervalo_ms integer not null default 6000,  -- pausa entre mensagens
  pausado boolean not null default false,       -- botão de pausa de emergência
  atualizado_em timestamptz not null default now()
);

alter table dispatch_settings enable row level security;

-- Semente da linha única de configuração (só se ainda não existir).
insert into dispatch_settings (msgs_por_minuto, msgs_por_hora, intervalo_ms, pausado)
select 10, 200, 6000, false
where not exists (select 1 from dispatch_settings);
