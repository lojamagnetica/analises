-- Reuniões gravadas (Tactiq): o agente lê as gravações e deixa, em rascunho, o resumo para a loja, os combinados e o que a CS acompanha.
-- A Camilla revisa e aprova na tela "Reuniões para revisar". Nada vai para a loja sem aprovação. Sem dado de cliente neste arquivo.
set lock_timeout = '8s';
create table if not exists public.reunioes_gravadas (
  id uuid primary key default gen_random_uuid(),
  tactiq_id text not null unique,
  tactiq_url text,
  portal_id uuid references public.portais(id) on delete set null,
  titulo text,
  data date,
  duracao_min integer,
  participantes text[] not null default '{}',
  status text not null default 'rascunho',      -- rascunho | aprovada | descartada | sem_loja
  resumo_loja text,                              -- o texto que a loja lê, se a Camilla liberar
  interno text,                                  -- só para a equipe
  combinados jsonb not null default '[]'::jsonb, -- [{texto, quem, prazo}]
  para_claudia jsonb not null default '[]'::jsonb, -- [{texto, prazo}]
  criado_em timestamptz not null default now(),
  decidido_em timestamptz,
  decidido_por text
);
create index if not exists reunioes_gravadas_idx on public.reunioes_gravadas (status, data desc);
alter table public.reunioes_gravadas enable row level security;
drop policy if exists gravadas_ler on public.reunioes_gravadas;
create policy gravadas_ler on public.reunioes_gravadas for select using (public.is_equipe());
drop policy if exists gravadas_montar on public.reunioes_gravadas;
create policy gravadas_montar on public.reunioes_gravadas for all using (public.pode_montar()) with check (public.pode_montar());
-- Combinados em rascunho (vindos da reunião) não aparecem para a loja até a Camilla aprovar.
drop policy if exists combinados_ler on public.loja_combinados;
create policy combinados_ler on public.loja_combinados for select using (public.pode_ver(portal_id) and (status <> 'rascunho' or public.is_equipe()));
