-- De cliente a fã: a base de clientes de cada loja (Minhas clientes, ações por tipo e resgate).
-- O tipo de cada cliente (Nova, Recorrente, VIP, Em risco, Sumida) é calculado no Hub a partir destes dados.
-- contato_em = dia em que a loja mandou a mensagem de resgate; ela conta como resgatada quando a
-- última compra fica igual ou depois desse dia.
-- O conteúdo do método (o que fazer com cada tipo, mensagens, campanhas, experiência) fica na tabela
-- metodo, chave 'clientes', e não entra no repositório.

create table if not exists public.loja_clientes (
  id            uuid primary key default gen_random_uuid(),
  portal_id     uuid not null references public.portais (id) on delete cascade,
  loja          text,              -- portal com mais de uma loja: de qual loja é a cliente
  nome          text not null,
  whatsapp      text,
  aniversario   date,
  ultima_compra date,
  n_compras     int not null default 0,
  total         numeric not null default 0,
  vendedora     text,
  obs           text,
  contato_em    date,
  created_at    timestamptz default now()
);
create index if not exists loja_clientes_portal_id_idx on public.loja_clientes (portal_id);

alter table public.loja_clientes enable row level security;
create policy loja_clientes_portal on public.loja_clientes for all
  using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
