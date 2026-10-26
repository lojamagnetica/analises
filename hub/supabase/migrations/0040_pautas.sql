-- Pautas quentes da semana: a equipe escreve os assuntos do momento com o ângulo para a loja e libera.
-- Rascunho até liberar. A loja lê só as liberadas. Sem notícias de política ou fofoca.
set lock_timeout = '8s';

create table if not exists public.pautas (
  id         uuid primary key default gen_random_uuid(),
  semana     date not null,                 -- a segunda-feira da semana
  titulo     text not null default '',
  porque     text not null default '',      -- por que está em alta agora
  angulo     text not null default '',      -- como a loja entra no assunto
  objetivo   text not null default 'Atrair' check (objetivo in ('Atrair', 'Conectar', 'Vender')),
  segmentos  text[] not null default '{}',  -- vazio = vale para todas as lojas
  liberada   boolean not null default false,
  ordem      int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pautas_semana on public.pautas (semana, ordem);
alter table public.pautas enable row level security;
create policy pautas_equipe on public.pautas for all using (public.is_equipe()) with check (public.is_equipe());
create policy pautas_ler on public.pautas for select to authenticated using (liberada);
grant select, insert, update, delete on public.pautas to authenticated;
