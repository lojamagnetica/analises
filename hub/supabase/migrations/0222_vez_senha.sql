-- Link da vendedora com senha: no primeiro acesso ela cria a senha; depois o celular fica conectado (sem expirar).
-- Num aparelho novo, pede a senha. A gestora pode zerar a senha (a vendedora cria outra no próximo acesso).
-- Todas as funções vez_* passam a aceitar a chave do aparelho (loja_vez_sessoes); o link sozinho só abre a tela da senha.
set lock_timeout = '8s';

create table if not exists public.loja_vez_senha (
  pessoa_id uuid primary key references public.loja_equipe(id) on delete cascade,
  senha_hash text,
  erros int not null default 0,
  travado_ate timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.loja_vez_senha enable row level security;

create table if not exists public.loja_vez_sessoes (
  chave uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references public.loja_equipe(id) on delete cascade,
  created_at timestamptz not null default now(),
  revogada boolean not null default false
);
create index if not exists loja_vez_sessoes_pessoa on public.loja_vez_sessoes (pessoa_id);
alter table public.loja_vez_sessoes enable row level security;

-- Quem é a pessoa: pela chave do aparelho (depois da senha).
create or replace function public.vez_quem(p_token uuid) returns table (id uuid, portal_id uuid, nome text, loja text)
language sql stable security definer set search_path = public as $$
  select e.id, e.portal_id, e.nome, coalesce(e.loja, '')
  from public.loja_vez_sessoes s join public.loja_equipe e on e.id = s.pessoa_id
  where p_token is not null and s.chave = p_token and not s.revogada and coalesce(e.ativo, true)
$$;

-- O link pessoal: nome e se já tem senha.
create or replace function public.vez_acesso(p_link uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('nome', split_part(e.nome, ' ', 1), 'loja', coalesce(e.loja, ''),
    'tem_senha', exists (select 1 from public.loja_vez_senha v where v.pessoa_id = e.id and v.senha_hash is not null))
  from public.loja_equipe e where p_link is not null and e.vez_token = p_link and coalesce(e.ativo, true)
$$;

-- Primeiro acesso: cria a senha e devolve a chave do aparelho.
create or replace function public.vez_criar_senha(p_link uuid, p_senha text) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; v_chave uuid;
begin
  select e.id into v_id from public.loja_equipe e where p_link is not null and e.vez_token = p_link and coalesce(e.ativo, true);
  if v_id is null then raise exception 'Link inválido.'; end if;
  if exists (select 1 from public.loja_vez_senha where pessoa_id = v_id and senha_hash is not null) then raise exception 'Você já tem senha. Entre com ela.'; end if;
  if length(coalesce(p_senha, '')) < 4 then raise exception 'A senha precisa ter pelo menos 4 números ou letras.'; end if;
  insert into public.loja_vez_senha (pessoa_id, senha_hash) values (v_id, crypt(p_senha, gen_salt('bf')))
    on conflict (pessoa_id) do update set senha_hash = excluded.senha_hash, erros = 0, travado_ate = null, updated_at = now();
  insert into public.loja_vez_sessoes (pessoa_id) values (v_id) returning chave into v_chave;
  return v_chave;
end $$;

-- Aparelho novo: entra com a senha (10 erros seguidos travam por 15 minutos).
create or replace function public.vez_entrar_senha(p_link uuid, p_senha text) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; s record; v_chave uuid;
begin
  select e.id into v_id from public.loja_equipe e where p_link is not null and e.vez_token = p_link and coalesce(e.ativo, true);
  if v_id is null then raise exception 'Link inválido.'; end if;
  select * into s from public.loja_vez_senha where pessoa_id = v_id;
  if not found or s.senha_hash is null then raise exception 'Crie a sua senha primeiro.'; end if;
  if s.travado_ate is not null and s.travado_ate > now() then raise exception 'Muitas tentativas. Espere 15 minutos ou peça para a gestora zerar a sua senha.'; end if;
  if s.senha_hash <> crypt(coalesce(p_senha, ''), s.senha_hash) then
    update public.loja_vez_senha set erros = erros + 1, travado_ate = case when erros + 1 >= 10 then now() + interval '15 minutes' end where pessoa_id = v_id;
    raise exception 'Senha errada.';
  end if;
  update public.loja_vez_senha set erros = 0, travado_ate = null where pessoa_id = v_id;
  insert into public.loja_vez_sessoes (pessoa_id) values (v_id) returning chave into v_chave;
  return v_chave;
end $$;

-- Gestora (ou equipe): zera a senha e desconecta os aparelhos.
create or replace function public.vez_zerar_senha(p_pessoa uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.loja_equipe e where e.id = p_pessoa and (public.pode_caixa(e.portal_id) or public.is_equipe())) then raise exception 'Sem permissão.'; end if;
  update public.loja_vez_sessoes set revogada = true where pessoa_id = p_pessoa;
  update public.loja_vez_senha set senha_hash = null, erros = 0, travado_ate = null, updated_at = now() where pessoa_id = p_pessoa;
end $$;

-- A gestora vê quem já criou a senha.
create or replace function public.vez_senhas(p_portal uuid) returns table (pessoa_id uuid, desde timestamptz)
language sql stable security definer set search_path = public as $$
  select v.pessoa_id, v.updated_at from public.loja_vez_senha v join public.loja_equipe e on e.id = v.pessoa_id
  where e.portal_id = p_portal and v.senha_hash is not null and (public.pode_caixa(p_portal) or public.is_equipe())
$$;

revoke all on function public.vez_acesso(uuid) from public;
revoke all on function public.vez_criar_senha(uuid, text) from public;
revoke all on function public.vez_entrar_senha(uuid, text) from public;
revoke all on function public.vez_zerar_senha(uuid) from public, anon;
revoke all on function public.vez_senhas(uuid) from public, anon;
grant execute on function public.vez_acesso(uuid) to anon, authenticated;
grant execute on function public.vez_criar_senha(uuid, text) to anon, authenticated;
grant execute on function public.vez_entrar_senha(uuid, text) to anon, authenticated;
grant execute on function public.vez_zerar_senha(uuid) to authenticated;
grant execute on function public.vez_senhas(uuid) to authenticated;
