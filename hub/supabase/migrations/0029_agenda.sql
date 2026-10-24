-- Agenda da equipe: os Google Agendas (só leitura) guardados aqui para a tela Agenda do Hub.
-- agenda_calendarios: quais agendas entram (o id é o do Google; cadastrado direto no Supabase, nunca no repositório).
-- agenda_eventos: cópia dos eventos de -30 a +90 dias. Só o necessário: sem participantes, descrição nem anexos.
-- Só a função agenda-sincronizar escreve (chave de serviço); a equipe só lê.
set lock_timeout = '8s';

create table if not exists public.agenda_calendarios (
  id              text primary key,
  nome            text not null,
  ordem           int not null default 0,
  ativo           boolean not null default true,
  sincronizado_em timestamptz,
  erro            text
);
alter table public.agenda_calendarios enable row level security;
create policy agenda_calendarios_equipe on public.agenda_calendarios for select using (public.is_equipe());
grant select on public.agenda_calendarios to authenticated;

create table if not exists public.agenda_eventos (
  calendario_id text not null references public.agenda_calendarios (id) on delete cascade,
  gcal_id       text not null,
  titulo        text not null default '',
  inicio        timestamptz not null,
  fim           timestamptz not null,
  dia_inteiro   boolean not null default false,
  cor_id        text,
  meet_url      text,
  link          text,
  tipo_google   text,
  atualizado_em timestamptz not null default now(),
  primary key (calendario_id, gcal_id)
);
create index if not exists agenda_eventos_inicio on public.agenda_eventos (inicio);
alter table public.agenda_eventos enable row level security;
create policy agenda_eventos_equipe on public.agenda_eventos for select using (public.is_equipe());
grant select on public.agenda_eventos to authenticated;
