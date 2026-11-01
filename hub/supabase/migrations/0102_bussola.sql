-- Bússola do gestor (Onde está o meu tempo): a disponibilidade da lojista, a rotina montada em cima dela,
-- o que foi feito em cada dia, o estoque parado por produto e os boletos.
-- dispo  = { dias: [1..6], inicio: "09:00", fim: "18:00", horas: {feedback, boletos, numeros, parados, conteudo, gravar: "HH:MM"}, dia: {feedback, boletos, numeros, parados, conteudo, gravar: 0-6} }
-- blocos = [{ id, funcao, titulo, dia (0-6), hora "HH:MM", minutos }]
-- feitos = { "AAAA-MM-DD": [id do bloco] }
create table if not exists public.loja_bussola (
  portal_id  uuid primary key references public.portais (id) on delete cascade,
  dispo      jsonb not null default '{}'::jsonb,
  blocos     jsonb not null default '[]'::jsonb,
  feitos     jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.loja_estoque_itens (
  id          uuid primary key default gen_random_uuid(),
  portal_id   uuid not null references public.portais (id) on delete cascade,
  produto     text not null,
  qtd         int not null default 1,
  dias_parado int not null default 0,
  giro        text,
  postado_em  date,
  objetivo    boolean not null default false,
  obs         text,
  created_at  timestamptz not null default now()
);
create index if not exists loja_estoque_itens_portal on public.loja_estoque_itens (portal_id);

create table if not exists public.loja_boletos (
  id         uuid primary key default gen_random_uuid(),
  portal_id  uuid not null references public.portais (id) on delete cascade,
  descricao  text not null,
  valor      numeric(12, 2) not null default 0,
  vence      date not null,
  pago       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists loja_boletos_portal on public.loja_boletos (portal_id, vence);

alter table public.loja_bussola       enable row level security;
alter table public.loja_estoque_itens enable row level security;
alter table public.loja_boletos       enable row level security;
create policy bussola_loja on public.loja_bussola       for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
create policy estoque_itens_loja on public.loja_estoque_itens for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
create policy boletos_loja on public.loja_boletos       for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
