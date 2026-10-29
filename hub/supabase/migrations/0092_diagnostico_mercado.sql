-- Agente do Diagnóstico: etapa de pesquisa dos concorrentes e do mercado.
-- concorrentes: o que a loja citou (concorrentes locais, perfis em que se inspira, cidade), escrito pela Camilla.
-- mercado: a pesquisa do agente (resumo, texto, fontes), que a Camilla revisa e leva ao Diagnóstico da loja como rascunho.
set lock_timeout = '8s';
alter table diagnostico_preparo add column if not exists concorrentes text not null default '';
alter table diagnostico_preparo add column if not exists mercado jsonb;
