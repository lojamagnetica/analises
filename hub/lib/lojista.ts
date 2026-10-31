"use client";

// Teste do lojista (sócios e gerente): perfil de condução, imagem × resultado, prontidão e habilidades.
// Aqui fica só a lógica. As perguntas e os textos ficam no banco (tabela "metodo", chave "lojista").
// O índice e a prontidão são só da equipe: a pessoa vê o espelho e as perguntas, nunca a nota.
import { supabaseBrowser } from "@/lib/supabase/client";

export type Papel = "socio" | "gerente";
export type Conduz = "E" | "S" | "C" | "A";
export type Perfil = { nome: string; resumo: string; forte: string; cuidado: string; motivar: string; cobrar: string; acompanhar: string };
export type Conteudo = {
  aviso: string;
  A: {
    escolhas: { situacao: string; a: string; b: string }[];
    tempo: { pergunta_real: string; pergunta_ideal: string; itens: string[] };
    numeros: { pergunta: string; resultado: string[]; imagem: string[] };
    dinheiro: { pergunta: string; faixas: string[]; pontos: number[]; frentes: string[] };
    afirmacoes: { texto: string; conta: "imagem" | "resultado" }[];
    abertas: string[];
  };
  B: { perfis: Record<Conduz, Perfil>; situacoes: { situacao: string; opcoes: Record<Conduz, string> }[] };
  C: { itens: { dim: "saber" | "poder" | "querer"; tipo: "likert" | "escolha" | "texto"; texto: string; chave?: string; opcoes?: string[]; trava?: string[] }[] };
  D: { habilidades: { nome: string; pilar: string }[]; abertas: string[] };
  retorno: {
    intro: string; espelho_titulo: string; reflexao_imagem: string[]; reflexao_equilibrada: string[];
    texto_imagem: string; texto_equilibrada: string; proximo_passo: string;
  };
};

/** O que a pessoa responde. Cada lista segue a ordem do conteúdo. */
export type Respostas = {
  A: { escolhas: ("a" | "b" | "")[]; tempo_real: number[]; tempo_ideal: number[]; numeros: boolean[]; dinheiro: number[]; afirmacoes: number[]; abertas: string[] };
  B: { situacoes: (Conduz | "")[] };
  C: { itens: (number | string)[] };
  D: { notas: number[]; abertas: string[] };
};
export type Faixa = "resultado" | "equilibrado" | "imagem";
export type Resultado = {
  indice: number | null; faixa: Faixa | null; partes: Record<string, number | null>;
  perfil: Record<Conduz, number>; principal: Conduz | null; apoio: Conduz | null;
  prontidao: number; saber: number; poder: number; querer: number; nivel: "alta" | "media" | "baixa"; trava: "saber" | "poder" | "querer" | null;
  horas: string | null; menor: string | null; maior: string | null;
};
export type Olhar = { habilidade: number; nota: number; por: string; em: string };
export type Teste = {
  id: string; portal_id: string; nome: string; papel: Papel; token: string; respostas: Respostas | null; resultado: Resultado | null;
  respondido_em: string | null; olhar: Olhar[]; criado_por: string | null; created_at: string;
};

const sb = () => supabaseBrowser();
const COLUNAS = "id, portal_id, nome, papel, token, respostas, resultado, respondido_em, olhar, criado_por, created_at";
const media = (v: number[]) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0);
const pct = (x: number) => Math.round(x * 100);

export const respostasVazias = (c: Conteudo): Respostas => ({
  A: {
    escolhas: c.A.escolhas.map(() => ""), tempo_real: c.A.tempo.itens.map(() => 0), tempo_ideal: c.A.tempo.itens.map(() => 0),
    numeros: [...c.A.numeros.resultado, ...c.A.numeros.imagem].map(() => false),
    dinheiro: c.A.dinheiro.frentes.map(() => -1), afirmacoes: c.A.afirmacoes.map(() => 0), abertas: c.A.abertas.map(() => ""),
  },
  B: { situacoes: c.B.situacoes.map(() => "") },
  C: { itens: c.C.itens.map((i) => (i.tipo === "texto" ? "" : -1)) },
  D: { notas: c.D.habilidades.map(() => 0), abertas: c.D.abertas.map(() => "") },
});

/** Soma da divisão do tempo (deve fechar em 100). */
export const somaTempo = (v: number[]) => v.reduce((s, x) => s + (Number(x) || 0), 0);

