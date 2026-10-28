-- O que cada plano inclui (a Camilla revisa e ajusta em Minha empresa › Planos).
-- inclui = { reunioes: "semanal" | "quinzenal" | "mensal" | "so_inicio" | "nenhuma", grupo: bool, leitura: bool, visitas: int, detalhes: texto, revisado: bool }
-- O acompanhamento das lojas usa "reunioes" para saber quem precisa ter a próxima reunião individual marcada.
alter table public.planos add column if not exists inclui jsonb not null default '{}'::jsonb;

-- Ponto de partida (a revisar).
update public.planos set inclui = case
  when tipo = 'Consultoria' then '{"reunioes":"semanal","grupo":false,"leitura":true,"visitas":0,"detalhes":"","revisado":false}'::jsonb
  when nome in ('Gold', 'Premium') then '{"reunioes":"mensal","grupo":true,"leitura":true,"visitas":0,"detalhes":"","revisado":false}'::jsonb
  else '{"reunioes":"so_inicio","grupo":true,"leitura":true,"visitas":0,"detalhes":"","revisado":false}'::jsonb
end
where inclui = '{}'::jsonb;
