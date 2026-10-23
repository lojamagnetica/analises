-- F1 · Fundação: planos, a ficha única de cada loja (Carteira), contratos e a função de cada pessoa da equipe.
-- Tudo aqui é só da equipe: a cliente continua vendo apenas o próprio portal.

-- ───────────── Planos ─────────────

create table public.planos (
  id       text primary key,
  nome     text not null,
  tipo     text not null default 'Mentoria' check (tipo in ('Mentoria', 'Consultoria')),
  meses    int,
  valor    numeric(12, 2),
  -- false = plano antigo: não é mais vendido, só vale para quem já tem contrato.
  vendendo boolean not null default true,
  ordem    int not null default 0
);

insert into public.planos (id, nome, tipo, meses, valor, vendendo, ordem) values
  ('premium',        'Premium',          'Mentoria',    6,  18000, true,  1),
  ('gold',           'Gold',             'Mentoria',    6,  12000, true,  2),
  ('start',          'Start',            'Mentoria',    4,   5000, true,  3),
  ('consultoria-3m', 'Consultoria 3m',   'Consultoria', 3,  20000, true,  4),
  ('consultoria-6m', 'Consultoria 6m',   'Consultoria', 6,  30000, true,  5),
  ('pro-12',         'Magnética PRO 12', 'Mentoria',    12, null,  false, 6),
  ('grupo-6m',       'Grupo 6M',         'Mentoria',    6,  null,  false, 7);

-- ───────────── Ficha da loja (a Carteira) ─────────────

create table public.fichas (
  portal_id        uuid primary key references public.portais (id) on delete cascade,
  plano_id         text references public.planos (id),
  programa_notion  text,             -- o programa como estava escrito no Notion (histórico)
  jornada          text check (jornada in ('Nova jornada', 'Contrato anterior')),
  situacao         text not null default 'Em andamento'
                   check (situacao in ('Não iniciada', 'Em andamento', 'Acompanhamento', 'Finalizada')),
  etapa            int check (etapa between 1 and 8),
  termometro       text check (termometro in ('Verde', 'Amarelo', 'Vermelho')),
  termometro_em    date,
  resultado_n1     text,             -- o gargalo escrito no Contrato de Foco
  indicador        text,             -- início · hoje · meta
  fundamentos      text[] not null default '{}',
  condicao_especial text,
  instagram        text,
  grupo_whatsapp   text,
  pasta_interna    text,
  notion_url       text,
  data_diagnostico date,
  responsavel_cs   uuid references public.perfis (id) on delete set null,
  observacoes      text,
  updated_at       timestamptz not null default now()
);

-- Todo portal tem a sua ficha, criada junto com ele.
create function public.criar_ficha() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.fichas (portal_id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger ao_criar_portal
  after insert on public.portais
  for each row execute function public.criar_ficha();

insert into public.fichas (portal_id) select id from public.portais on conflict do nothing;

-- ───────────── Contratos ─────────────

create table public.contratos (
  id         uuid primary key default gen_random_uuid(),
  portal_id  uuid not null references public.portais (id) on delete cascade,
  plano_id   text references public.planos (id),
  inicio     date,
  fim        date,
  valor      numeric(12, 2),
  condicao   text,
  status     text not null default 'Ativo' check (status in ('Ativo', 'Encerrado', 'Renovado')),
  created_at timestamptz not null default now()
);
create index on public.contratos (portal_id);
create index on public.contratos (fim);

-- ───────────── Equipe ─────────────

alter table public.perfis add column funcao text;  -- ex.: Mentora, CS e ADM, Comercial

-- ───────────── Segurança ─────────────

alter table public.planos    enable row level security;
alter table public.fichas    enable row level security;
alter table public.contratos enable row level security;

create policy planos_equipe    on public.planos    for all using (public.is_equipe()) with check (public.is_equipe());
create policy fichas_equipe    on public.fichas    for all using (public.is_equipe()) with check (public.is_equipe());
create policy contratos_equipe on public.contratos for all using (public.is_equipe()) with check (public.is_equipe());

revoke execute on function public.criar_ficha() from public, anon, authenticated;
