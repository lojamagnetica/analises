-- Teste de perfil por função: 13 perguntas comuns a todos e 11 da função da pessoa.
-- metodo.dados.perguntas = versão de atendimento; metodo.dados.perguntas_funcao = { apoio, gestao }.
-- (os textos ficam só no banco; perguntas_v1 guarda a versão anterior)

-- A versão do teste pela função cadastrada (igual a blocoDoTeste em lib/pessoas.ts).
create or replace function public.bloco_teste(p_funcao text)
returns text language sql immutable as $$
  select case
    when lower(coalesce(p_funcao, '')) ~ '(dono|dona|propriet|s[óo]ci|gestor|gerente|diretor|supervis|coordena|l[íi]der|encarregad)' then 'gestao'
    when lower(coalesce(p_funcao, '')) ~ '(vend|consult|atend|atacado|comercial)' then 'venda'
    when lower(coalesce(p_funcao, '')) ~ '(caixa|financ|estoqu|mkt|marketing|conte[úu]do|administr|compras|log[íi]stica|limpeza|cadastro|faturamento|entrega|motorista)' then 'apoio'
    else 'venda'
  end
$$;

create or replace function public.teste_perguntas(p_funcao text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(dados->'perguntas_funcao'->public.bloco_teste(p_funcao), dados->'perguntas')
  from public.metodo where chave = 'pessoas'
$$;

create or replace function public.teste_abrir(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'nome', split_part(e.nome, ' ', 1),
    'loja', coalesce(e.loja, p.loja),
    'perguntas', public.teste_perguntas(e.funcao))
  from public.loja_equipe e join public.portais p on p.id = e.portal_id
  where p_token is not null and e.teste_token = p_token and e.ativo
$$;
