-- PLANEJE AQUI guiado: a loja monta o plano de ação do mês (meta, ações, datas, produtos e as 4 semanas)
-- e envia para a Camilla, que responde "está ok" ou pede ajuste. mes = 'AAAA-MM'.
create table if not exists public.loja_plano_mes (
  portal_id   uuid not null references public.portais (id) on delete cascade,
  mes         text not null check (mes ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  dados       jsonb not null default '{}'::jsonb,
  status      text not null default 'rascunho' check (status in ('rascunho', 'enviado', 'ok', 'ajustar')),
  enviado_em  timestamptz,
  retorno     text,
  retorno_em  timestamptz,
  updated_at  timestamptz not null default now(),
  primary key (portal_id, mes)
);
alter table public.loja_plano_mes enable row level security;
create policy plano_mes_ver on public.loja_plano_mes for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

-- Só a equipe dá o retorno (ok / ajustar). A loja só rascunha e envia.
create or replace function public.plano_mes_guarda() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_equipe() then return new; end if;
  if new.status not in ('rascunho', 'enviado') then
    if tg_op = 'UPDATE' and new.status = old.status then null;
    else raise exception 'Só a equipe responde o plano.'; end if;
  end if;
  if tg_op = 'UPDATE' then
    new.retorno := old.retorno;
    new.retorno_em := old.retorno_em;
  else
    new.retorno := null;
    new.retorno_em := null;
  end if;
  return new;
end $$;
drop trigger if exists plano_mes_guarda on public.loja_plano_mes;
create trigger plano_mes_guarda before insert or update on public.loja_plano_mes
  for each row execute function public.plano_mes_guarda();
