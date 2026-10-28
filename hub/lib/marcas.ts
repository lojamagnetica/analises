"use client";

// Guia das marcas e produtos: uma ficha por marca (moda) ou linha de produto (outros nichos).
// Alimenta o onboarding: a pessoa nova estuda pelo link (dia 1) e faz o quiz montado com as fichas (dia 3).
import { SUPABASE_URL } from "@/lib/config";
import { reduzir } from "@/lib/historia";
import { supabaseBrowser } from "@/lib/supabase/client";

export type Marca = {
  id: string; portal_id: string; nome: string; foto: string | null; oque: string; para_quem: string; preco: string;
  diferenciais: string; como_vender: string; perguntas: string; pecas: string; cuidados: string; created_at: string;
};
type Campo = "oque" | "para_quem" | "preco" | "diferenciais" | "como_vender" | "perguntas" | "pecas" | "cuidados";
export const CAMPOS_MARCA: { id: Campo; rotulo: string; ex: string; longo?: boolean }[] = [
  { id: "oque", rotulo: "O que é", ex: "Moda casual feminina, peças leves e básicas bem acabadas", longo: true },
  { id: "para_quem", rotulo: "Para quem", ex: "Mulher de 30 a 50 anos que trabalha fora e quer conforto com elegância", longo: true },
  { id: "preco", rotulo: "Faixa de preço", ex: "De R$ 89 a R$ 259" },
  { id: "diferenciais", rotulo: "Diferenciais", ex: "Tecido que não amassa, modelagem que veste bem do 38 ao 48", longo: true },
  { id: "como_vender", rotulo: "Como vender", ex: "Peça para a cliente sentir o tecido e mostre como fica com um acessório", longo: true },
  { id: "perguntas", rotulo: "O que a cliente pergunta (e a resposta)", ex: "Encolhe? Não, pode lavar na máquina no ciclo delicado.", longo: true },
  { id: "pecas", rotulo: "Peças-chave e o que combina", ex: "Calça pantalona preta: combina com as blusas de viscose estampadas", longo: true },
  { id: "cuidados", rotulo: "Cuidados e troca", ex: "Lavar do avesso. Troca em até 30 dias com etiqueta", longo: true },
];

const sb = () => supabaseBrowser();
async function ok<T extends { error: { message: string } | null }>(p: PromiseLike<T>) {
  const r = await p;
  if (r.error) throw new Error(r.error.message);
  return r;
}

export async function buscarMarcas(portalId: string): Promise<Marca[]> {
  const { data } = await sb().from("loja_marcas").select("*").eq("portal_id", portalId).order("created_at");
  return (data ?? []) as Marca[];
}
export async function salvarMarca(portalId: string, id: string | null, d: Partial<Marca>) {
  const dados = { ...d, updated_at: new Date().toISOString() };
  return ok(id ? sb().from("loja_marcas").update(dados).eq("id", id) : sb().from("loja_marcas").insert({ ...dados, portal_id: portalId }));
}
export async function excluirMarca(m: Marca) {
  if (m.foto) await sb().storage.from("marcas").remove([m.foto]);
  return ok(sb().from("loja_marcas").delete().eq("id", m.id));
}
export async function subirFotoMarca(portalId: string, f: File) {
  if (!f.type.startsWith("image/")) throw new Error("Escolha uma foto (imagem).");
  const b = await reduzir(f);
  const caminho = `${portalId}/${Date.now()}.jpg`;
  const { error } = await sb().storage.from("marcas").upload(caminho, b, { upsert: false, contentType: b.type || "image/jpeg" });
  if (error) throw new Error("Não deu para subir a foto. Confira a internet e tente de novo.");
  return caminho;
}
export const tirarFotoMarca = (caminho: string) => sb().storage.from("marcas").remove([caminho]);
export const urlFotoMarca = (caminho: string) => `${SUPABASE_URL}/storage/v1/object/public/marcas/${caminho}`;

// ───── Quiz do dia 3: montado com as fichas ─────

export type Pergunta = { pergunta: string; opcoes: string[]; certa: number };
type FichaQuiz = Pick<Marca, "nome" | "para_quem" | "preco" | "diferenciais" | "pecas">;

/** Embaralha sempre do mesmo jeito para a mesma pessoa (a semente é o link dela). */
function embaralhar<T>(xs: T[], semente: string) {
  let s = [...semente].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const r = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const curto = (t: string) => (t.length > 110 ? `${t.slice(0, 107).trim()}…` : t);

export function montarQuiz(fichas: FichaQuiz[], semente: string, max = 8): Pergunta[] {
  const qs: Pergunta[] = [];
  const montar = (pergunta: string, certa: string, erradas: string[]) => {
    const outras = embaralhar([...new Set(erradas.filter((x) => x && x !== certa))], semente + pergunta).slice(0, 3);
    if (!outras.length) return;
    const opcoes = embaralhar([certa, ...outras], pergunta + semente);
    qs.push({ pergunta, opcoes, certa: opcoes.indexOf(certa) });
  };
  const nomes = fichas.map((f) => f.nome);
  for (const f of fichas) {
    if (f.para_quem.trim()) montar(`Chega uma cliente assim: "${curto(f.para_quem.trim())}". O que você mostra primeiro?`, f.nome, nomes);
    if (f.preco.trim()) montar(`Qual é a faixa de preço de ${f.nome}?`, f.preco.trim(), fichas.map((x) => x.preco.trim()));
    if (f.diferenciais.trim()) montar(`Qual é o diferencial de ${f.nome}?`, curto(f.diferenciais.trim()), fichas.map((x) => curto(x.diferenciais.trim())));
  }
  return embaralhar(qs, semente).slice(0, max);
}

export type ResultadoQuiz = { acertos: number; total: number; erros: { pergunta: string; certa: string }[] };
