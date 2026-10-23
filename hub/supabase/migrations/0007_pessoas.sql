-- Gestão de Pessoas no portal da loja: a equipe da loja, o perfil de cada pessoa,
-- feedbacks, reuniões (semanal e mensal) e o plano de desenvolvimento.
-- Tudo é da loja: cada portal só vê o seu, e a equipe Loja Magnética vê todos (pode_ver).

create table public.loja_equipe (
  id          uuid primary key default gen_random_uuid(),
  portal_id   uuid not null references public.portais (id) on delete cascade,
  nome        text not null,
  funcao      text,
  entrada     date,
  ativo       boolean not null default true,
  -- Teste de perfil: as respostas e a pontuação de cada letra (D, I, S, C)
  respostas   jsonb,
  perfil      jsonb,             -- {"D": n, "I": n, "S": n, "C": n}
  respondido_por text check (respondido_por in ('pessoa', 'gestor')),
  perfil_em   date,
  motor       text check (motor in ('Ganho', 'Reconhecimento', 'Pertencimento', 'Consequência')), -- os 4 motores do querer
  created_at  timestamptz not null default now()
);
create index on public.loja_equipe (portal_id);

create table public.loja_feedbacks (
  id         uuid primary key default gen_random_uuid(),
  portal_id  uuid not null references public.portais (id) on delete cascade,
  pessoa_id  uuid not null references public.loja_equipe (id) on delete cascade,
  tipo       text not null,
  situacao   text not null,
  roteiro    text not null,
  feito      boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.loja_feedbacks (portal_id);

create table public.loja_reunioes (
  id         uuid primary key default gen_random_uuid(),
  portal_id  uuid not null references public.portais (id) on delete cascade,
  tipo       text not null check (tipo in ('semanal', 'mensal')),
  data       date not null,
  dados      jsonb not null default '{}',
  pauta      text not null,
  created_at timestamptz not null default now()
);
create index on public.loja_reunioes (portal_id);

create table public.loja_pdi (
  id          uuid primary key default gen_random_uuid(),
  portal_id   uuid not null references public.portais (id) on delete cascade,
  pessoa_id   uuid not null references public.loja_equipe (id) on delete cascade,
  estagio     text not null default 'Começando' check (estagio in ('Começando', 'Evoluindo', 'Pronto')),
  competencia text not null,
  objetivo    text not null,
  acoes       text not null,
  prazo       date,
  status      text not null default 'Em andamento' check (status in ('Em andamento', 'Concluído')),
  acompanhamento text,
  created_at  timestamptz not null default now()
);
create index on public.loja_pdi (portal_id);

alter table public.loja_equipe    enable row level security;
alter table public.loja_feedbacks enable row level security;
alter table public.loja_reunioes  enable row level security;
alter table public.loja_pdi       enable row level security;

create policy loja_equipe_tudo    on public.loja_equipe    for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
create policy loja_feedbacks_tudo on public.loja_feedbacks for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
create policy loja_reunioes_tudo  on public.loja_reunioes  for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
create policy loja_pdi_tudo       on public.loja_pdi       for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
