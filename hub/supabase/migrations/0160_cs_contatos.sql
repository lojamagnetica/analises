-- Registro de contato da CS com cada loja (e as checagens que dependem dele, como "a loja viu a análise da semana?").
-- Só a equipe lê e escreve. Nada de dado de cliente neste arquivo.
set lock_timeout = '8s';

create table if not exists public.cs_contatos (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.portais(id) on delete cascade,
  tipo text not null default 'geral',            -- leitura | caixa | acesso | missao | onboarding | geral
  ref text,                                      -- ex.: a semana da leitura (AAAA-MM-DD)
  feito_em timestamptz not null default now(),
  feito_por text,
  resumo text,                                   -- o que a loja respondeu
  precisa_ajuda boolean not null default false,  -- a loja tem uma dificuldade que pede apoio
  proximo_passo text,
  proximo_em date
);
create index if not exists cs_contatos_portal_idx on public.cs_contatos (portal_id, feito_em desc);
alter table public.cs_contatos enable row level security;
drop policy if exists "cs_contatos equipe" on public.cs_contatos;
create policy "cs_contatos equipe" on public.cs_contatos for all using (public.is_equipe()) with check (public.is_equipe());
