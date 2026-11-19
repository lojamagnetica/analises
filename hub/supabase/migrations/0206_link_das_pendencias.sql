-- Cada pendência pode guardar o caminho de onde ela se resolve (o botão "Resolver" do Meu dia).
-- Quem cria a pendência (reunião, agente, Claude ou à mão) já pode deixar o link; sem link, o Hub deduz pelo texto.
alter table public.loja_combinados add column if not exists link text;
alter table public.equipe_lembretes add column if not exists link text;
