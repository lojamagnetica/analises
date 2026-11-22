-- Campanha da loja (datas grandes: fim de ano, Mães, Namorados, Pais): a "casa" da campanha no Hub.
-- Enquanto vale (de preparo_desde até fim), o Início da loja entra em modo campanha.
-- A equipe monta e libera; a loja só vê a liberada e só marca o que já fez.
create table if not exists public.loja_campanhas (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.portais(id) on delete cascade,
  nome text not null,
  chamada text not null default '',            -- linha curta abaixo do nome ("Sua campanha de fim de ano")
  preparo_desde date not null,                 -- a partir de quando o Início mostra a campanha (semana do Antes)
  inicio date not null,                        -- segunda-feira da semana 1
  fim date not null,
  aprovada_em date,
  livro text,                                  -- link do livro da campanha (página do Hub ou link externo)
  antes jsonb not null default '[]'::jsonb,    -- [{ id, titulo, texto, ate, botao, link }]
  dias jsonb not null default '{}'::jsonb,     -- { "AAAA-MM-DD": { destaque, itens: [{ id, titulo, texto, botao, link }] } }
  feitos jsonb not null default '{}'::jsonb,   -- { id do passo ou "dia:id": data em que a loja marcou }
  abas text[] not null default '{antes}',      -- abas abertas para a loja: antes, semanas, resultado
  status text not null default 'rascunho' check (status in ('rascunho', 'liberada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists loja_campanhas_portal on public.loja_campanhas (portal_id, fim);
alter table public.loja_campanhas enable row level security;
drop policy if exists campanhas_equipe on public.loja_campanhas;
drop policy if exists campanhas_ler on public.loja_campanhas;
create policy campanhas_equipe on public.loja_campanhas for all using (public.is_equipe()) with check (public.is_equipe());
create policy campanhas_ler on public.loja_campanhas for select using (status = 'liberada' and public.pode_ver(portal_id));
-- A loja marca e desmarca só o "feito" (o resto da campanha não muda pelo lado da loja).
create or replace function public.campanha_marcar(p_id uuid, p_chave text, p_feito boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  update loja_campanhas
     set feitos = case when p_feito then feitos || jsonb_build_object(p_chave, to_char(now() at time zone 'America/Recife', 'YYYY-MM-DD'))
                       else feitos - p_chave end,
         updated_at = now()
   where id = p_id and status = 'liberada' and (pode_ver(portal_id) or is_equipe())
  returning feitos into v;
  if v is null then raise exception 'Campanha não encontrada'; end if;
  return v;
end $$;
revoke all on function public.campanha_marcar(uuid, text, boolean) from public;
grant execute on function public.campanha_marcar(uuid, text, boolean) to authenticated;
