-- Ações do Mês: a equipe monta cada ação de mercado validada uma vez e ela aparece em todos os portais.
-- A loja ativa a ação, recebe a meta, segue o cronograma, usa os materiais prontos e lança as vendas.

create table public.acoes (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null,
  resumo      text not null default '',     -- por que funciona
  publico     text,
  oferta      text,
  data_acao   date not null,                -- o dia principal da ação (ex.: a Black Friday)
  inicio      date not null,                -- quando a loja começa a preparar
  fim         date not null,                -- último dia de venda da ação
  aumento     int  not null default 30,     -- % sobre a venda normal do período, para sugerir a meta
  publicada   boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.acao_etapas (
  id        uuid primary key default gen_random_uuid(),
  acao_id   uuid not null references public.acoes (id) on delete cascade,
  ordem     int  not null default 0,
  quando    text not null,                   -- como aparece: "D-15", "Semana 1"…
  dias      int,                             -- dias em relação à data da ação (negativo = antes)
  titulo    text not null,
  tarefas   text[] not null default '{}'
);
create index on public.acao_etapas (acao_id);

create table public.acao_materiais (
  id       uuid primary key default gen_random_uuid(),
  acao_id  uuid not null references public.acoes (id) on delete cascade,
  ordem    int  not null default 0,
  tipo     text not null check (tipo in ('Mensagem', 'Conteúdo', 'Script', 'Vitrine')),
  titulo   text not null,
  texto    text not null                     -- aceita {loja}, {instagram}, {whatsapp}, {seu_nome}
);
create index on public.acao_materiais (acao_id);

-- A ação dentro de cada loja
create table public.loja_acoes (
  id          uuid primary key default gen_random_uuid(),
  portal_id   uuid not null references public.portais (id) on delete cascade,
  acao_id     uuid not null references public.acoes (id) on delete cascade,
  base_diaria numeric(12, 2),                -- venda média de um dia normal
  meta        numeric(12, 2),
  feitas      text[] not null default '{}',  -- tarefas marcadas: "<etapa_id>:<n>"
  repetir     text,
  cortar      text,
  concluida   boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (portal_id, acao_id)
);

create table public.loja_acao_vendas (
  loja_acao_id uuid not null references public.loja_acoes (id) on delete cascade,
  portal_id    uuid not null references public.portais (id) on delete cascade,
  data         date not null,
  valor        numeric(12, 2) not null,
  primary key (loja_acao_id, data)
);

alter table public.acoes            enable row level security;
alter table public.acao_etapas      enable row level security;
alter table public.acao_materiais   enable row level security;
alter table public.loja_acoes       enable row level security;
alter table public.loja_acao_vendas enable row level security;

-- A loja vê só as ações publicadas; a equipe vê e edita todas.
create policy acoes_ler    on public.acoes for select to authenticated using (publicada or public.is_equipe());
create policy acoes_equipe on public.acoes for all using (public.is_equipe()) with check (public.is_equipe());
create policy acao_etapas_ler    on public.acao_etapas for select to authenticated
  using (exists (select 1 from public.acoes a where a.id = acao_id and (a.publicada or public.is_equipe())));
create policy acao_etapas_equipe on public.acao_etapas for all using (public.is_equipe()) with check (public.is_equipe());
create policy acao_materiais_ler    on public.acao_materiais for select to authenticated
  using (exists (select 1 from public.acoes a where a.id = acao_id and (a.publicada or public.is_equipe())));
create policy acao_materiais_equipe on public.acao_materiais for all using (public.is_equipe()) with check (public.is_equipe());
create policy loja_acoes_tudo       on public.loja_acoes       for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
create policy loja_acao_vendas_tudo on public.loja_acao_vendas for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

-- O plano da ação em decisões (ex.: "Meu perfil", "Minha mecânica") e o placar em 3 números:
-- faturamento, peças por atendimento e cadastros novos.
alter table public.acoes add column decisoes jsonb not null default '[]';  -- [{"pergunta": "...", "opcoes": ["..."]}]
alter table public.acoes add column contexto text;                         -- dados de mercado e fontes
alter table public.loja_acoes add column plano jsonb not null default '{}'; -- {"0": "opção escolhida", …}
alter table public.loja_acoes add column meta_pa numeric(6, 2);
alter table public.loja_acoes add column meta_cadastros int;
alter table public.loja_acao_vendas add column pa numeric(6, 2);
alter table public.loja_acao_vendas add column cadastros int;
alter table public.acoes add column venda_inicio date;  -- primeiro dia de venda da ação (a meta conta daqui até o fim)
