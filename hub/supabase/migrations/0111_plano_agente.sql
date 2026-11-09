-- Agente do Plano de Ação: o rascunho fica na preparação do Diagnóstico até a Camilla aplicar no plano da loja.
set lock_timeout = '8s';
alter table public.diagnostico_preparo add column if not exists plano jsonb;
comment on column public.diagnostico_preparo.plano is 'Rascunho do Plano de Ação montado pelo agente (temas, tarefas por mês e onde cada pedido da cliente é atendido). Só vai para a loja quando a Camilla aplica.';
