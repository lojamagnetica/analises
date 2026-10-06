-- Hub Loja Magnética · estrutura do banco
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Depois rode 0002_conteudo.sql.

-- ───────────── Portais e pessoas ─────────────

create table public.portais (
  id            uuid primary key default gen_random_uuid(),
  loja          text not null,
  responsavel   text,
  email         text,
  whatsapp      text,
  tipo          text not null default 'Mentoria'
                check (tipo in ('Mentoria', 'Mentoria VIP Anual', 'Consultoria')),
  inicio        date,
  passo_atual   int  not null default 1 check (passo_atual between 1 and 7),
  meet_url      text,
  -- Nomes que identificam a loja no título dos eventos da agenda (ex.: {'Shiê','Shie'})
  apelidos      text[] not null default '{}',
  ativo         boolean not null default true,
  created_at    timestamptz not null default now()
);

create table public.perfis (
  id             uuid primary key references auth.users (id) on delete cascade,
  nome           text,
  email          text,
  papel          text not null default 'mentorado' check (papel in ('equipe', 'mentorado')),
  portal_id      uuid references public.portais (id) on delete set null,
  ultimo_acesso  timestamptz,
  created_at     timestamptz not null default now()
);

-- Todo usuário novo vira "mentorado" sem portal. Quem define papel e portal é a equipe
-- (pelo Hub, com a chave de serviço). Assim ninguém se promove a equipe sozinho.
create function public.criar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, email, nome)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil();

create function public.is_equipe() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and papel = 'equipe')
$$;

create function public.meu_portal() returns uuid
language sql stable security definer set search_path = public as $$
  select portal_id from public.perfis where id = auth.uid()
$$;

