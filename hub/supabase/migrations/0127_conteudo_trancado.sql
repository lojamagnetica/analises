-- A área Conteúdo (com a Análise do Instagram) nasce com cadeado em todo portal:
-- a loja vê o cadeado e a equipe libera em Equipe › portal › Áreas com cadeado.
set lock_timeout = '8s';
alter table public.portais alter column menu_trancado set default '{conteudo}'::text[];
