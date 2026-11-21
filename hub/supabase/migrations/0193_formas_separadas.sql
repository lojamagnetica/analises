-- Loja com Regras do caixa (venda pelo relatório de vendas e dinheiro que entrou pelo relatório de faturamento):
-- as formas de pagamento não precisam bater com a venda do dia, então essa diferença não conta como problema.
set lock_timeout = '8s';
do $do$
declare d text; n text;
begin
  d := pg_get_functiondef('public.caixa_com_problema(public.loja_caixa, boolean)'::regprocedure);
  n := replace(replace(d, 'or (pag > 0 and abs(pag - fat) > 1)',
    'or (pag > 0 and abs(pag - fat) > 1 and not exists (select 1 from portais p where p.id = k.portal_id and p.regras_caixa))'),
    ' IMMUTABLE', ' STABLE');
  if n = d then raise exception 'caixa_com_problema: trecho não encontrado'; end if;
  execute n;
end $do$;

-- Cópia do caixa antes de refazer dias em lote (para voltar atrás se precisar). Só o banco lê.
create table if not exists public.loja_caixa_antes (copiado_em timestamptz default now(), motivo text, linha jsonb);
alter table public.loja_caixa_antes enable row level security;
