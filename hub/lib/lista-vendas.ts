// Lê o texto do relatório "Lista de Vendas" do sistema da loja (ERP Objetivo): uma venda por bloco, com os itens e as formas de pagamento.
// Só contas: sem banco, com teste (lista-vendas.test.ts). O texto vem de lib/pdf-linhas.ts (colunas separadas por 2+ espaços).

export type FormaLida = "pix" | "credito" | "debito" | "dinheiro" | "crediario" | "vale";
export type ItemLido = { codigo: string; produto: string; qtd: number; total: number };
export type VendaLida = { id: string; dia: string; vendedora: string; valor: number; pecas: number; pagamentos: { forma: FormaLida; valor: number }[]; itens: ItemLido[] };
export type DiaLido = {
  dia: string; faturamento: number; vendas: number; pecas: number;
  vendedoras: { nome: string; faturamento: number; vendas: number; pecas: number }[];
  pagamentos: Partial<Record<Exclude<FormaLida, "vale">, number>>;
  /** Parte paga com vale-troca ou devolução (fica fora das formas de pagamento). */
  vale: number;
  itens: { venda: string; vendedora: string; codigo: string; produto: string; qtd: number; total: number }[];
};

const num = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));
const DINHEIRO = /^-?[\d.]*,\d\d$/;
const HEADER = /^(\d{3,5}\.\d\d)\s{2,}(\S+)\s{2,}(.+)$/;

function formaDe(rotulo: string): FormaLida {
  if (/Credito/i.test(rotulo)) return "credito";
  if (/Debito/i.test(rotulo)) return "debito";
  if (/^Transfer/i.test(rotulo) || /^pix$/i.test(rotulo)) return "pix";
  if (/^Promiss/i.test(rotulo)) return "crediario";
  if (/^Dinheiro$/i.test(rotulo)) return "dinheiro";
  return "vale"; // Devolução, vale-troca...
}

/** Lê as vendas do relatório. Linhas que não são de venda são ignoradas. */
export function lerVendas(texto: string): VendaLida[] {
  const vendas: VendaLida[] = [];
  let cur: VendaLida | null = null;
  for (const bruta of texto.split("\n")) {
    const linha = bruta.trim();
    if (!linha) continue;
    const h = HEADER.exec(linha);
    if (h) {
      const c = linha.split(/\s{2,}/);
      const m = /^(\d\d)\/(\d\d)\/(\d{4})\s+\d\d:\d\d:\d\d$/.exec(c[3] ?? "");
      if (m && c.length >= 7 && DINHEIRO.test(c[c.length - 1])) {
        cur = { id: c[0], dia: `${m[3]}-${m[2]}-${m[1]}`, vendedora: (c[4] ?? "").trim(), valor: num(c[c.length - 1]), pecas: 0, pagamentos: [], itens: [] };
        vendas.push(cur);
        continue;
      }
    }
    if (!cur) continue;
    if (/^Total de/i.test(linha)) { cur = null; continue; }
    const c = linha.split(/\s{2,}/);
    // Item: código, produto, quantidade, valor, desconto, total
    if (c.length >= 6 && /^\d+$/.test(c[0]) && /^\d+$/.test(c[2]) && DINHEIRO.test(c[3]) && DINHEIRO.test(c[5])) {
      const qtd = Number(c[2]);
      cur.pecas += qtd;
      cur.itens.push({ codigo: c[0], produto: c[1], qtd, total: num(c[5]) });
      continue;
    }
    // Pagamentos: "Devolução 1x R$ 151,00   Transferência 1x R$ 68,90" / "SICOOB Cartao: Credito VISA NSU: 009508 3x R$ 519,90"
    for (const p of linha.matchAll(/(?:^|\s{2,})(.+?)\s+(\d+)x R\$ ([\d.]*,\d\d)/g)) {
      const rotulo = p[1].replace(/^.*Cartao:\s*/i, (x) => x).trim();
      const forma = /Cartao:\s*Credito/i.test(rotulo) ? "credito" : /Cartao:\s*Debito/i.test(rotulo) ? "debito" : formaDe(rotulo.replace(/\s+Promissoria.*$/i, "").trim());
      cur.pagamentos.push({ forma: /^Promissoria/i.test(rotulo) ? "crediario" : forma, valor: num(p[3]) });
    }
  }
  return vendas;
}

/** Agrupa por dia: totais, por vendedora, formas de pagamento, vale/devolução e os itens. */
export function lerListaDeVendas(texto: string): DiaLido[] {
  const dias = new Map<string, DiaLido>();
  const vistas = new Set<string>(); // o mesmo relatório subido duas vezes não conta em dobro
  for (const v of lerVendas(texto)) {
    const chave = `${v.id}|${v.dia}|${v.valor}`;
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    const d = dias.get(v.dia) ?? { dia: v.dia, faturamento: 0, vendas: 0, pecas: 0, vendedoras: [], pagamentos: {}, vale: 0, itens: [] };
    dias.set(v.dia, d);
    d.faturamento += v.valor; d.vendas += 1; d.pecas += v.pecas;
    const quem = d.vendedoras.find((x) => x.nome === v.vendedora) ?? (d.vendedoras.push({ nome: v.vendedora, faturamento: 0, vendas: 0, pecas: 0 }), d.vendedoras[d.vendedoras.length - 1]);
    quem.faturamento += v.valor; quem.vendas += 1; quem.pecas += v.pecas;
    for (const p of v.pagamentos) {
      if (p.forma === "vale") d.vale += p.valor;
      else d.pagamentos[p.forma] = (d.pagamentos[p.forma] ?? 0) + p.valor;
    }
    for (const i of v.itens) d.itens.push({ venda: v.id, vendedora: v.vendedora, codigo: i.codigo, produto: i.produto, qtd: i.qtd, total: i.total });
  }
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return [...dias.values()].sort((a, b) => a.dia.localeCompare(b.dia)).map((d) => ({
    ...d, faturamento: r2(d.faturamento), vale: r2(d.vale),
    vendedoras: d.vendedoras.map((v) => ({ ...v, faturamento: r2(v.faturamento) })),
    pagamentos: Object.fromEntries(Object.entries(d.pagamentos).map(([k, v]) => [k, r2(v as number)])),
    itens: d.itens.map((i) => ({ ...i, total: r2(i.total) })),
  }));
}

/** Os mais vendidos de um período, por produto (soma das peças e do valor). */
export function maisVendidos(itens: { produto: string; qtd: number; total: number }[], limite = 15) {
  const m = new Map<string, { produto: string; qtd: number; total: number }>();
  for (const i of itens) {
    const x = m.get(i.produto) ?? { produto: i.produto, qtd: 0, total: 0 };
    x.qtd += i.qtd; x.total += i.total; m.set(i.produto, x);
  }
  return [...m.values()].sort((a, b) => b.qtd - a.qtd || b.total - a.total).slice(0, limite).map((x) => ({ ...x, total: Math.round(x.total * 100) / 100 }));
}