create function public.pode_ver(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_equipe() or (p is not null and p = public.meu_portal())
$$;

create function public.registrar_acesso() returns void
language sql security definer set search_path = public as $$
  update public.perfis set ultimo_acesso = now() where id = auth.uid()
$$;

-- ───────────── Conteúdo de cada portal ─────────────

create table public.personalizacao (
  portal_id   uuid not null references public.portais (id) on delete cascade,
  etapa       int  not null check (etapa between 1 and 7),
  respostas   jsonb not null default '{}',
  concluida   boolean not null default false,
  updated_at  timestamptz not null default now(),
  primary key (portal_id, etapa)
);

create table public.plano_itens (
  id         uuid primary key default gen_random_uuid(),
  portal_id  uuid not null references public.portais (id) on delete cascade,
  mes        int  not null check (mes between 1 and 3),
  ordem      int  not null default 0,
  texto      text not null,
  feito      boolean not null default false,
  feito_em   timestamptz
);

create table public.reunioes (
  id             uuid primary key default gen_random_uuid(),
  portal_id      uuid not null references public.portais (id) on delete cascade,
  titulo         text not null,
  data           timestamptz not null,
  selecionar     text not null default 'Pendente' check (selecionar in ('Pendente', 'Adiado', 'Realizado')),
  status         text not null default 'Não iniciada' check (status in ('Não iniciada', 'Em andamento', 'Concluído')),
  gravacao_url   text,
  ata            text,
  gcal_event_id  text unique,
  created_at     timestamptz not null default now()
);

create table public.planeje (
  portal_id   uuid not null references public.portais (id) on delete cascade,
  mes         int  not null check (mes between 0 and 11),
  bloco       text not null,
  texto       text not null default '',
  updated_at  timestamptz not null default now(),
  primary key (portal_id, mes, bloco)
);

create table public.kanban_cards (
  id          uuid primary key default gen_random_uuid(),
  portal_id   uuid not null references public.portais (id) on delete cascade,
  titulo      text not null,
  coluna      int  not null default 0 check (coluna between 0 and 4),
  created_at  timestamptz not null default now()
);

create table public.notas (
  id          uuid primary key default gen_random_uuid(),
  portal_id   uuid not null references public.portais (id) on delete cascade,
  autor       uuid references auth.users (id) on delete set null,
  titulo      text not null default 'Sem título',
  conteudo    text not null default '',
  created_at  timestamptz not null default now()
);

create table public.duvidas (
  id              uuid primary key default gen_random_uuid(),
  portal_id       uuid not null references public.portais (id) on delete cascade,
  autor           uuid references auth.users (id) on delete set null,
  pergunta        text not null,
  resposta        text,
  respondida_por  uuid references auth.users (id) on delete set null,
  respondida_em   timestamptz,
  created_at      timestamptz not null default now()
);

create table public.chat_mensagens (
  id          uuid primary key default gen_random_uuid(),
  portal_id   uuid not null references public.portais (id) on delete cascade,
  autor       uuid references auth.users (id) on delete set null,
  papel       text not null check (papel in ('user', 'assistant')),
  conteudo    text not null,
  created_at  timestamptz not null default now()
);

create index on public.plano_itens (portal_id, mes, ordem);
create index on public.reunioes (portal_id, data);
create index on public.kanban_cards (portal_id);
create index on public.notas (portal_id, created_at desc);
create index on public.duvidas (portal_id, created_at desc);
create index on public.chat_mensagens (portal_id, created_at);
create index on public.perfis (portal_id);

-- ───────────── Biblioteca (a equipe edita uma vez, vale para todos) ─────────────

create table public.jornada_passos (
  numero     int primary key check (numero between 1 and 7),
  titulo     text not null,
  descricao  text not null default '',
  conteudo   text not null default ''
);

create table public.script_categorias (
  id      text primary key,
  titulo  text not null,
  icone   text not null default 'chat',
  cor     text not null default '#C2341B',
  ordem   int  not null default 0
);

create table public.scripts (
  id          uuid primary key default gen_random_uuid(),
  categoria   text not null references public.script_categorias (id) on delete cascade,
  titulo      text not null,
  quando      text not null default '',
  texto       text not null,
  ordem       int  not null default 0
);

create table public.plano_modelo (
  id     uuid primary key default gen_random_uuid(),
  mes    int  not null check (mes between 1 and 3),
  ordem  int  not null default 0,
  texto  text not null
);

create table public.aulas (
  id         uuid primary key default gen_random_uuid(),
  modulo     text not null,
  titulo     text not null,
  descricao  text not null default '',
  video_url  text,
  ordem      int  not null default 0
);

create table public.datas_comerciais (
  id      uuid primary key default gen_random_uuid(),
  mes     int  not null check (mes between 0 and 11),
  dia     int,
  titulo  text not null
);

-- ───────────── Segurança (RLS) ─────────────

alter table public.portais           enable row level security;
alter table public.perfis            enable row level security;
alter table public.personalizacao    enable row level security;
alter table public.plano_itens       enable row level security;
alter table public.reunioes          enable row level security;
alter table public.planeje           enable row level security;
alter table public.kanban_cards      enable row level security;
alter table public.notas             enable row level security;
alter table public.duvidas           enable row level security;
alter table public.chat_mensagens    enable row level security;
alter table public.jornada_passos    enable row level security;
alter table public.script_categorias enable row level security;
alter table public.scripts           enable row level security;
alter table public.plano_modelo      enable row level security;
alter table public.aulas             enable row level security;
alter table public.datas_comerciais  enable row level security;

-- Portais: o mentorado vê o seu; só a equipe altera.
create policy portais_ler   on public.portais for select using (public.pode_ver(id));
create policy portais_criar on public.portais for insert with check (public.is_equipe());
create policy portais_mudar on public.portais for update using (public.is_equipe());
create policy portais_apagar on public.portais for delete using (public.is_equipe());

-- Perfis: cada um vê o próprio; a equipe vê e altera todos.
create policy perfis_ler   on public.perfis for select using (id = auth.uid() or public.is_equipe());
create policy perfis_mudar on public.perfis for update using (public.is_equipe());

-- Tabelas que o mentorado edita no próprio portal.
create policy personalizacao_tudo on public.personalizacao for all
  using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
create policy planeje_tudo on public.planeje for all
  using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
create policy kanban_tudo on public.kanban_cards for all
  using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
create policy notas_tudo on public.notas for all
  using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

-- Plano de Ação: o mentorado marca como feito; só a equipe cria ou apaga tarefas.
create policy plano_ler    on public.plano_itens for select using (public.pode_ver(portal_id));
create policy plano_marcar on public.plano_itens for update
  using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
create policy plano_criar  on public.plano_itens for insert with check (public.is_equipe());
create policy plano_apagar on public.plano_itens for delete using (public.is_equipe());

-- Reuniões: leitura no portal; escrita só da equipe.
create policy reunioes_ler on public.reunioes for select using (public.pode_ver(portal_id));
create policy reunioes_equipe on public.reunioes for all
  using (public.is_equipe()) with check (public.is_equipe());

-- Dúvidas: o mentorado pergunta; só a equipe responde.
create policy duvidas_ler on public.duvidas for select using (public.pode_ver(portal_id));
create policy duvidas_perguntar on public.duvidas for insert
  with check (public.pode_ver(portal_id) and autor = auth.uid() and resposta is null);
create policy duvidas_responder on public.duvidas for update using (public.is_equipe());
create policy duvidas_apagar on public.duvidas for delete using (public.is_equipe());

-- Assistente: histórico do portal.
create policy chat_ler on public.chat_mensagens for select using (public.pode_ver(portal_id));
create policy chat_escrever on public.chat_mensagens for insert with check (public.pode_ver(portal_id));
create policy chat_apagar on public.chat_mensagens for delete using (public.pode_ver(portal_id));

-- Biblioteca: todo usuário logado lê; só a equipe edita.
create policy jornada_ler on public.jornada_passos for select to authenticated using (true);
create policy jornada_equipe on public.jornada_passos for all using (public.is_equipe()) with check (public.is_equipe());
create policy cat_ler on public.script_categorias for select to authenticated using (true);
create policy cat_equipe on public.script_categorias for all using (public.is_equipe()) with check (public.is_equipe());
create policy scripts_ler on public.scripts for select to authenticated using (true);
create policy scripts_equipe on public.scripts for all using (public.is_equipe()) with check (public.is_equipe());
create policy modelo_ler on public.plano_modelo for select to authenticated using (true);
create policy modelo_equipe on public.plano_modelo for all using (public.is_equipe()) with check (public.is_equipe());
create policy aulas_ler on public.aulas for select to authenticated using (true);
create policy aulas_equipe on public.aulas for all using (public.is_equipe()) with check (public.is_equipe());
create policy datas_ler on public.datas_comerciais for select to authenticated using (true);
create policy datas_equipe on public.datas_comerciais for all using (public.is_equipe()) with check (public.is_equipe());
