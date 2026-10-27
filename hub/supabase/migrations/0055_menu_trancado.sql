-- Áreas do menu com cadeado em cada portal (ids dos grupos do menu, ex.: {conteudo}): a loja vê a área
-- no menu com 🔒 e as páginas mostram que ela abre em breve. A equipe vê tudo.
alter table public.portais add column if not exists menu_trancado text[] not null default '{}';
