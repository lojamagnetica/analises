-- Teste de perfil pelo link: a pessoa da equipe responde no próprio celular, sem login e sem ver o resto do portal.
-- O link carrega um token de uso único (loja_equipe.teste_token); ao responder, o token é apagado.
alter table public.loja_equipe add column if not exists teste_token uuid unique;

create or replace function public.teste_abrir(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'nome', split_part(e.nome, ' ', 1),
    'loja', coalesce(e.loja, p.loja),
    'perguntas', (select dados->'perguntas' from public.metodo where chave = 'pessoas'))
  from public.loja_equipe e join public.portais p on p.id = e.portal_id
  where p_token is not null and e.teste_token = p_token and e.ativo
$$;

create or replace function public.teste_responder(p_token uuid, p_respostas text[]) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  select jsonb_array_length(dados->'perguntas') into n from public.metodo where chave = 'pessoas';
  if p_token is null or coalesce(array_length(p_respostas, 1), 0) <> n
     or exists (select 1 from unnest(p_respostas) r where r not in ('D', 'I', 'S', 'C')) then
    raise exception 'respostas inválidas';
  end if;
  update public.loja_equipe set
    respostas = to_jsonb(p_respostas),
    perfil = jsonb_build_object(
      'D', (select count(*) from unnest(p_respostas) r where r = 'D'),
      'I', (select count(*) from unnest(p_respostas) r where r = 'I'),
      'S', (select count(*) from unnest(p_respostas) r where r = 'S'),
      'C', (select count(*) from unnest(p_respostas) r where r = 'C')),
    respondido_por = 'pessoa',
    perfil_em = current_date,
    teste_token = null
  where teste_token = p_token and ativo;
  return found;
end;
$$;
revoke execute on function public.teste_abrir(uuid) from public;
revoke execute on function public.teste_responder(uuid, text[]) from public;
grant execute on function public.teste_abrir(uuid) to anon, authenticated;
grant execute on function public.teste_responder(uuid, text[]) to anon, authenticated;
