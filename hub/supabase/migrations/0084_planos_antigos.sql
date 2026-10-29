-- Grupo 6M e Magnética PRO 12 deixaram de existir: as lojas passam para o Start (inclui o mesmo: individual só no início,
-- encontros em grupo e leitura da semana). As datas dos contratos ficam como estavam.
update public.fichas set plano_id = 'start' where plano_id in ('grupo-6m', 'pro-12');
update public.contratos set plano_id = 'start' where plano_id in ('grupo-6m', 'pro-12');
delete from public.planos where id in ('grupo-6m', 'pro-12');
