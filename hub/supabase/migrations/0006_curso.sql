-- Curso Loja Magnética · 16 fundamentos, estruturado pelo Mapa do Curso.
-- 1 aula = 1 fundamento = 1 ferramenta + 1 missão de 7 dias + 1 prova. Só avança quando entrega a prova.

-- ───────────── Estrutura do curso (a equipe edita, todo mundo logado lê) ─────────────

create table public.curso_modulos (
  id       text primary key,
  ordem    int  not null,
  titulo   text not null,
  promessa text,
  pilar    text            -- '01'..'04' nos módulos dos fundamentos
);

create table public.curso_fundamentos (
  codigo    text primary key,          -- '01.1' … '04.4'
  modulo_id text not null references public.curso_modulos (id),
  ordem     int  not null,
  titulo    text not null,
  rotulo    text not null,             -- como aparece em "Fundamentos implantados" na ficha da loja
  promessa  text,
  missao    text not null,
  prova     text not null,
  efeito    text
);

create table public.curso_aulas (
  id          uuid primary key default gen_random_uuid(),
  codigo      text not null unique,    -- '0.1', '1.1', '2', 'B', 'E'…
  modulo_id   text not null references public.curso_modulos (id),
  fundamento  text references public.curso_fundamentos (codigo),
  ordem       int  not null,
  titulo      text not null,
  duracao     int,                     -- minutos (todas têm até 15)
  topicos     text[] not null default '{}',
  video_url   text
);

create table public.curso_ferramentas (
  id         uuid primary key default gen_random_uuid(),
  modulo_id  text not null references public.curso_modulos (id),
  fundamento text references public.curso_fundamentos (codigo),
  ordem      int  not null default 0,
  nome       text not null,
  formato    text not null default 'Ficha', -- Planilha, PDF, Roteiro, Mensagens, Ficha, GPT, No Hub
  url        text                           -- vazio = ainda em produção
);

-- ───────────── Progresso de cada loja (a própria loja e a equipe) ─────────────

create table public.curso_raiox (
  portal_id  uuid not null references public.portais (id) on delete cascade,
  codigo     text not null references public.curso_fundamentos (codigo),
  nota       int  not null check (nota between 0 and 2), -- 0 não existe · 1 existe, mas não roda sempre · 2 funciona toda semana
  updated_at timestamptz not null default now(),
  primary key (portal_id, codigo)
);

create table public.curso_progresso (
  portal_id uuid not null references public.portais (id) on delete cascade,
  tipo      text not null check (tipo in ('aula', 'prova')),
  item      text not null,            -- código da aula ou do fundamento
  feito_em  timestamptz not null default now(),
  primary key (portal_id, tipo, item)
);

-- A prova entregue entra sozinha em "Fundamentos implantados" na ficha da loja (o placar da equipe).
create function public.sincronizar_fundamento() returns trigger
language plpgsql security definer set search_path = public as $$
declare r text;
begin
  if tg_op = 'INSERT' and new.tipo = 'prova' then
    select rotulo into r from curso_fundamentos where codigo = new.item;
    if r is not null then
      update fichas set fundamentos = array(select distinct x from unnest(fundamentos || r) x order by x), updated_at = now()
      where portal_id = new.portal_id;
    end if;
  elsif tg_op = 'DELETE' and old.tipo = 'prova' then
    select rotulo into r from curso_fundamentos where codigo = old.item;
    if r is not null then
      update fichas set fundamentos = array_remove(fundamentos, r), updated_at = now() where portal_id = old.portal_id;
    end if;
  end if;
  return null;
end $$;

create trigger ao_mudar_prova
  after insert or delete on public.curso_progresso
  for each row execute function public.sincronizar_fundamento();

revoke execute on function public.sincronizar_fundamento() from public, anon, authenticated;

-- ───────────── Segurança ─────────────

alter table public.curso_modulos     enable row level security;
alter table public.curso_fundamentos enable row level security;
alter table public.curso_aulas       enable row level security;
alter table public.curso_ferramentas enable row level security;
alter table public.curso_raiox       enable row level security;
alter table public.curso_progresso   enable row level security;

create policy curso_modulos_ler       on public.curso_modulos     for select to authenticated using (true);
create policy curso_modulos_equipe    on public.curso_modulos     for all using (public.is_equipe()) with check (public.is_equipe());
create policy curso_fund_ler          on public.curso_fundamentos for select to authenticated using (true);
create policy curso_fund_equipe       on public.curso_fundamentos for all using (public.is_equipe()) with check (public.is_equipe());
create policy curso_aulas_ler         on public.curso_aulas       for select to authenticated using (true);
create policy curso_aulas_equipe      on public.curso_aulas       for all using (public.is_equipe()) with check (public.is_equipe());
create policy curso_ferr_ler          on public.curso_ferramentas for select to authenticated using (true);
create policy curso_ferr_equipe       on public.curso_ferramentas for all using (public.is_equipe()) with check (public.is_equipe());
create policy curso_raiox_tudo        on public.curso_raiox       for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
create policy curso_progresso_tudo    on public.curso_progresso   for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

-- ───────────── Conteúdo do Mapa do Curso ─────────────

-- O conteúdo (textos do método, aulas, scripts) fica só no banco e é editado pelo Hub, em Equipe.
-- Ele não entra neste repositório, que é público. Quem montar um banco novo copia o conteúdo do banco atual.
