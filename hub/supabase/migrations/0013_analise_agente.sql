-- O agente de análise do perfil: a equipe dá o @ e a função analise-perfil coleta o Instagram,
-- analisa com o Claude e devolve a análise preenchida como rascunho.
-- agente = { estado: 'coletando' | 'analisando' | 'pronta' | 'erro', instagram, inicio, fim, msg, pendencias[], roteiro_video }
-- As instruções e o exemplo do agente (a "memória") ficam na tabela metodo, chave 'analise_agente'.
alter table public.loja_analise_perfil add column agente jsonb not null default '{}';
