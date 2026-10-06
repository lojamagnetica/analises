import type { Respostas } from "@/lib/conteudo";

/** Campos que os scripts preenchem sozinhos a partir da etapa 2 da Personalização. */
export function variaveisDaLoja(etapa2: Respostas | undefined, lojaPadrao: string) {
  const v = (k: string) => (typeof etapa2?.[k] === "string" ? (etapa2[k] as string).trim() : "");
  return {
    loja: v("loja") || lojaPadrao,
    seu_nome: v("seu_nome"),
    cidade: v("cidade"),
    instagram: v("instagram"),
    whatsapp: v("whatsapp"),
  } as Record<string, string>;
}

export type Trecho = { texto: string; variavel?: string; preenchida?: boolean };

/** Quebra o texto em trechos para destacar as variáveis na tela. */
export function trechos(texto: string, vars: Record<string, string>): Trecho[] {
  const partes: Trecho[] = [];
  let ultimo = 0;
  for (const m of texto.matchAll(/\{(\w+)\}/g)) {
    if (m.index! > ultimo) partes.push({ texto: texto.slice(ultimo, m.index) });
    const valor = vars[m[1]];
    partes.push(valor ? { texto: valor, variavel: m[1], preenchida: true } : { texto: `[${m[1]}]`, variavel: m[1] });
    ultimo = m.index! + m[0].length;
  }
  if (ultimo < texto.length) partes.push({ texto: texto.slice(ultimo) });
  return partes;
}

export function preencher(texto: string, vars: Record<string, string>) {
  return trechos(texto, vars).map((t) => t.texto).join("");
}
