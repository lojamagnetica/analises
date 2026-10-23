-- Portal de Consultoria: meses, frentes e como funciona (dados), entregas mês a mês e ações da quinzena.
-- A loja lê tudo do próprio portal e marca as próprias ações como feitas; a equipe cuida do resto.
create table public.consultoria (
  portal_id  uuid primary key references public.portais (id) on delete cascade,
  dados      jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
create table public.consultoria_entregas (
  id           uuid primary key default gen_random_uuid(),
  portal_id    uuid not null references public.portais (id) on delete cascade,
  ordem        int  not null default 0,
  mes          text not null,
  frente       int  not null,
  entrega      text not null,
  status       text not null default 'A fazer' check (status in ('A fazer', 'Em andamento', 'Entregue')),
  material_url text
);
create index on public.consultoria_entregas (portal_id, ordem);
create table public.consultoria_acoes (
  id         uuid primary key default gen_random_uuid(),
  portal_id  uuid not null references public.portais (id) on delete cascade,
  acao       text not null,
  quem       text,
  prazo      date,
  tipo       text not null default 'Ação da loja' check (tipo in ('Ação da loja', 'Entrega Loja Magnética')),
  status     text not null default 'A fazer' check (status in ('A fazer', 'Fazendo', 'Feito')),
  obs        text,
  created_at timestamptz not null default now()
);
create index on public.consultoria_acoes (portal_id, prazo);
alter table public.consultoria          enable row level security;
alter table public.consultoria_entregas enable row level security;
alter table public.consultoria_acoes    enable row level security;
create policy consultoria_ler    on public.consultoria for select using (public.pode_ver(portal_id));
create policy consultoria_equipe on public.consultoria for all using (public.is_equipe()) with check (public.is_equipe());
create policy entregas_ler    on public.consultoria_entregas for select using (public.pode_ver(portal_id));
create policy entregas_equipe on public.consultoria_entregas for all using (public.is_equipe()) with check (public.is_equipe());
create policy acoes_ler    on public.consultoria_acoes for select using (public.pode_ver(portal_id));
create policy acoes_marcar on public.consultoria_acoes for update using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
create policy acoes_equipe on public.consultoria_acoes for all using (public.is_equipe()) with check (public.is_equipe());
