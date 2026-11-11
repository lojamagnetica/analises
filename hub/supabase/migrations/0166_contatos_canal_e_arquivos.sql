-- Contatos da CS com as lojas: por onde foi a conversa (WhatsApp, ligação...) e prints/arquivos anexados (mesmo bucket privado das Conversas).
set lock_timeout = '8s';
alter table public.cs_contatos add column if not exists canal text;
alter table public.cs_contatos add column if not exists arquivos jsonb not null default '[]'::jsonb;  -- [{caminho, nome, tipo, tamanho}]
