-- Webinar: o formulário da oferta (Sessão Estratégica de Fim de Ano) dentro do Hub.
-- A lojista responde pelo link público /sessao (sem login); as respostas caem aqui e só a equipe vê.
set lock_timeout = '8s';

create table if not exists public.webinar_sessoes (
  id            uuid primary key default gen_random_uuid(),
  origem        text not null default 'webinar',
  nome          text not null,
  whatsapp      text not null,
  loja          text not null default '',
  instagram     text not null default '',
  cidade        text not null default '',
  tempo_loja    text not null default '',
  equipe        text not null default '',
  faturamento   text not null default '',
  desafio       text not null default '',
  cadastro      text not null default '',
  meta_dezembro text not null default '',
  interesse     text not null default '',
  status        text not null default 'novo' check (status in ('novo', 'chamado', 'agendado', 'feito', 'sem_interesse')),
  obs           text not null default '',
  created_at    timestamptz not null default now()
);
create index if not exists webinar_sessoes_criado on public.webinar_sessoes (created_at desc);
alter table public.webinar_sessoes enable row level security;
create policy webinar_sessoes_equipe on public.webinar_sessoes for all using (public.is_equipe()) with check (public.is_equipe());

-- Envio pelo link público: só grava, com tamanho limitado em cada campo.
create or replace function public.webinar_sessao_enviar(p jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  c text := '';
  campo text;
  v jsonb := '{}'::jsonb;
begin
  foreach campo in array array['origem','nome','whatsapp','loja','instagram','cidade','tempo_loja','equipe','faturamento','desafio','cadastro','meta_dezembro','interesse'] loop
    v := v || jsonb_build_object(campo, left(trim(coalesce(p->>campo, '')), 300));
  end loop;
  if length(v->>'nome') < 2 or length(regexp_replace(v->>'whatsapp', '\D', '', 'g')) < 10 then return false; end if;
  c := lower(regexp_replace(v->>'origem', '[^a-zA-Z0-9-]', '', 'g'));
  insert into public.webinar_sessoes (origem, nome, whatsapp, loja, instagram, cidade, tempo_loja, equipe, faturamento, desafio, cadastro, meta_dezembro, interesse)
  values (coalesce(nullif(left(c, 40), ''), 'webinar'), v->>'nome', v->>'whatsapp', v->>'loja', v->>'instagram', v->>'cidade', v->>'tempo_loja',
          v->>'equipe', v->>'faturamento', v->>'desafio', v->>'cadastro', v->>'meta_dezembro', v->>'interesse');
  return true;
end $$;
revoke execute on function public.webinar_sessao_enviar(jsonb) from public;
grant execute on function public.webinar_sessao_enviar(jsonb) to anon, authenticated;
