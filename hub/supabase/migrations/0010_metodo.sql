-- O conteúdo do Método Loja Magnética usado pelas ferramentas do portal (teste de perfil, como agir com cada perfil,
-- roteiros de retorno, pautas das reuniões, rotina do líder, habilidades, regras das gincanas).
-- Fica só no banco: o código guarda a lógica e lê os textos daqui. O conteúdo não entra no repositório (ele é público).

create table public.metodo (
  chave      text primary key,      -- 'pessoas', 'gincanas'…
  dados      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.metodo enable row level security;
create policy metodo_ler    on public.metodo for select to authenticated using (true);
create policy metodo_equipe on public.metodo for all using (public.is_equipe()) with check (public.is_equipe());
