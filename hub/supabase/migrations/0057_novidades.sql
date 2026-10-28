-- Novidades das lojas: o que a loja faz no Hub vira um aviso para a equipe (tela Novidades + notificação no celular).
-- As chaves do aviso (vapid_publica, vapid_privada, aviso_chave) ficam no Vault, criadas à parte (nunca no repositório).

create table if not exists public.novidades (
  id          bigint generated always as identity primary key,
  portal_id   uuid references public.portais (id) on delete cascade,
  tipo        text not null,
  texto       text not null,
  link        text,
  created_at  timestamptz not null default now()
);
create index if not exists novidades_quando on public.novidades (created_at desc);
alter table public.novidades enable row level security;
create policy novidades_equipe on public.novidades for select using (public.is_equipe());
create policy novidades_limpar on public.novidades for delete using (public.is_equipe());

-- Os aparelhos que recebem a notificação (cada pessoa cuida dos seus).
create table if not exists public.push_assinaturas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);
alter table public.push_assinaturas enable row level security;
create policy push_minhas on public.push_assinaturas for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Só a função de aviso (service_role) lê as chaves e os aparelhos da equipe.
create or replace function public.push_config() returns jsonb
language sql stable security definer set search_path = public, vault as $$
  select jsonb_object_agg(name, decrypted_secret) from vault.decrypted_secrets where name in ('vapid_publica', 'vapid_privada', 'aviso_chave');
$$;
create or replace function public.push_destinos() returns table (id uuid, endpoint text, p256dh text, auth text)
language sql stable security definer set search_path = public as $$
  select a.id, a.endpoint, a.p256dh, a.auth from push_assinaturas a join perfis p on p.id = a.user_id where p.papel = 'equipe';
$$;
revoke all on function public.push_config() from public, anon, authenticated;
revoke all on function public.push_destinos() from public, anon, authenticated;
grant execute on function public.push_config() to service_role;
grant execute on function public.push_destinos() to service_role;

-- Cada novidade chama a função de aviso (notificação no celular da equipe).
create or replace function public.novidade_avisar() returns trigger
language plpgsql security definer set search_path = public, vault as $$
declare chave text;
begin
  select decrypted_secret into chave from vault.decrypted_secrets where name = 'aviso_chave';
  if chave is not null then
    perform net.http_post(
      url := 'https://gnbjberxugnqzbxvzinh.supabase.co/functions/v1/avisar',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-aviso', chave),
      body := jsonb_build_object('texto', new.texto, 'link', new.link));
  end if;
  return new;
end $$;
create trigger novidades_avisar after insert on public.novidades for each row execute function public.novidade_avisar();

-- Registra a novidade (só quando quem fez não é da equipe).
create or replace function public.novidade(p_portal uuid, p_tipo text, p_texto text, p_link text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.is_equipe() then return; end if;
  insert into novidades (portal_id, tipo, texto, link) values (p_portal, p_tipo, left(p_texto, 300), p_link);
exception when others then
  -- O aviso nunca pode impedir a loja de salvar.
  raise warning 'novidade: %', sqlerrm;
end $$;
revoke all on function public.novidade(uuid, text, text, text) from public, anon, authenticated;

create or replace function public.nome_da_loja(p uuid) returns text
language sql stable security definer set search_path = public as $$ select coalesce((select loja from portais where id = p), 'Uma loja') $$;

create or replace function public.nov_historia() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.enviado and (tg_op = 'INSERT' or not old.enviado) then
    perform novidade(new.portal_id, 'historia', '📖 ' || coalesce(nullif(new.loja, ''), 'Uma loja') || ' enviou a história da loja', '/empresa/historias');
  end if;
  return new;
end $$;
create trigger nov_historia after insert or update on public.loja_historia for each row execute function public.nov_historia();

create or replace function public.nov_perfil() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.perfil is not null and new.respostas is distinct from old.respostas then
    perform novidade(new.portal_id, 'perfil', '🧩 ' || new.nome || ' (' || nome_da_loja(new.portal_id) || ') respondeu o teste de perfil', '/pessoas?portal=' || new.portal_id);
  end if;
  return new;
end $$;
create trigger nov_perfil after update on public.loja_equipe for each row execute function public.nov_perfil();

create or replace function public.nov_plano() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'enviado' and (tg_op = 'INSERT' or old.status is distinct from 'enviado') then
    perform novidade(new.portal_id, 'plano', '🗓️ ' || nome_da_loja(new.portal_id) || ' enviou o plano de ' || new.mes, '/equipe/planos');
  end if;
  return new;
end $$;
create trigger nov_plano after insert or update on public.loja_plano_mes for each row execute function public.nov_plano();

create or replace function public.nov_etapa() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.concluida and (tg_op = 'INSERT' or not old.concluida) then
    perform novidade(new.portal_id, 'etapa', '✅ ' || nome_da_loja(new.portal_id) || ' concluiu a etapa ' || new.etapa || ' dos Dados da loja', '/personalizacao?portal=' || new.portal_id);
  end if;
  return new;
end $$;
create trigger nov_etapa after insert or update on public.personalizacao for each row execute function public.nov_etapa();

create or replace function public.nov_duvida() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform novidade(new.portal_id, 'duvida', '💬 ' || nome_da_loja(new.portal_id) || ' mandou uma pergunta no Fale com a Camilla', '/equipe/duvidas');
  return new;
end $$;
create trigger nov_duvida after insert on public.duvidas for each row execute function public.nov_duvida();

create or replace function public.nov_pedido() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform novidade(new.portal_id, 'pedido', '📨 ' || nome_da_loja(new.portal_id) || ': ' || coalesce(nullif(left(new.texto, 80), ''), 'novo pedido'), '/equipe/pendencias');
  return new;
end $$;
create trigger nov_pedido after insert on public.solicitacoes for each row execute function public.nov_pedido();

-- Botão "mandar um aviso de teste" da tela Novidades (só a equipe).
create or replace function public.novidade_teste() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_equipe() then raise exception 'só a equipe'; end if;
  insert into novidades (tipo, texto, link) values ('teste', '🔔 Teste: os avisos do Hub estão chegando neste celular', '/empresa/novidades');
end $$;
revoke all on function public.novidade_teste() from public, anon;
grant execute on function public.novidade_teste() to authenticated;
