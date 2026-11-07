-- Bússola v2: o que a lojista registra em cada dia.
-- dia = { "AAAA-MM-DD": { prioridades: [3 textos], feitas: [3 booleanos], extras: [{id, titulo}], ocultos: [chave do alerta], fechamento: "texto" } }
-- feitos também guarda as tarefas mensais feitas, na chave "AAAA-MM".
alter table public.loja_bussola add column if not exists dia jsonb not null default '{}'::jsonb;
