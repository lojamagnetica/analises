-- A leitura da semana com o agente: toda segunda às 12h (Recife) o agente monta o rascunho de cada loja com os números;
-- a Camilla revisa à tarde e publica. Cada publicação vira um exemplo (rascunho → versão final) que o agente usa
-- nas próximas semanas: é assim que ele vai aprendendo o jeito da Camilla.
alter table public.loja_leituras add column if not exists rascunho jsonb;
alter table public.loja_leituras add column if not exists publicada boolean not null default false;
alter table public.loja_leituras add column if not exists publicada_em timestamptz;

-- A loja só vê a leitura publicada.
drop policy if exists leituras_ler on public.loja_leituras;
create policy leituras_ler on public.loja_leituras for select using (public.is_equipe() or (publicada and public.pode_ver(portal_id)));

create or replace function public.leitura_marcar(p_id uuid, p_idx int, p_feita boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update loja_leituras set acoes = jsonb_set(acoes, array[p_idx::text, 'feita'], to_jsonb(p_feita)), updated_at = now()
  where id = p_id and publicada and public.pode_ver(portal_id) and p_idx >= 0 and p_idx < jsonb_array_length(acoes);
end $$;

-- O que o agente sugeriu e o que a Camilla publicou (só a equipe; tem números das lojas).
create table if not exists public.leitura_exemplos (
  id          uuid primary key default gen_random_uuid(),
  portal_id   uuid references public.portais (id) on delete cascade,
  semana      date not null,
  rascunho    jsonb not null,
  final       jsonb not null,
  created_at  timestamptz not null default now()
);
alter table public.leitura_exemplos enable row level security;
create policy exemplos_equipe on public.leitura_exemplos for all using (public.is_equipe()) with check (public.is_equipe());

-- Toda segunda às 12h de Recife (15h UTC): rascunho de todas as lojas.
select cron.schedule('leitura-rascunhos', '0 15 * * 1', $$
  select net.http_post(
    url := 'https://gnbjberxugnqzbxvzinh.supabase.co/functions/v1/leitura-rascunho',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-aviso', (select decrypted_secret from vault.decrypted_secrets where name = 'aviso_chave')),
    body := '{"todas": true}'::jsonb, timeout_milliseconds := 5000)
$$);
