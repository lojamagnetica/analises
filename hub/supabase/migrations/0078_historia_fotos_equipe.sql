-- A equipe pode subir fotos na história de qualquer loja (ex.: a lojista mandou as fotos pelo WhatsApp e não pelo link),
-- mesmo depois de liberada. Pelo link (sem login), só enquanto a história não foi liberada, como antes.
create or replace function public.historia_pasta_ok(p_pasta text, p_ver boolean) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from loja_historia h where h.token::text = p_pasta
    and (case when p_ver then public.is_equipe() or (h.liberado and public.pode_ver(h.portal_id))
              else (not h.liberado) or public.is_equipe() end));
$$;
