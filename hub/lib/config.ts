// Endereço e chave pública do Supabase do Hub. A chave publicável é feita para ficar no navegador:
// quem protege os dados são as regras do banco (RLS). Variáveis de ambiente, se existirem, têm prioridade.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gnbjberxugnqzbxvzinh.supabase.co";
export const SUPABASE_CHAVE_PUBLICA =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_-WnGTNVW70PVeF_8FvNdCA_7i9BKOyn";
