-- Loja sem equipe: a dona vende sozinha. Some do portal o que é de time (Gestão de pessoas, mural, missão do time)
-- e o passo "cadastrar a equipe" não trava a entrada. apoio_conteudo: quem ajuda no Instagram (aparece no menu Conteúdo).
set lock_timeout = '8s';
alter table public.portais add column if not exists sem_equipe boolean not null default false;
alter table public.portais add column if not exists apoio_conteudo text;
