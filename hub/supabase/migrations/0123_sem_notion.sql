-- Sem Notion: as regras do assistente (mapa da jornada) ficam em metodo (chave 'assistente_regras', o texto não vai
-- para o repositório) e o Radar de dificuldades das lojas vira tabela do Hub. Só quem monta (Camilla e CS) vê.
set lock_timeout = '8s';

create table if not exists public.radar_dificuldades (
  id            uuid primary key default gen_random_uuid(),
  portal_id     uuid references public.portais (id) on delete set null,
  loja          text,
  dificuldade   text not null,
  pilar         text,
  contexto      text,
  fonte         text,
  data          date not null default current_date,
  recorrente    boolean not null default false,
  vira_conteudo boolean not null default false,
  created_at    timestamptz default now()
);
create index if not exists radar_dificuldades_data on public.radar_dificuldades (data desc);
alter table public.radar_dificuldades enable row level security;
create policy radar_dificuldades_monta on public.radar_dificuldades for all using (public.pode_montar()) with check (public.pode_montar());
