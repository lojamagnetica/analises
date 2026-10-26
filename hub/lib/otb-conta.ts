// A conta do Guia de compras (OTB), sem acesso a rede, separada para teste. Tudo a preço de custo:
//   venda a custo        = venda planejada ÷ markup
//   estoque final alvo   = venda a custo dos próximos N meses (N = cobertura)
//   compra liberada      = alvo + venda a custo − estoque inicial − o que já foi comprado e chega no mês (nunca negativa)
//   estoque final        = inicial + chegando + compra liberada − venda a custo (vira o inicial do mês seguinte)
//   cobertura projetada  = estoque final ÷ média da venda a custo dos próximos N meses

export type Pedido = { id: string; descricao: string; mes: string; valor: number };
export type PlanoOtb = {
  inicio: string;               // primeiro mês do plano (aaaa-mm)
  estoque_inicial: number;      // estoque no começo do primeiro mês, a custo
  markup: number;               // venda ÷ custo
  cobertura: number;            // meses de venda que o estoque final deve cobrir
  vendas: Record<string, number>; // venda planejada (preço de venda) por mês
  pedidos: Pedido[];            // já comprado, no mês em que CHEGA na loja
};
export type MesOtb = {
  mes: string; venda: number; vendaCusto: number; inicial: number; chegando: number;
  alvo: number; compra: number; final: number; cobertura: number | null;
};

/** Meses do plano. */
export const MESES_PLANO = 6;

export function somarMes(mes: string, n: number) {
  const [a, m] = mes.split("-").map(Number);
  const t = a * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}

/** Os meses que pedem venda planejada: os do plano e os da cobertura do último mês. */
export const mesesComVenda = (p: Pick<PlanoOtb, "inicio" | "cobertura">, meses = MESES_PLANO) =>
  Array.from({ length: meses + Math.max(1, Math.round(p.cobertura)) }, (_, i) => somarMes(p.inicio, i));

export function calcularOtb(p: PlanoOtb, meses = MESES_PLANO): MesOtb[] {
  const mk = p.markup > 0 ? p.markup : 1;
  const n = Math.max(1, Math.round(p.cobertura));
  const custo = (m: string) => (Number(p.vendas[m]) || 0) / mk;
  const chegando = (m: string) => p.pedidos.filter((x) => x.mes === m).reduce((s, x) => s + (Number(x.valor) || 0), 0);
  const proximos = (m: string) => Array.from({ length: n }, (_, i) => custo(somarMes(m, i + 1))).reduce((s, x) => s + x, 0);
  const lista: MesOtb[] = [];
  let inicial = Number(p.estoque_inicial) || 0;
  for (let i = 0; i < meses; i++) {
    const mes = somarMes(p.inicio, i);
    const vendaCusto = custo(mes);
    const ch = chegando(mes);
    const alvo = proximos(mes);
    const compra = Math.max(0, alvo + vendaCusto - inicial - ch);
    const final = inicial + ch + compra - vendaCusto;
    lista.push({ mes, venda: Number(p.vendas[mes]) || 0, vendaCusto, inicial, chegando: ch, alvo, compra, final, cobertura: alvo > 0 ? final / (alvo / n) : null });
    inicial = final;
  }
  return lista;
}

/** Os números do topo: estoque hoje, cobertura de hoje, excesso a girar, já comprado e compra liberada no período. */
export function resumoOtb(p: PlanoOtb, linhas: MesOtb[]) {
  const n = Math.max(1, Math.round(p.cobertura));
  const primeiro = linhas[0];
  const mediaCusto = primeiro && primeiro.alvo > 0 ? primeiro.alvo / n : 0;
  const primeiraCompra = linhas.find((l) => l.compra > 0) ?? null;
  return {
    estoque: Number(p.estoque_inicial) || 0,
    alvo: primeiro?.alvo ?? 0,
    coberturaHoje: mediaCusto > 0 ? (Number(p.estoque_inicial) || 0) / mediaCusto : null,
    excesso: Math.max(0, (Number(p.estoque_inicial) || 0) - (primeiro?.alvo ?? 0)),
    jaComprado: p.pedidos.reduce((s, x) => s + (Number(x.valor) || 0), 0),
    compraTotal: linhas.reduce((s, l) => s + l.compra, 0),
    primeiraCompra,
  };
}
