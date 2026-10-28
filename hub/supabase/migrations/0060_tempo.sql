-- Onde está o meu tempo: a dona lista o que faz, separa o que é só dela, monta a semana e passa as tarefas.
-- dados = { tarefas: [{id, nome, area, horas, grupo, quem, inicio, como, passou}], blocos: [{id, dia, hora, oque}], prioridades: {semana, itens: [..]} }
create table if not exists public.loja_tempo (
  portal_id  uuid primary key references public.portais (id) on delete cascade,
  dados      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.loja_tempo enable row level security;
create policy tempo_loja on public.loja_tempo for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
