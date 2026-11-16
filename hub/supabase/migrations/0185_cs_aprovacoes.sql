-- As demandas do dia da CS passam primeiro pela Camilla: ela aprova cada item do dia e só o aprovado aparece para a Claudia.
-- chave: 'g:<assunto do painel do dia>' ou 'l:<portal_id>:<alerta da loja>'.
set lock_timeout = '8s';
create table if not exists public.cs_aprovacoes (
  dia date not null,
  chave text not null,
  aprovado_por text,
  aprovado_em timestamptz not null default now(),
  primary key (dia, chave)
);
alter table public.cs_aprovacoes enable row level security;
create or replace function public.eu_aprovo() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfis where id = auth.uid() and papel = 'equipe' and aprova);
$$;
drop policy if exists cs_aprovacoes_ver on public.cs_aprovacoes;
create policy cs_aprovacoes_ver on public.cs_aprovacoes for select using (is_equipe());
drop policy if exists cs_aprovacoes_criar on public.cs_aprovacoes;
create policy cs_aprovacoes_criar on public.cs_aprovacoes for insert with check (eu_aprovo());
drop policy if exists cs_aprovacoes_tirar on public.cs_aprovacoes;
create policy cs_aprovacoes_tirar on public.cs_aprovacoes for delete using (eu_aprovo());
