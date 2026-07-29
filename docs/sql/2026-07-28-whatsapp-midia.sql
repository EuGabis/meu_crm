-- Mídia no WhatsApp (imagem + áudio) — enviar e receber.
-- Rode no SQL editor do Supabase.

-- 1) Colunas de mídia nas mensagens
alter table whatsapp_messages
  add column if not exists media_type text,   -- 'image' | 'audio' | null (texto)
  add column if not exists media_path text,   -- caminho no bucket whatsapp-media
  add column if not exists mime_type text;

-- 2) Bucket privado para os arquivos de mídia.
--    Privado: só o servidor (service_role) lê/grava; o app serve via /api/whatsapp/media (atrás do login).
insert into storage.buckets (id, name, public)
values ('whatsapp-media', 'whatsapp-media', false)
on conflict (id) do nothing;

-- Sem policies de storage: o acesso é feito só pelo service_role no servidor,
-- que ignora RLS. O bucket permanece inacessível publicamente.