/** Quantas perguntas obrigatórias ainda faltam (textos abertos são opcionais). */
export function faltam(c: Conteudo, r: Respostas, papel: Papel) {
  let n = 0;
  n += r.A.escolhas.filter((x) => !x).length;
  if (somaTempo(r.A.tempo_real) !== 100) n++;
  if (somaTempo(r.A.tempo_ideal) !== 100) n++;
  if (papel === "socio") n += r.A.dinheiro.filter((x) => x < 0).length;
  n += r.A.afirmacoes.filter((x) => !x).length;
  n += r.B.situacoes.filter((x) => !x).length;
  n += c.C.itens.filter((it, i) => it.tipo !== "texto" && Number(r.C.itens[i]) < 0).length;
  n += r.D.notas.filter((x) => !x).length;
  return n;
}

/** Índice imagem × resultado (0 = foco no resultado, 100 = foco na imagem). Gerente não responde sobre dinheiro. */
export function pontuar(c: Conteudo, r: Respostas, papel: Papel): Resultado {
  const A = c.A;
  const partes: Record<string, number | null> = {};
  partes.escolhas = r.A.escolhas.length ? pct(r.A.escolhas.filter((x) => x === "a").length / r.A.escolhas.length) : null;
  partes.tempo = pct((Number(r.A.tempo_real[0]) || 0) / 100);

  const din = r.A.dinheiro.map((f) => (f >= 0 ? A.dinheiro.pontos[f] ?? 0 : 0));
  const totalDin = din.reduce((s, x) => s + x, 0);
  partes.dinheiro = papel === "socio" && totalDin > 0 ? pct(din[0] / totalDin) : null;

  const af = A.afirmacoes.map((a, i) => {
    const v = ((Number(r.A.afirmacoes[i]) || 1) - 1) / 4;
    return a.conta === "imagem" ? v : 1 - v;
  });
  partes.afirmacoes = pct(media(af));

  const nRes = A.numeros.resultado.length;
  const sabeRes = r.A.numeros.slice(0, nRes).filter(Boolean).length;
  const sabeImg = r.A.numeros.slice(nRes).filter(Boolean).length;
  partes.numeros = pct(((nRes - sabeRes) / nRes + sabeImg / Math.max(1, A.numeros.imagem.length)) / 2);

  const pesos: Record<string, number> = { escolhas: 30, tempo: 20, dinheiro: 20, afirmacoes: 20, numeros: 10 };
  let soma = 0, total = 0;
  for (const k of Object.keys(pesos)) {
    const v = partes[k];
    if (v == null) continue;
    soma += v * pesos[k]; total += pesos[k];
  }
  const indice = total ? Math.round(soma / total) : null;
  const faixa: Faixa | null = indice == null ? null : indice <= 33 ? "resultado" : indice <= 66 ? "equilibrado" : "imagem";

  // Perfil de condução: quantas vezes cada letra foi escolhida nas situações.
  const perfil: Record<Conduz, number> = { E: 0, S: 0, C: 0, A: 0 };
  r.B.situacoes.forEach((l) => { if (l) perfil[l]++; });
  const ordem = (Object.keys(perfil) as Conduz[]).sort((a, b) => perfil[b] - perfil[a]);
  const principal = perfil[ordem[0]] > 0 ? ordem[0] : null;
  const apoio = principal && perfil[ordem[1]] > 0 ? ordem[1] : null;

  // Prontidão: saber, poder e querer. Likert 1 a 5 e a pergunta de horas contam; textos não.
  const dims: Record<"saber" | "poder" | "querer", number[]> = { saber: [], poder: [], querer: [] };
  let horas: string | null = null, trava: Resultado["trava"] = null;
  c.C.itens.forEach((it, i) => {
    const v = r.C.itens[i];
    if (it.tipo === "likert" && Number(v) >= 1) dims[it.dim].push((Number(v) - 1) / 4);
    if (it.tipo === "escolha" && Number(v) >= 0 && it.opcoes) {
      if (it.chave === "horas") { horas = it.opcoes[Number(v)] ?? null; dims[it.dim].push(Number(v) / Math.max(1, it.opcoes.length - 1)); }
      if (it.chave === "trava") trava = ((it.trava?.[Number(v)] || null) as Resultado["trava"]);
    }
  });
  const saber = pct(media(dims.saber)), poder = pct(media(dims.poder)), querer = pct(media(dims.querer));
  const prontidao = Math.round((saber + poder + querer) / 3);
  const nivel = prontidao >= 70 ? "alta" : prontidao >= 45 ? "media" : "baixa";

  const notas = r.D.notas.map((n, i) => ({ n: Number(n) || 0, nome: c.D.habilidades[i]?.nome ?? "" })).filter((x) => x.n > 0);
  const ord = [...notas].sort((a, b) => a.n - b.n);
  return { indice, faixa, partes, perfil, principal, apoio, prontidao, saber, poder, querer, nivel, trava, horas, menor: ord[0]?.nome ?? null, maior: ord[ord.length - 1]?.nome ?? null };
}

