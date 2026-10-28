"use client";

// A história da loja: a lojista preenche pelo link único (/historia, sem login) e sobe as fotos.
// A Camilla liga ao portal, revisa e libera; a loja vê em "Nossa história" (regras do banco).
import { supabaseBrowser } from "@/lib/supabase/client";

export type Valor = { nome: string; como: string };
export type Respostas = {
  comeco?: string; motivo?: string; dificil?: string; conquista?: string;
  cliente?: string; sentir?: string; jeito?: string; valores?: Valor[]; futuro?: string;
};
export type Foto = { caminho: string; ano: string; legenda: string };
export type Historia = {
  id: string; token: string; portal_id: string | null; loja: string; nome: string; whatsapp: string;
  respostas: Respostas; fotos: Foto[]; enviado: boolean; liberado: boolean; created_at: string; updated_at: string;
};
export type Rascunho = Pick<Historia, "loja" | "nome" | "whatsapp" | "respostas" | "fotos" | "enviado">;

type Campo = Exclude<keyof Respostas, "valores">;
/** As perguntas, na ordem do formulário. titulo = como aparece em "Nossa história". */
export const PERGUNTAS: { id: Campo; pergunta: string; sub: string; ex: string; titulo: string }[] = [
  { id: "comeco", titulo: "Como tudo começou", pergunta: "Como tudo começou?", sub: "Quando e como a loja nasceu? O que você fazia antes?",
    ex: "Eu era professora e vendia roupa para as colegas na sala dos professores, numa mala. Em 2012, com R$ 5 mil emprestados da minha mãe, abri uma salinha de 20 m² no centro." },
  { id: "motivo", titulo: "Por que a loja existe", pergunta: "Por que você decidiu abrir a loja?", sub: "O que você queria fazer diferente?",
    ex: "Eu não encontrava roupa bonita no meu tamanho sem pagar caro. Queria uma loja em que a mulher real se sentisse linda, e não envergonhada no provador." },
  { id: "dificil", titulo: "O momento mais difícil", pergunta: "Um momento difícil, que quase te fez desistir.", sub: "O que aconteceu e como você superou?",
    ex: "Na pandemia a loja ficou 3 meses fechada. Aprendi a vender pelo WhatsApp de madrugada e fiz entrega na casa das clientes com o meu carro. Foi ali que descobri que a minha cliente compra de mim, não só a roupa." },
  { id: "conquista", titulo: "Uma conquista", pergunta: "Uma conquista de que você tem orgulho.", sub: "",
    ex: "Em 2019 mudamos para uma loja de esquina, três vezes maior. Na inauguração, a minha primeira cliente da mala veio e chorou comigo." },
  { id: "cliente", titulo: "A nossa cliente", pergunta: "Quem é a sua cliente?", sub: "Como ela é e o que busca quando entra na loja?",
    ex: "Mulher de 35 a 55 anos, que trabalha fora, cuida de todo mundo e quase nunca de si. Ela vem buscar uma roupa, mas quer mesmo é se sentir bem e ser ouvida." },
  { id: "sentir", titulo: "Como ela sai daqui", pergunta: "Como a cliente se sente quando sai da sua loja?", sub: "",
    ex: "Mais bonita e mais confiante. Muitas dizem: \"eu vim só olhar e saí me sentindo outra\"." },
  { id: "jeito", titulo: "O jeito da casa", pergunta: "O jeito da casa: como a gente atende?", sub: "O que nunca fazemos com uma cliente?",
    ex: "Chamamos pelo nome, oferecemos um café e montamos o look completo. Nunca dizemos \"isso não é para você\" e nunca deixamos ninguém sem resposta no WhatsApp." },
  { id: "futuro", titulo: "Para onde vamos", pergunta: "Para onde vamos?", sub: "Qual é o seu sonho para a loja nos próximos anos?",
    ex: "Ser a loja da cidade em que a mulher pensa primeiro quando quer se sentir bonita, e ter uma equipe que atende como eu atenderia." },
];
export const VALORES = ["Acolhimento", "Verdade", "Cuidado com o detalhe", "Alegria", "Compromisso", "Respeito", "Família", "Excelência", "Simplicidade", "Coragem"];
export const EX_VALOR = "Verdade: se a peça não ficou boa, a gente fala com carinho e procura outra.";

