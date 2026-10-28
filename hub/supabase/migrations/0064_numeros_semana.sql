-- Números da semana: para a loja que não lança o caixa no Hub (usa o próprio sistema), um resumo por semana.
-- semana = a segunda-feira da semana informada. A leitura da semana usa estes números quando não há caixa lançado.
create table if not exists public.loja_numeros_semana (
  portal_id   uuid not null references public.portais (id) on delete cascade,
  semana      date not null,
  faturamento numeric not null default 0,
  vendas      integer not null default 0,
  pecas       integer not null default 0,
  obs         text not null default '',
  updated_at  timestamptz not null default now(),
  primary key (portal_id, semana)
);
alter table public.loja_numeros_semana enable row level security;
create policy numeros_loja on public.loja_numeros_semana for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

-- Novidade para a equipe quando a loja manda os números.
create or replace function public.nov_numeros() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform novidade(new.portal_id, 'numeros', '📈 ' || nome_da_loja(new.portal_id) || ' mandou os números da semana', '/inicio?portal=' || new.portal_id);
  return new;
end $$;
create trigger nov_numeros after insert on public.loja_numeros_semana for each row execute function public.nov_numeros();
