-- Os 7 passos que a loja vê passam a ser as etapas reais do processo (as mesmas da jornada da equipe).
-- Ferramentas e Planejamento de marketing saem dos passos: ficam no bloco "Sempre com você".
-- O passo da loja (portais.passo_atual) segue sozinho a etapa da ficha (fichas.etapa).
update jornada_passos set titulo = x.t, descricao = x.d from (values
  (1, 'Primeiros passos', 'Boas-vindas, contrato, acesso ao Hub e envio dos dados e relatórios da loja.'),
  (2, 'Diagnóstico', 'Análise da loja, do perfil e do estoque, e a reunião de diagnóstico.'),
  (3, 'Plano de Ação 90 dias', '100% personalizado. Entregue em até 7 dias depois do diagnóstico.'),
  (4, 'Implementação', 'Reuniões individuais, plano do mês e acompanhamento de perto da CS.'),
  (5, 'Revisão dos 90 dias', 'O balanço do que mudou e o plano do próximo ciclo.'),
  (6, 'Novo ciclo', 'A implementação continua com o novo plano.'),
  (7, 'Encerramento', 'O balanço final dos resultados e a renovação.')
) as x(n, t, d) where jornada_passos.numero = x.n;

-- Etapa da equipe (0 a 8) → passo da loja (1 a 7).
create or replace function passo_da_etapa(e int) returns int language sql immutable as $$
  select case when e is null or e <= 1 then 1 when e >= 7 then 7 else e end
$$;

create or replace function ficha_passo() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update portais set passo_atual = passo_da_etapa(new.etapa) where id = new.portal_id and passo_atual is distinct from passo_da_etapa(new.etapa);
  return new;
end $$;

drop trigger if exists trg_ficha_passo on fichas;
create trigger trg_ficha_passo after insert or update of etapa on fichas for each row execute function ficha_passo();

-- Acerta o passo de todas as lojas pela etapa atual.
update portais p set passo_atual = passo_da_etapa(f.etapa) from fichas f where f.portal_id = p.id and p.passo_atual is distinct from passo_da_etapa(f.etapa);
