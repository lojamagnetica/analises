-- Feedback do time: reunião própria, separada da análise da semana (que é dos gestores).
alter table public.loja_reunioes drop constraint if exists loja_reunioes_tipo_check;
alter table public.loja_reunioes add constraint loja_reunioes_tipo_check check (tipo = any (array['semanal','mensal','abertura','reta_final','individual','analise','planejamento','analise_semana','feedback_time']));
