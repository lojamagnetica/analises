-- Regras do caixa de cada loja: como cada forma de pagamento ou lançamento do sistema dela conta (faturamento e recebido).
-- A loja responde e confirma; o agente dos arquivos do caixa e o da análise da semana seguem o que ela marcou.
set lock_timeout = '8s';
create table if not exists public.loja_regras_caixa (
  portal_id uuid primary key references public.portais(id) on delete cascade,
  itens jsonb not null default '[]'::jsonb,
  confirmado_em timestamptz,
  confirmado_por text,
  updated_at timestamptz not null default now()
);
alter table public.loja_regras_caixa enable row level security;
drop policy if exists regras_caixa_loja on public.loja_regras_caixa;
create policy regras_caixa_loja on public.loja_regras_caixa for all using (pode_caixa(portal_id)) with check (pode_caixa(portal_id));
