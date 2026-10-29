-- Agente do Diagnóstico: a preparação da Camilla para a reunião de diagnóstico, em 3 paradas
-- (Raio-X e proposta → perguntas do gargalo → solução, roteiro e PDF) e depois o Diagnóstico da loja no Hub.
-- Só a Camilla vê a preparação. A CS (Claudia) vê só as perguntas liberadas e cola as respostas da loja.
create table if not exists public.diagnostico_preparo (
  portal_id uuid primary key references public.portais (id) on delete cascade,
  transcricoes jsonb not null default '{}'::jsonb,   -- { comercial, onboarding, outras }
  raiox jsonb,                                       -- parada 1
  escolha jsonb,                                     -- { gargalo, alavanca, obs } (decisão da Camilla)
  perguntas jsonb not null default '[]'::jsonb,      -- parada 2
  perguntas_liberadas boolean not null default false,
  respostas text not null default '',
  solucao jsonb,                                     -- parada 3
  ajustes jsonb not null default '{}'::jsonb,        -- { raiox, perguntas, solucao, hub }: o que refazer
  agente jsonb not null default '{}'::jsonb,         -- { parada, estado, inicio, fim, msg }
  updated_at timestamptz not null default now()
);
alter table public.diagnostico_preparo enable row level security;
drop policy if exists preparo_mentora on public.diagnostico_preparo;
create policy preparo_mentora on public.diagnostico_preparo for all to authenticated using (public.pode_aprovar()) with check (public.pode_aprovar());

-- A CS lê as perguntas liberadas e devolve as respostas da loja (sem ver o resto da preparação).
create or replace function public.diagnostico_perguntas(p_portal uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.is_equipe() then
    (select jsonb_build_object('perguntas', perguntas, 'respostas', respostas, 'gargalo', escolha->>'gargalo')
       from diagnostico_preparo where portal_id = p_portal and perguntas_liberadas) end;
$$;
create or replace function public.diagnostico_responder(p_portal uuid, p_respostas text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_equipe() then raise exception 'Só a equipe.'; end if;
  update diagnostico_preparo set respostas = left(coalesce(p_respostas, ''), 20000), updated_at = now()
    where portal_id = p_portal and perguntas_liberadas;
end $$;
revoke execute on function public.diagnostico_perguntas(uuid) from public, anon;
revoke execute on function public.diagnostico_responder(uuid, text) from public, anon;
grant execute on function public.diagnostico_perguntas(uuid) to authenticated;
grant execute on function public.diagnostico_responder(uuid, text) to authenticated;

-- A versão do Diagnóstico da loja que o agente monta fica aqui; a Camilla compara e aplica (nunca por cima sozinho).
alter table public.diagnostico_preparo add column if not exists hub jsonb;
