-- Identidade visual da campanha no Início (cores por fase: até o Natal, depois do Natal) e a foto da campanha.
-- visual: { fundo, texto, cor, fases: [{ desde: "AAAA-MM-DD", fundo, texto, cor }] }
-- foto: caminho no balde "relatorios" (<portal>/campanha/...). A loja põe e troca a própria foto.
alter table public.loja_campanhas add column if not exists visual jsonb not null default '{}'::jsonb;
alter table public.loja_campanhas add column if not exists foto text;

create or replace function public.campanha_foto(p_id uuid, p_foto text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update loja_campanhas set foto = nullif(p_foto, ''), updated_at = now()
   where id = p_id and status = 'liberada' and (pode_ver(portal_id) or is_equipe())
     and (p_foto is null or p_foto = '' or split_part(p_foto, '/', 1) = portal_id::text);
  if not found then raise exception 'Não deu para salvar a foto'; end if;
end $$;
revoke all on function public.campanha_foto(uuid, text) from public;
grant execute on function public.campanha_foto(uuid, text) to authenticated;
