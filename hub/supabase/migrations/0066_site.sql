-- Site (loja virtual): os números do mês, a recompra da base, o atendimento e o checklist da operação.
-- Só aparece nas lojas com 'site' em portais.canais.

-- Números do mês, lançados à mão (da plataforma do site).
create table if not exists public.site_mes (
  portal_id    uuid not null references public.portais (id) on delete cascade,
  mes          text not null,              -- 'AAAA-MM'
  faturamento  numeric not null default 0,
  pedidos      integer not null default 0,
  visitas      integer not null default 0,
  clientes_novos integer not null default 0,
  meta         numeric not null default 0,
  obs          text not null default '',
  updated_at   timestamptz not null default now(),
  primary key (portal_id, mes)
);
alter table public.site_mes enable row level security;
create policy site_mes_loja on public.site_mes for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

-- Clientes do site para a régua de recompra (pós-venda, 30/60/90 dias, aniversário).
-- etapa = o último passo da régua já feito com esse cliente para a compra atual.
create table if not exists public.site_clientes (
  id            uuid primary key default gen_random_uuid(),
  portal_id     uuid not null references public.portais (id) on delete cascade,
  nome          text not null,
  telefone      text not null default '',
  ultima_compra date,
  aniversario   date,
  etapa         text not null default '',
  ultimo_contato date,
  obs           text not null default '',
  created_at    timestamptz not null default now()
);
create index if not exists site_clientes_portal on public.site_clientes (portal_id);
alter table public.site_clientes enable row level security;
create policy site_clientes_loja on public.site_clientes for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

-- Atendimento do site: cada conversa/pedido com responsável e prazo de resposta.
create table if not exists public.site_atendimentos (
  id           uuid primary key default gen_random_uuid(),
  portal_id    uuid not null references public.portais (id) on delete cascade,
  dia          date not null default current_date,
  canal        text not null default '',
  cliente      text not null default '',
  assunto      text not null default '',
  responsavel  text not null default '',
  prazo        date,
  status       text not null default 'aberto', -- aberto | resolvido
  resolvido_em date,
  obs          text not null default '',
  created_at   timestamptz not null default now()
);
create index if not exists site_atendimentos_portal on public.site_atendimentos (portal_id, status);
alter table public.site_atendimentos enable row level security;
create policy site_atendimentos_loja on public.site_atendimentos for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

-- Checklist da operação do site: o que precisa ser feito todo dia/semana/mês, quem faz e quando foi feito.
create table if not exists public.site_operacao (
  id           uuid primary key default gen_random_uuid(),
  portal_id    uuid not null references public.portais (id) on delete cascade,
  item         text not null,
  frequencia   text not null default 'semanal', -- diaria | semanal | mensal
  responsavel  text not null default '',
  feito_em     date,
  ordem        integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists site_operacao_portal on public.site_operacao (portal_id);
alter table public.site_operacao enable row level security;
create policy site_operacao_loja on public.site_operacao for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
