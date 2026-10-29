-- Minha empresa: Produtos (cada produto com a sua área), Financeiro (como a planilha e o Notion) e Acessos (senhas no cofre).

-- ───── Produtos ─────
-- ficha = { tema, ponto_a, ponto_b, formato, duracao, para_quem, nao_e_para, pilares[], encontros[], estrutura{hot_seat, tutorias, area_membros, desafio},
--           apoio[], bonus[], preco_parcelado, condicoes }
-- materiais = [{ titulo, link, tipo: apresentacao|venda|apoio|outro }]; projetos = [{ titulo, status: ideia|fazendo|feito, prazo, obs }]
create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text not null default 'Mentoria',
  tipo text not null default 'High-ticket',
  status text not null default 'ativo' check (status in ('ativo', 'construcao', 'ideia', 'pausado')),
  preco numeric(12, 2),
  plataforma text not null default '',
  plano_id text references public.planos (id) on delete set null,
  resumo text not null default '',
  ficha jsonb not null default '{}'::jsonb,
  materiais jsonb not null default '[]'::jsonb,
  projetos jsonb not null default '[]'::jsonb,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.produtos enable row level security;
drop policy if exists produtos_equipe on public.produtos;
create policy produtos_equipe on public.produtos for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

-- ───── Financeiro (só quem aprova: a Camilla) ─────
-- O cadastro das despesas que se repetem (fixas e parceladas). Todo mês vira lançamento.
create table if not exists public.fin_fixas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text not null default 'Outros',
  valor numeric(12, 2) not null default 0,
  dia int,
  recorrencia text not null default 'Mensal' check (recorrencia in ('Mensal', 'Trimestral', 'Anual')),
  pagador text not null default 'Empresa',
  parcelas int,             -- parcelado: total de parcelas (ex.: 12)
  inicio text,              -- mês da 1ª parcela (AAAA-MM)
  ativo boolean not null default true,
  obs text not null default '',
  created_at timestamptz not null default now()
);
-- Tudo o que entra e sai em cada mês.
create table if not exists public.fin_lancamentos (
  id uuid primary key default gen_random_uuid(),
  mes text not null,        -- AAAA-MM
  tipo text not null check (tipo in ('entrada', 'saida')),
  natureza text not null default 'variavel' check (natureza in ('fixa', 'variavel')),
  descricao text not null,
  categoria text not null default 'Outros',
  valor numeric(12, 2) not null default 0,   -- saída: o valor; entrada: o líquido (o que caiu)
  bruto numeric(12, 2),                        -- entrada: o valor da venda
  pagador text not null default 'Empresa',
  parcela text not null default '',
  dia int,
  pago boolean not null default false,
  fixa_id uuid references public.fin_fixas (id) on delete set null,
  obs text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists fin_lancamentos_mes on public.fin_lancamentos (mes);
-- socios = [{ nome, pct }]
create table if not exists public.fin_config (
  id int primary key default 1 check (id = 1),
  socios jsonb not null default '[]'::jsonb,
  imposto numeric(5, 2) not null default 6
);
alter table public.fin_fixas enable row level security;
alter table public.fin_lancamentos enable row level security;
alter table public.fin_config enable row level security;
drop policy if exists fin_fixas_mentora on public.fin_fixas;
drop policy if exists fin_lanc_mentora on public.fin_lancamentos;
drop policy if exists fin_config_mentora on public.fin_config;
create policy fin_fixas_mentora on public.fin_fixas for all to authenticated using (public.pode_aprovar()) with check (public.pode_aprovar());
create policy fin_lanc_mentora on public.fin_lancamentos for all to authenticated using (public.pode_aprovar()) with check (public.pode_aprovar());
create policy fin_config_mentora on public.fin_config for all to authenticated using (public.pode_aprovar()) with check (public.pode_aprovar());

-- ───── Acessos (comuns a toda a equipe; a senha fica criptografada no cofre do Supabase, nunca na tabela) ─────
create table if not exists public.acessos (
  id uuid primary key default gen_random_uuid(),
  ferramenta text not null,
  link text not null default '',
  login text not null default '',
  segredo uuid,             -- vault.secrets.id
  obs text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.acessos enable row level security;
drop policy if exists acessos_equipe on public.acessos;
create policy acessos_equipe on public.acessos for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

create or replace function public.acesso_senha(p_id uuid) returns text
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_equipe() then return null; end if;
  return (select s.decrypted_secret from public.acessos a join vault.decrypted_secrets s on s.id = a.segredo where a.id = p_id);
end $$;

create or replace function public.acesso_guardar_senha(p_id uuid, p_senha text) returns void
language plpgsql security definer set search_path = public as $$
declare s uuid;
begin
  if not public.is_equipe() then raise exception 'Só a equipe guarda senhas.'; end if;
  select segredo into s from public.acessos where id = p_id;
  if coalesce(p_senha, '') = '' then
    if s is not null then delete from vault.secrets where id = s; end if;
    update public.acessos set segredo = null, updated_at = now() where id = p_id;
  elsif s is null then
    update public.acessos set segredo = vault.create_secret(p_senha, 'acesso_' || p_id::text), updated_at = now() where id = p_id;
  else
    perform vault.update_secret(s, p_senha);
    update public.acessos set updated_at = now() where id = p_id;
  end if;
end $$;

-- Excluir o acesso apaga a senha do cofre junto.
create or replace function public.acesso_apagar_segredo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.segredo is not null then delete from vault.secrets where id = old.segredo; end if;
  return old;
end $$;
drop trigger if exists acesso_apagar_segredo on public.acessos;
create trigger acesso_apagar_segredo after delete on public.acessos for each row execute function public.acesso_apagar_segredo();

revoke execute on function public.acesso_senha(uuid) from public, anon;
revoke execute on function public.acesso_guardar_senha(uuid, text) from public, anon;
grant execute on function public.acesso_senha(uuid) to authenticated;
grant execute on function public.acesso_guardar_senha(uuid, text) to authenticated;
