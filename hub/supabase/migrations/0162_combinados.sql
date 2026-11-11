-- Combinados da loja: o que ela se comprometeu a começar a fazer (saem da reunião de entrega ou de qualquer reunião individual).
-- A equipe cria e edita; a loja vê os dela e marca como feito. A CS acompanha pelo prazo. Sem dado de cliente aqui.
set lock_timeout = '8s';

create table if not exists public.loja_combinados (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.portais(id) on delete cascade,
  texto text not null,
  quem text not null default 'loja',          -- loja | claudia | camilla: quem faz
  prazo date,
  status text not null default 'aberto',      -- aberto | feito
  origem text not null default 'entrega',     -- entrega | reuniao | leitura | cs
  criado_por text,
  created_at timestamptz not null default now(),
  feito_em timestamptz
);
create index if not exists loja_combinados_portal_idx on public.loja_combinados (portal_id, status, prazo);
alter table public.loja_combinados enable row level security;
drop policy if exists combinados_ler on public.loja_combinados;
create policy combinados_ler on public.loja_combinados for select using (public.pode_ver(portal_id));
drop policy if exists combinados_equipe on public.loja_combinados;
create policy combinados_equipe on public.loja_combinados for all using (public.is_equipe()) with check (public.is_equipe());

-- A loja marca (ou desmarca) o que já fez.
create or replace function public.combinado_marcar(p_id uuid, p_feito boolean)
returns void language sql security definer set search_path = public as $$
  update public.loja_combinados
     set status = case when p_feito then 'feito' else 'aberto' end,
         feito_em = case when p_feito then now() else null end
   where id = p_id and public.pode_ver(portal_id);
$$;
grant execute on function public.combinado_marcar(uuid, boolean) to authenticated;

-- Quem é a CS que acompanha as lojas (nome e, se quiser, o WhatsApp), lido pelo portal da loja.
insert into public.metodo (chave, dados) values ('cs', '{"nome":"Claudia"}'::jsonb) on conflict (chave) do nothing;
