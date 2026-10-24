-- Teste de perfil com 24 situações e "mais parece / menos parece" (as 12 situações novas ficam na tabela metodo).
-- Pontuação de cada letra: vezes em "mais" menos vezes em "menos"; a menor vira 1, para comparar as quatro.
-- teste_responder (0018, uma escolha por situação) continua existindo para links antigos.
create or replace function public.teste_enviar(p_token uuid, p_mais text[], p_menos text[]) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  n int;
  s jsonb;
  menor int;
begin
  select jsonb_array_length(dados->'perguntas') into n from public.metodo where chave = 'pessoas';
  if p_token is null or coalesce(array_length(p_mais, 1), 0) <> n or coalesce(array_length(p_menos, 1), 0) <> n
     or exists (select 1 from unnest(p_mais || p_menos) r where r not in ('D', 'I', 'S', 'C'))
     or exists (select 1 from unnest(p_mais, p_menos) as x(a, b) where a = b) then
    raise exception 'respostas inválidas';
  end if;
  select min(v) into menor from (
    select (select count(*) from unnest(p_mais) r where r = l) - (select count(*) from unnest(p_menos) r where r = l) v
    from unnest(array['D', 'I', 'S', 'C']) l) x;
  select jsonb_object_agg(l, (select count(*) from unnest(p_mais) r where r = l) - (select count(*) from unnest(p_menos) r where r = l) - menor + 1)
    into s from unnest(array['D', 'I', 'S', 'C']) l;
  update public.loja_equipe set
    respostas = jsonb_build_object('mais', to_jsonb(p_mais), 'menos', to_jsonb(p_menos)),
    perfil = s, respondido_por = 'pessoa', perfil_em = current_date, teste_token = null
  where teste_token = p_token and ativo;
  return found;
end;
$$;
revoke execute on function public.teste_enviar(uuid, text[], text[]) from public;
grant execute on function public.teste_enviar(uuid, text[], text[]) to anon, authenticated;
