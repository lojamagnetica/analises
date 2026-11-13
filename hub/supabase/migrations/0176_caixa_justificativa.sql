-- A loja pode fechar o caixa com algo faltando ou que não bate, desde que escreva o motivo.
-- O dia justificado sai da lista de correção e do alerta de sábado.
set lock_timeout = '8s';
alter table public.loja_caixa add column if not exists justificativa text;

create or replace function public.caixa_com_problema(k public.loja_caixa, com_time boolean) returns boolean
language sql immutable set search_path = public as $$
  with v as (
    select coalesce(k.faturamento, 0) fat, coalesce(k.vendas, 0) vendas, coalesce(k.pecas, 0) pecas,
      (select coalesce(sum(x.value::numeric), 0) from jsonb_each_text(case when jsonb_typeof(k.pagamentos) = 'object' then k.pagamentos else '{}' end) x) pag,
      (select coalesce(sum((x->>'faturamento')::numeric), 0) from jsonb_array_elements(case when jsonb_typeof(k.vendedoras) = 'array' then k.vendedoras else '[]' end) x) vend,
      (case when jsonb_typeof(k.vendedoras) = 'array' then jsonb_array_length(k.vendedoras) else 0 end) nvend
  )
  select coalesce(trim(k.justificativa), '') = '' and (
         (fat > 0 and vendas = 0) or (vendas > 0 and pecas = 0) or (pecas > 0 and pecas < vendas)
      or (fat > 0 and pag = 0 and coalesce(k.origem, '') <> 'canais') or (pag > 0 and abs(pag - fat) > 1)
      or (com_time and fat > 0 and nvend = 0) or (nvend > 0 and abs(vend - fat) > 1))
  from v;
$$;
