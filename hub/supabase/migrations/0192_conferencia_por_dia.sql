-- A conferência das Regras do caixa passa a ser um dia por chamada (o mês inteiro numa chamada estourava o tempo).
-- Cada dia grava o resultado; o último fecha a rodada, avisa a Camilla e monta de novo a análise da semana.
set lock_timeout = '8s';
create table if not exists public.caixa_conferencias (
  id uuid primary key default gen_random_uuid(),
  run uuid not null, portal_id uuid not null references public.portais(id) on delete cascade,
  dia date not null, loja text, total int not null, situacao text not null, texto text, fechada boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists caixa_conferencias_run on public.caixa_conferencias(run);
alter table public.caixa_conferencias enable row level security;
drop policy if exists caixa_conferencias_equipe on public.caixa_conferencias;
create policy caixa_conferencias_equipe on public.caixa_conferencias for select using (is_equipe());

-- Dispara a conferência: um pedido por dia (com caixa lançado ou arquivo do caixa) desde a data, até ontem.
create or replace function public.caixa_conferir(p_portal uuid, p_desde date) returns int
language plpgsql security definer set search_path = public, net, vault, storage as $$
declare chave text; run uuid := gen_random_uuid(); dias date[]; total int; d date;
  ontem date := (now() at time zone 'America/Recife')::date - 1;
begin
  select decrypted_secret into chave from vault.decrypted_secrets where name = 'aviso_chave';
  if chave is null then return 0; end if;
  select array_agg(distinct x order by x) into dias from (
    select k.dia x from loja_caixa k where k.portal_id = p_portal and k.dia between p_desde and ontem
    union
    select split_part(o.name, '/', 4)::date from storage.objects o
     where o.bucket_id = 'relatorios' and split_part(o.name, '/', 1) = p_portal::text and split_part(o.name, '/', 2) = 'gestao'
       and split_part(o.name, '/', 4) ~ '^\d{4}-\d{2}-\d{2}$' and split_part(o.name, '/', 5) like 'caixa\_%'
       and split_part(o.name, '/', 4)::date between p_desde and ontem) t;
  total := coalesce(array_length(dias, 1), 0);
  foreach d in array coalesce(dias, '{}') loop
    perform net.http_post(
      url := 'https://gnbjberxugnqzbxvzinh.supabase.co/functions/v1/caixa-arquivos',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-aviso', chave),
      body := jsonb_build_object('conferir_dia', true, 'run', run, 'portal_id', p_portal, 'dia', d, 'total', total),
      timeout_milliseconds := 60000);
  end loop;
  return total;
end $$;
revoke all on function public.caixa_conferir(uuid, date) from public, anon, authenticated;

create or replace function public.regras_caixa_confirmadas() returns trigger
language plpgsql security definer set search_path = public as $$
declare camilla uuid[]; nome text; n int;
begin
  if new.confirmado_em is null or new.confirmado_em is not distinct from (case when tg_op = 'UPDATE' then old.confirmado_em end) then return new; end if;
  select loja into nome from portais where id = new.portal_id;
  select array_agg(id) into camilla from perfis where papel = 'equipe' and aprova;
  n := caixa_conferir(new.portal_id, date_trunc('month', (now() at time zone 'America/Recife'))::date);
  perform avisar_equipe(camilla, nome || ' confirmou as Regras do caixa. Estou conferindo ' || n || ' dias com as regras; o resultado chega nas Conversas.', '/equipe/conversas');
  return new;
end $$;
