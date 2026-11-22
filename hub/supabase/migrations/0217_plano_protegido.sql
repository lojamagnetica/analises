-- Plano do mês protegido e com histórico (vale para todas as lojas).
-- 1) Toda mudança no plano (dados, status ou devolutiva) fica registrada: quem, quando, antes e depois.
-- 2) Plano aprovado (status ok) não muda pelo Hub, a não ser pela Camilla: a loja muda e manda de novo (status enviado).
set lock_timeout='8s';

create table if not exists loja_plano_historico (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null,
  mes text not null,
  em timestamptz not null default now(),
  quem uuid,
  quem_nome text,
  status_antes text,
  status_depois text,
  retorno_mudou boolean not null default false,
  dados_antes jsonb,
  dados_depois jsonb
);
create index if not exists loja_plano_historico_portal on loja_plano_historico (portal_id, mes, em desc);
alter table loja_plano_historico enable row level security;
drop policy if exists plano_historico_equipe on loja_plano_historico;
create policy plano_historico_equipe on loja_plano_historico for select using (public.is_equipe());

create or replace function public.plano_historico() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.dados is distinct from new.dados or old.status is distinct from new.status or old.retorno is distinct from new.retorno then
    insert into loja_plano_historico (portal_id, mes, quem, quem_nome, status_antes, status_depois, retorno_mudou, dados_antes, dados_depois)
    values (new.portal_id, new.mes, auth.uid(), coalesce((select nome from perfis where id = auth.uid()), case when auth.uid() is null then 'banco (agente ou equipe técnica)' end),
            old.status, new.status, old.retorno is distinct from new.retorno,
            case when old.dados is distinct from new.dados then old.dados end, case when old.dados is distinct from new.dados then new.dados end);
  end if;
  return new;
end $$;
drop trigger if exists plano_historico on loja_plano_mes;
create trigger plano_historico after update on loja_plano_mes for each row execute function public.plano_historico();

create or replace function public.plano_aprovado_guarda() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and old.status = 'ok' and new.status = 'ok' and new.dados is distinct from old.dados and not public.pode_aprovar() then
    raise exception 'O plano já foi aprovado pela Camilla. Para mudar, ajuste e mande de novo.';
  end if;
  return new;
end $$;
drop trigger if exists plano_aprovado_guarda on loja_plano_mes;
create trigger plano_aprovado_guarda before update on loja_plano_mes for each row execute function public.plano_aprovado_guarda();
