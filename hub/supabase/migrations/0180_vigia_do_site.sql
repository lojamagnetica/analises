-- Vigia do site do Hub: a cada 5 minutos o banco abre a página de entrar. Se ela não abrir (como na queda do
-- GitHub de 16/11, a tela do unicórnio), a Camilla e a Claudia recebem um aviso no celular na hora, e outro quando volta.
-- Fica registrado quando caiu e quando voltou (site_quedas), para saber se o problema se repete.
set lock_timeout = '8s';

create table if not exists public.site_vigia (
  id int primary key default 1 check (id = 1),
  ultimo_pedido bigint,
  ok boolean not null default true,
  falhas int not null default 0,
  atualizado timestamptz not null default now()
);
insert into public.site_vigia (id) values (1) on conflict do nothing;
create table if not exists public.site_quedas (
  id bigint generated always as identity primary key,
  caiu_em timestamptz not null default now(),
  voltou_em timestamptz,
  codigo int,
  detalhe text
);
alter table public.site_vigia enable row level security;
alter table public.site_quedas enable row level security;
drop policy if exists site_quedas_equipe on public.site_quedas;
create policy site_quedas_equipe on public.site_quedas for select using (public.is_equipe());

create or replace function public.site_verificar() returns void
language plpgsql security definer set search_path = public, net as $$
declare v record; r record; deu_certo boolean; quem uuid[];
begin
  select * into v from site_vigia where id = 1 for update;
  if v.ultimo_pedido is not null then
    select status_code, timed_out, error_msg into r from net._http_response where id = v.ultimo_pedido;
    if found then
      deu_certo := coalesce(r.status_code, 0) between 200 and 399;
      select array_agg(id) into quem from perfis where papel = 'equipe' and (aprova or conversas_equipe);
      if deu_certo then
        if not v.ok then
          update site_quedas set voltou_em = now() where voltou_em is null;
          perform avisar_equipe(quem, 'O site do Hub voltou ao ar. As lojas já conseguem entrar de novo.', '/equipe/conversas');
        end if;
        update site_vigia set ok = true, falhas = 0 where id = 1;
      else
        -- Avisa na 2ª falha seguida (10 minutos), para não alarmar por um soluço de segundos.
        update site_vigia set falhas = falhas + 1 where id = 1;
        if v.ok and v.falhas + 1 >= 2 then
          update site_vigia set ok = false where id = 1;
          insert into site_quedas (codigo, detalhe) values (r.status_code, left(coalesce(r.error_msg, ''), 300));
          perform avisar_equipe(quem, 'O site do Hub está fora do ar (falha do servidor de hospedagem). Avise as lojas: não é senha, é só tentar de novo em alguns minutos.', '/equipe/conversas');
        end if;
      end if;
    end if;
  end if;
  update site_vigia set ultimo_pedido = net.http_get('https://lojamagnetica.github.io/analises/portal/login/', timeout_milliseconds := 15000), atualizado = now() where id = 1;
end;
$$;
revoke all on function public.site_verificar() from public, anon, authenticated;
select cron.schedule('vigia-do-site', '*/5 * * * *', 'select public.site_verificar()');
