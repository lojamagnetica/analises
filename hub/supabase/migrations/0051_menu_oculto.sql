-- Menu por loja (consultorias personalizadas): grupos do menu que a loja não vê (ex.: {gestao, clientes}).
alter table public.portais add column if not exists menu_oculto text[] not null default '{}';
