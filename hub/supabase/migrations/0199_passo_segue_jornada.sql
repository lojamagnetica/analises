-- O cartão "Sua jornada" do Início (os 7 passos da mentoria) anda sozinho com a etapa da jornada da equipe (fichas.etapa).
-- Só avança, nunca volta: o passo marcado à mão mais à frente continua.
-- Etapas: 0-1 primeiros passos → 1 Onboarding · 2 Diagnóstico → 2 · 3 Rota de 90 dias → 3 Plano de Ação ·
-- 4 a 6 Implementação e revisão → 6 Reuniões Individuais · 7-8 Encerramento e concluída → 7 Encerramento.
set lock_timeout = '8s';
create or replace function public.passo_da_etapa(e int) returns int language sql immutable as $$
  select case when e is null or e <= 1 then 1 when e = 2 then 2 when e = 3 then 3 when e between 4 and 6 then 6 else 7 end
$$;
create or replace function public.ficha_move_passo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update portais set passo_atual = greatest(coalesce(passo_atual, 1), passo_da_etapa(new.etapa))
   where id = new.portal_id and coalesce(passo_atual, 1) < passo_da_etapa(new.etapa);
  return new;
end $$;
drop trigger if exists ficha_move_passo on public.fichas;
create trigger ficha_move_passo after insert or update of etapa on public.fichas for each row execute function public.ficha_move_passo();
-- O que já existe: alinha quem está atrás da própria etapa.
update portais p set passo_atual = passo_da_etapa(f.etapa)
  from fichas f where f.portal_id = p.id and p.ativo and coalesce(p.passo_atual, 1) < passo_da_etapa(f.etapa);