/** Os quatro retratos do espelho, em palavras neutras e sem nota. */
export function espelho(c: Conteudo, r: Respostas, papel: Papel) {
  const A = c.A;
  const real = r.A.tempo_real, ideal = r.A.tempo_ideal;
  const retratos: { titulo: string; linhas: string[] }[] = [];

  retratos.push({
    titulo: "Para onde vai o seu tempo",
    linhas: [
      `Na última semana: ${real[0] ?? 0}% do tempo na aparência da loja e do Instagram, ${real[1] ?? 0}% atendendo e vendendo, ${real[2] ?? 0}% em números, estoque e compras.`,
      `Como você acha que deveria ser: ${ideal[0] ?? 0}% na aparência, ${ideal[1] ?? 0}% atendendo e vendendo, ${ideal[2] ?? 0}% em números, estoque e compras.`,
    ],
  });

  if (papel === "socio") {
    const din = r.A.dinheiro.map((f) => (f >= 0 ? A.dinheiro.faixas[f] : "—"));
    retratos.push({
      titulo: "Para onde foi o seu dinheiro nos últimos 12 meses",
      linhas: A.dinheiro.frentes.map((f, i) => `${f.split(" (")[0]}: ${din[i]}`),
    });
  }

  const nRes = A.numeros.resultado.length;
  const sabe = A.numeros.resultado.filter((_, i) => r.A.numeros[i]);
  const naoSabe = A.numeros.resultado.filter((_, i) => !r.A.numeros[i]);
  const sabeImg = A.numeros.imagem.filter((_, i) => r.A.numeros[nRes + i]);
  retratos.push({
    titulo: "O que você sabe de cabeça",
    linhas: [
      `Números do negócio que você sabe: ${sabe.length} de ${nRes}${naoSabe.length ? `. Ficaram de fora: ${naoSabe.map((x) => x.toLowerCase()).join(", ")}` : ""}.`,
      `Números de imagem que você sabe: ${sabeImg.length} de ${A.numeros.imagem.length}${sabeImg.length ? ` (${sabeImg.map((x) => x.toLowerCase()).join(", ")})` : ""}.`,
    ],
  });

  const a = r.A.escolhas.filter((x) => x === "a").length;
  retratos.push({
    titulo: "O que você escolheu quando precisou decidir",
    linhas: [
      `Em ${r.A.escolhas.length} escolhas entre cuidar da imagem ou do resultado, você ficou com a imagem ${a} ${a === 1 ? "vez" : "vezes"} e com o resultado ${r.A.escolhas.length - a}.`,
    ],
  });
  return retratos;
}

// ---------- Banco ----------

/** Conteúdo do teste para a equipe ver o que cada pessoa respondeu. */
export async function buscarConteudo() {
  const { data } = await sb().from("metodo").select("dados").eq("chave", "lojista").maybeSingle();
  return (data?.dados ?? null) as Conteudo | null;
}

export async function buscarTestes(portalId: string) {
  const { data } = await sb().from("lojista_testes").select(COLUNAS).eq("portal_id", portalId).order("created_at");
  return (data ?? []) as Teste[];
}

export async function criarTeste(portalId: string, nome: string, papel: Papel, por: string) {
  const n = nome.trim().slice(0, 120);
  if (!n) throw new Error("Preencha o nome.");
  const { error } = await sb().from("lojista_testes").insert({ portal_id: portalId, nome: n, papel, criado_por: por });
  if (error) throw new Error(error.message);
}

export async function editarTeste(id: string, nome: string, papel: Papel) {
  const n = nome.trim().slice(0, 120);
  if (!n) throw new Error("Preencha o nome.");
  const { error } = await sb().from("lojista_testes").update({ nome: n, papel }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function excluirTeste(id: string) {
  const { error } = await sb().from("lojista_testes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Olhar de fora: a equipe dá a sua nota para a mesma habilidade, com quem deu e quando. */
export async function salvarOlhar(t: Teste, habilidade: number, nota: number, por: string) {
  const resto = (t.olhar ?? []).filter((o) => !(o.habilidade === habilidade && o.por === por));
  const olhar = nota > 0 ? [...resto, { habilidade, nota, por, em: new Date().toISOString().slice(0, 10) }] : resto;
  const { error } = await sb().from("lojista_testes").update({ olhar }).eq("id", t.id);
  if (error) throw new Error(error.message);
  return olhar;
}

export const linkDoTeste = (base: string, token: string) => `${base}/lojista/?t=${token}`;
