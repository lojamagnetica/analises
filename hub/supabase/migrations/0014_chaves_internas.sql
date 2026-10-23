-- Chaves de uso interno das funções do servidor (ex.: gerar um link de acesso a partir do próprio banco).
-- Sem política nenhuma: só a chave de serviço do Supabase lê. Ninguém do Hub (equipe ou loja) enxerga.
create table public.chaves_internas (nome text primary key, valor text not null, updated_at timestamptz not null default now());
alter table public.chaves_internas enable row level security;
revoke all on public.chaves_internas from anon, authenticated;
