-- Gincanas para o time da loja: a biblioteca (a equipe Loja Magnética alimenta) e as gincanas que cada loja roda.
-- O conteúdo das gincanas é carregado direto no banco, não neste arquivo (o repositório é público).

create table public.gincanas (
  id            uuid primary key default gen_random_uuid(),
  ordem         int  not null default 0,
  nome          text not null,
  categoria     text,
  comece        boolean not null default false,  -- "comece por aqui"
  objetivo      text not null default '',
  indicadores   text[] not null default '{}',
  duracao       text,
  como_funciona text[] not null default '{}',
  regras        text[] not null default '{}',
  premiacao     text,
  materiais     text[] not null default '{}',
  dica          text,
  publicada     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table public.loja_gincanas (
  id          uuid primary key default gen_random_uuid(),
  portal_id   uuid not null references public.portais (id) on delete cascade,
  gincana_id  uuid not null references public.gincanas (id) on delete cascade,
  indicador   text,
  inicio      date not null,
  fim         date,
  premio      text,
  vencedor    text,
  resultado   text,
  created_at  timestamptz not null default now()
);
create index on public.loja_gincanas (portal_id);

alter table public.gincanas      enable row level security;
alter table public.loja_gincanas enable row level security;

create policy gincanas_ler    on public.gincanas for select to authenticated using (publicada or public.is_equipe());
create policy gincanas_equipe on public.gincanas for all using (public.is_equipe()) with check (public.is_equipe());
create policy loja_gincanas_tudo on public.loja_gincanas for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