const sb = () => supabaseBrowser();
const BALDE = "historias";
const CHAVE_LOCAL = "lm_historia";

/** A chave do link guardada neste aparelho (para continuar depois). */
export function chaveGuardada() {
  try { return localStorage.getItem(CHAVE_LOCAL) ?? ""; } catch { return ""; }
}
export function guardarChave(token: string) {
  try { localStorage.setItem(CHAVE_LOCAL, token); } catch { /* sem armazenamento: segue sem */ }
}

export async function abrirRascunho(token: string): Promise<Rascunho | null> {
  const { data } = await sb().rpc("historia_abrir", { p_token: token });
  return (data as Rascunho | null) ?? null;
}

/** Salva pelo link (sem login). Sem chave, cria e devolve a chave nova. */
export async function salvarRascunho(token: string | null, r: Rascunho, enviar = false): Promise<string> {
  const { data, error } = await sb().rpc("historia_salvar", {
    p_token: token, p_loja: r.loja, p_nome: r.nome, p_whatsapp: r.whatsapp, p_respostas: r.respostas, p_fotos: r.fotos, p_enviar: enviar,
  });
  if (error || !data) throw new Error("Não deu para salvar. Confira a internet e tente de novo.");
  return data as string;
}

/** Diminui a foto (lado maior 1600 px, JPEG) para subir rápido pelo celular. Se não der, sobe a original. */
async function reduzir(f: File): Promise<Blob> {
  try {
    const img = await createImageBitmap(f);
    const k = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const b = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", 0.85));
    return b ?? f;
  } catch { return f; }
}

export async function subirFoto(token: string, f: File): Promise<string> {
  if (!f.type.startsWith("image/")) throw new Error("Escolha uma foto (imagem).");
  const b = await reduzir(f);
  const caminho = `${token}/${Date.now()}${b.type === "image/jpeg" ? ".jpg" : "." + (f.name.split(".").pop() ?? "jpg")}`;
  const { error } = await sb().storage.from(BALDE).upload(caminho, b, { upsert: false, contentType: b.type || f.type });
  if (error) throw new Error("Não deu para subir a foto. Confira a internet e tente de novo.");
  return caminho;
}

/** Endereços temporários das fotos (equipe ou loja depois de liberada). */
export async function urlsDasFotos(fotos: Foto[]): Promise<Record<string, string>> {
  if (!fotos.length) return {};
  const { data } = await sb().storage.from(BALDE).createSignedUrls(fotos.map((f) => f.caminho), 3600);
  return Object.fromEntries((data ?? []).filter((d) => d.signedUrl).map((d) => [d.path ?? "", d.signedUrl as string]));
}

// ───── Equipe e loja (com login) ─────

export async function buscarHistorias(): Promise<Historia[]> {
  const { data } = await sb().from("loja_historia").select("*").order("created_at", { ascending: false });
  return (data ?? []) as Historia[];
}

export async function buscarHistoriaDoPortal(portalId: string): Promise<Historia | null> {
  const { data } = await sb().from("loja_historia").select("*").eq("portal_id", portalId).order("updated_at", { ascending: false }).limit(1);
  return ((data ?? [])[0] as Historia | undefined) ?? null;
}

export async function salvarHistoria(id: string, h: Partial<Historia>) {
  const { error } = await sb().from("loja_historia").update({ ...h, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function excluirHistoria(h: Historia) {
  if (h.fotos.length) await sb().storage.from(BALDE).remove(h.fotos.map((f) => f.caminho));
  const { error } = await sb().from("loja_historia").delete().eq("id", h.id);
  if (error) throw new Error(error.message);
}

export async function tirarFoto(h: Historia, caminho: string) {
  await sb().storage.from(BALDE).remove([caminho]);
  await salvarHistoria(h.id, { fotos: h.fotos.filter((f) => f.caminho !== caminho) });
}

/** As fotos na ordem da linha do tempo (pelo ano; sem ano vai para o fim). */
export const emOrdem = (fotos: Foto[]) =>
  [...fotos].sort((a, b) => (parseInt(a.ano) || 9999) - (parseInt(b.ano) || 9999));
