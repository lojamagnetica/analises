"use client";

// Loja na mão: Vendas do dia, Crediário e Compras, para a dona que lança tudo sozinha pelo celular.
// Cada venda soma o Fechamento de caixa do dia (loja_caixa) e atualiza a cliente (última compra, nº de compras, total).
import { supabaseBrowser } from "@/lib/supabase/client";
import { hoje } from "@/lib/formato";
import { FORMAS, salvarCaixa, type Forma, type Pagamentos } from "@/lib/caixa";
import { arrumarNome, type Cliente } from "@/lib/clientes";

const sb = () => supabaseBrowser();
const r2 = (n: number) => Math.round(n * 100) / 100;
async function ok<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>) {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data;
}

/** A linha da peça (o material): é por ela que o Diagnóstico lê o que mais vende. */
export const LINHAS = ["Ouro", "Prata 925", "Semijoia", "Bijuteria", "Acessório"];
export const CATEGORIAS = ["Anel", "Brinco", "Colar", "Pulseira", "Conjunto", "Pingente", "Berloque", "Piercing", "Tornozeleira", "Relógio", "Outro"];
export { FORMAS };
export const nomeForma = (f: string) => FORMAS.find((x) => x.chave === f)?.nome ?? f;
/** Marca do caixa somado pelas vendas (assim dá para saber que o dia veio daqui). */
const MARCA = "Somado das vendas do dia";

// ───── Clientes (cadastro rápido) ─────

export async function buscarClientesSimples(portalId: string) {
  const { data } = await sb().from("loja_clientes").select("id, nome, whatsapp, aniversario, ultima_compra, n_compras, total").eq("portal_id", portalId).order("nome").limit(5000);
  return (data ?? []) as Pick<Cliente, "id" | "nome" | "whatsapp" | "aniversario" | "ultima_compra" | "n_compras" | "total">[];
}
export type ClienteSimples = Awaited<ReturnType<typeof buscarClientesSimples>>[number];

/** Só nome e WhatsApp: o resto a cliente vai ganhando com as compras. */
export async function novaCliente(portalId: string, nome: string, whatsapp: string) {
  const n = arrumarNome(nome).slice(0, 120);
  if (!n) throw new Error("Escreva o nome da cliente.");
  const data = await ok(sb().from("loja_clientes").insert({ portal_id: portalId, nome: n, whatsapp: whatsapp.trim().slice(0, 40) || null }).select("id, nome, whatsapp, aniversario, ultima_compra, n_compras, total").single());
  return data as ClienteSimples;
}

/** Soma (ou tira) uma compra da cliente. */
async function ajustarCliente(id: string | null, compras: number, valor: number, dia: string) {
  if (!id || (!compras && !valor)) return;
  const { data: c } = await sb().from("loja_clientes").select("ultima_compra, n_compras, total").eq("id", id).maybeSingle();
  if (!c) return;
  let ultima = c.ultima_compra as string | null;
  if (compras > 0 && (!ultima || dia > ultima)) ultima = dia;
  if (compras < 0) {
    const { data: v } = await sb().from("loja_vendas").select("dia").eq("cliente_id", id).order("dia", { ascending: false }).limit(1).maybeSingle();
    ultima = (v?.dia as string | undefined) ?? (ultima && ultima > dia ? ultima : null);
  }
  await ok(sb().from("loja_clientes").update({
    ultima_compra: ultima, n_compras: Math.max(0, (Number(c.n_compras) || 0) + compras), total: Math.max(0, r2((Number(c.total) || 0) + valor)),
  }).eq("id", id));
}

// ───── Vendas do dia ─────

/** Um item da venda: o tipo, a linha, a peça, o valor (de todas as peças do item) e o grupo do estoque. */
export type ItemVenda = { categoria: string; linha: string | null; produto: string | null; valor: number; pecas: number; estoque_id: string | null };
export type Venda = {
  id: string; dia: string; categoria: string; produto: string | null; valor: number; pecas: number; forma: Forma;
  cliente_id: string | null; maleta: boolean; created_at: string; linha: string | null; estoque_id: string | null;
  /** Os itens da venda (vendas antigas, de um item só, vêm montadas a partir das colunas). */
  itens: ItemVenda[];
};
export type NovaVenda = { id?: string; dia: string; forma: Forma; cliente_id: string | null; maleta: boolean; itens: ItemVenda[] };

/** Os itens da venda; as vendas de antes desta mudança têm um item só, nas colunas. */
const itensDe = (v: { itens?: unknown; categoria: string; linha: string | null; produto: string | null; valor: unknown; pecas: unknown; estoque_id: string | null }): ItemVenda[] =>
  Array.isArray(v.itens) && v.itens.length
    ? (v.itens as ItemVenda[]).map((i) => ({ ...i, valor: Number(i.valor) || 0, pecas: Number(i.pecas) || 1 }))
    : [{ categoria: v.categoria, linha: v.linha, produto: v.produto, valor: Number(v.valor) || 0, pecas: Number(v.pecas) || 1, estoque_id: v.estoque_id }];

/** "2 brincos", "1 anel". */
const PLURAL: Record<string, string> = { anel: "anéis", colar: "colares", "relógio": "relógios" };
const qtdTipo = (n: number, tipo: string) => {
  if (n <= 1) return tipo;
  const t = tipo.toLowerCase();
  return `${n} ${PLURAL[t] ?? (t.endsWith("s") ? t : `${t}s`)}`;
};
/** O que saiu, numa linha: "Anel prata 925, 2 brincos semijoia". */
export const descreverItens = (itens: ItemVenda[]) =>
  itens.map((i) => [qtdTipo(i.pecas, i.categoria), i.linha?.toLowerCase(), i.produto ? `(${i.produto})` : null].filter(Boolean).join(" ")).join(", ");

export async function buscarVendas(portalId: string, de: string, ate: string) {
  const { data } = await sb().from("loja_vendas").select("id, dia, categoria, produto, valor, pecas, forma, cliente_id, maleta, created_at, linha, estoque_id, itens")
    .eq("portal_id", portalId).gte("dia", de).lte("dia", ate).order("dia", { ascending: false }).order("created_at", { ascending: false });
  return (data ?? []).map((v) => ({ ...v, valor: Number(v.valor), pecas: Number(v.pecas), itens: itensDe(v) })) as Venda[];
}

/** Refaz o Fechamento de caixa do dia com as vendas lançadas. */
async function somarCaixa(portalId: string, dia: string) {
  const vs = await buscarVendas(portalId, dia, dia);
  if (!vs.length) {
    await sb().from("loja_caixa").delete().eq("portal_id", portalId).is("loja", null).eq("dia", dia).eq("obs", MARCA);
    return;
  }
  const pagamentos: Pagamentos = {};
  for (const v of vs) pagamentos[v.forma] = r2((pagamentos[v.forma] ?? 0) + v.valor);
  const mal = vs.filter((v) => v.maleta);
  await salvarCaixa(portalId, {
    loja: null, dia, obs: MARCA, vendedoras: null, pagamentos,
    faturamento: r2(vs.reduce((s, v) => s + v.valor, 0)), vendas: vs.length, pecas: vs.reduce((s, v) => s + v.pecas, 0),
    malinha: mal.length ? { faturamento: r2(mal.reduce((s, v) => s + v.valor, 0)), vendas: mal.length, pecas: mal.reduce((s, v) => s + v.pecas, 0) } : null,
  });
}

export async function salvarVenda(portalId: string, v: NovaVenda, antes?: Venda | null) {
  const itens = v.itens.map((i) => ({
    categoria: i.categoria, linha: i.linha || null, produto: i.produto?.trim().slice(0, 200) || null,
    valor: r2(i.valor), pecas: Math.max(1, Math.round(i.pecas || 1)), estoque_id: i.estoque_id || null,
  }));
  if (!itens.length) throw new Error("Escolha o que foi vendido.");
  if (itens.some((i) => !i.categoria)) throw new Error("Escolha o tipo de cada item.");
  if (itens.some((i) => !(i.valor > 0))) throw new Error("Escreva o valor de cada item.");
  const um = itens.length === 1 ? itens[0] : null;
  const linhas = [...new Set(itens.map((i) => i.linha).filter(Boolean))];
  // As colunas de sempre guardam o resumo da venda (total, peças e, com um item só, o detalhe dele).
  const linha = {
    portal_id: portalId, dia: v.dia || hoje(), forma: v.forma, cliente_id: v.cliente_id, maleta: v.maleta,
    categoria: um ? um.categoria : [...new Set(itens.map((i) => i.categoria))].join(", ").slice(0, 120),
    produto: um ? um.produto : itens.map((i) => i.produto).filter(Boolean).join(", ").slice(0, 200) || null,
    linha: um ? um.linha : linhas.length === 1 ? linhas[0] : null,
    estoque_id: um ? um.estoque_id : null,
    valor: r2(itens.reduce((s, i) => s + i.valor, 0)), pecas: itens.reduce((s, i) => s + i.pecas, 0), itens,
  };
  const salva = v.id
    ? await ok(sb().from("loja_vendas").update(linha).eq("id", v.id).select("id").single())
    : await ok(sb().from("loja_vendas").insert(linha).select("id").single());
  // A cliente: tira a venda antiga e soma a nova.
  if (antes) await ajustarCliente(antes.cliente_id, -1, -antes.valor, antes.dia);
  await ajustarCliente(linha.cliente_id, 1, linha.valor, linha.dia);
  await somarCaixa(portalId, linha.dia);
  if (antes && antes.dia !== linha.dia) await somarCaixa(portalId, antes.dia);
  return { id: (salva as { id: string }).id, valor: linha.valor };
}

export async function removerVenda(portalId: string, v: Venda) {
  // A conta do crediário aberta por esta venda sai junto.
  await ok(sb().from("loja_crediario").delete().eq("venda_id", v.id));
  await ok(sb().from("loja_vendas").delete().eq("id", v.id));
  await ajustarCliente(v.cliente_id, -1, -v.valor, v.dia);
  await somarCaixa(portalId, v.dia);
}

/** Registro da compra no crediário para a cliente guardar: o que levou, o valor e as parcelas combinadas. */
export function mensagemVenda(v: { nome: string; quem: string; loja: string; itens: ItemVenda[]; valor: number; parcelas?: Parcela[] | null; dia: string; saldo?: number | null }) {
  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const d = (x: string) => `${x.slice(8, 10)}/${x.slice(5, 7)}/${x.slice(0, 4)}`;
  const ps = v.parcelas ?? [];
  const primeiro = arrumarNome(v.nome).split(" ")[0];
  const linhas = [
    `Oi, ${primeiro.charAt(0).toUpperCase() + primeiro.slice(1)}! Aqui é ${v.quem}, da ${v.loja}.`,
    "Segue o registro das suas escolhas e das informações de pagamento que combinamos, para o seu controle:",
    "",
    `Compra de ${d(v.dia)}`,
    ...v.itens.map((i) => `• ${[qtdTipo(i.pecas, i.categoria), i.linha?.toLowerCase(), i.produto].filter(Boolean).join(" · ")} · ${brl(i.valor)}`),
    `Total: ${brl(v.valor)}`,
    `Pagamento: crediário${ps.length ? ` em ${ps.length}x` : ""}`,
  ];
  if (ps.length) linhas.push("", "Parcelas:", ...ps.map((p, i) => `${i + 1}ª · ${d(p.vence)} · ${brl(p.valor)}${p.pago_em ? " (paga ✓)" : ""}`));
  if (v.saldo != null && v.saldo > 0) linhas.push("", `Total em aberto no seu crediário com a gente: ${brl(v.saldo)}`);
  linhas.push("", "Qualquer dúvida, é só me chamar por aqui. 💛");
  return linhas.join("\n");
}

// ───── Parcelas (crediário e compras) ─────

export type Parcela = { vence: string; valor: number; pago_em: string | null };

/** Mesmo dia do mês; se o mês não tem esse dia, o último dia dele. */
export function somarMeses(d: string, n: number) {
  const [a, m, x] = d.split("-").map(Number);
  const t = a * 12 + (m - 1) + n;
  const ano = Math.floor(t / 12), mes = (t % 12) + 1;
  const ult = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return `${ano}-${String(mes).padStart(2, "0")}-${String(Math.min(x, ult)).padStart(2, "0")}`;
}

/** Divide o total em n parcelas mensais (os centavos que sobram vão na primeira). */
export function gerarParcelas(total: number, n: number, primeira: string): Parcela[] {
  const q = Math.max(1, Math.min(24, Math.round(n || 1)));
  const base = Math.floor((total / q) * 100) / 100;
  const resto = r2(total - base * q);
  return Array.from({ length: q }, (_, i) => ({ vence: somarMeses(primeira, i), valor: r2(base + (i === 0 ? resto : 0)), pago_em: null }));
}

export const emAberto = (ps: Parcela[]) => r2(ps.filter((p) => !p.pago_em).reduce((s, p) => s + p.valor, 0));
export const atrasadas = (ps: Parcela[], ref = hoje()) => ps.filter((p) => !p.pago_em && p.vence < ref);
export const proxima = (ps: Parcela[]) => ps.filter((p) => !p.pago_em).sort((a, b) => a.vence.localeCompare(b.vence))[0] ?? null;

// ───── Crediário ─────

export type Conta = {
  id: string; cliente_id: string | null; nome: string; whatsapp: string | null; venda_id: string | null;
  descricao: string | null; parcelas: Parcela[]; created_at: string;
};

export async function buscarCrediario(portalId: string) {
  const { data } = await sb().from("loja_crediario").select("id, cliente_id, nome, whatsapp, venda_id, descricao, parcelas, created_at").eq("portal_id", portalId).order("nome");
  return (data ?? []) as Conta[];
}

export async function salvarConta(portalId: string, c: Omit<Conta, "id" | "created_at"> & { id?: string }) {
  if (!c.nome.trim()) throw new Error("Escolha a cliente.");
  if (!c.parcelas.length || c.parcelas.some((p) => !(p.valor > 0) || !p.vence)) throw new Error("Confira o valor e o vencimento das parcelas.");
  const linha = { portal_id: portalId, cliente_id: c.cliente_id, nome: arrumarNome(c.nome).slice(0, 120), whatsapp: c.whatsapp, venda_id: c.venda_id, descricao: c.descricao?.trim().slice(0, 300) || null, parcelas: c.parcelas };
  await ok(c.id ? sb().from("loja_crediario").update(linha).eq("id", c.id) : sb().from("loja_crediario").insert(linha));
}
export const removerConta = (id: string) => ok(sb().from("loja_crediario").delete().eq("id", id));
export const marcarParcelas = (id: string, parcelas: Parcela[]) => ok(sb().from("loja_crediario").update({ parcelas }).eq("id", id));

/** Lembrete de parcela: quem fala, o valor, e duas opções de como pagar. */
export function mensagemCobranca(c: Conta, quem: string, loja: string, ref = hoje()) {
  const nome = arrumarNome(c.nome).split(" ")[0];
  const atr = atrasadas(c.parcelas, ref);
  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const d = (x: string) => `${x.slice(8, 10)}/${x.slice(5, 7)}`;
  if (atr.length) {
    const soma = r2(atr.reduce((s, p) => s + p.valor, 0));
    return `Oi, ${nome}! Aqui é ${quem}, da ${loja}. Ficou em aberto ${atr.length === 1 ? `a parcela de ${brl(soma)} que venceu em ${d(atr[0].vence)}` : `${atr.length} parcelas, no total de ${brl(soma)}`}. Você prefere acertar no Pix hoje ou passar aqui na loja amanhã?`;
  }
  const p = proxima(c.parcelas);
  if (!p) return `Oi, ${nome}! Aqui é ${quem}, da ${loja}.`;
  return `Oi, ${nome}! Aqui é ${quem}, da ${loja}. Passando para lembrar da parcela de ${brl(p.valor)} que vence em ${d(p.vence)}. Você prefere pagar no Pix ou passar aqui na loja?`;
}

// ───── Compras ─────

export type Compra = {
  id: string; dia: string; fornecedor: string; categoria: string | null; pecas: number | null; valor: number;
  parcelas: Parcela[]; obs: string | null; created_at: string; linha?: string | null;
};

export async function buscarCompras(portalId: string) {
  const { data } = await sb().from("loja_compras").select("id, dia, fornecedor, categoria, pecas, valor, parcelas, obs, created_at, linha").eq("portal_id", portalId).order("dia", { ascending: false }).limit(500);
  return (data ?? []).map((c) => ({ ...c, valor: Number(c.valor) })) as Compra[];
}

export async function salvarCompra(portalId: string, c: Omit<Compra, "id" | "created_at"> & { id?: string }) {
  if (!c.fornecedor.trim()) throw new Error("Escreva de quem você comprou.");
  if (!(c.valor > 0)) throw new Error("Escreva o valor da compra.");
  const linha = {
    portal_id: portalId, dia: c.dia || hoje(), fornecedor: c.fornecedor.trim().slice(0, 120), categoria: c.categoria || null, linha: c.linha || null,
    pecas: c.pecas && c.pecas > 0 ? Math.round(c.pecas) : null, valor: r2(c.valor), parcelas: c.parcelas, obs: c.obs?.trim().slice(0, 500) || null,
  };
  await ok(c.id ? sb().from("loja_compras").update(linha).eq("id", c.id) : sb().from("loja_compras").insert(linha));
}
export const removerCompra = (id: string) => ok(sb().from("loja_compras").delete().eq("id", id));
export const marcarParcelasCompra = (id: string, parcelas: Parcela[]) => ok(sb().from("loja_compras").update({ parcelas }).eq("id", id));

// ───── Estoque (por tipo, linha e preço) ─────

export type ItemEstoque = {
  id: string; categoria: string; linha: string | null; preco: number; qtd: number; entradas: number; contado_em: string; obs: string | null;
  /** Calculados: peças vendidas depois da contagem e o que tem hoje. */
  vendidas: number; atual: number;
};

export async function buscarEstoque(portalId: string): Promise<ItemEstoque[]> {
  const [{ data: itens }, { data: vendas }] = await Promise.all([
    sb().from("loja_estoque").select("id, categoria, linha, preco, qtd, entradas, contado_em, obs").eq("portal_id", portalId).order("categoria").order("preco"),
    sb().from("loja_vendas").select("categoria, linha, produto, valor, estoque_id, dia, pecas, itens").eq("portal_id", portalId).limit(20000),
  ]);
  // Cada item da venda que veio de um grupo do estoque baixa as peças dele.
  const saidas = (vendas ?? []).flatMap((v) => itensDe(v).filter((x) => x.estoque_id).map((x) => ({ estoque_id: x.estoque_id, dia: v.dia as string, pecas: x.pecas })));
  return (itens ?? []).map((i) => {
    const vendidas = saidas.filter((v) => v.estoque_id === i.id && v.dia >= i.contado_em).reduce((s, v) => s + v.pecas, 0);
    const qtd = Number(i.qtd), entradas = Number(i.entradas);
    return { ...i, preco: Number(i.preco), qtd, entradas, vendidas, atual: qtd + entradas - vendidas } as ItemEstoque;
  });
}

/** Novo grupo ou correção. Contar de novo zera as entradas e começa a conta a partir de hoje. */
export async function salvarItemEstoque(portalId: string, i: { id?: string; categoria: string; linha: string | null; preco: number; qtd: number; obs?: string | null; recontar?: boolean }) {
  if (!i.categoria) throw new Error("Escolha o tipo de peça.");
  if (!(i.preco > 0)) throw new Error("Escreva o preço de venda.");
  if (!(i.qtd >= 0)) throw new Error("Escreva quantas peças tem.");
  const linha: Record<string, unknown> = { portal_id: portalId, categoria: i.categoria, linha: i.linha || null, preco: r2(i.preco), qtd: Math.round(i.qtd), obs: i.obs?.trim().slice(0, 200) || null };
  if (!i.id || i.recontar) Object.assign(linha, { contado_em: hoje(), entradas: 0 });
  await ok(i.id ? sb().from("loja_estoque").update(linha).eq("id", i.id) : sb().from("loja_estoque").insert(linha));
}
export const entradaEstoque = async (i: ItemEstoque, n: number) => {
  if (!(n > 0)) throw new Error("Escreva quantas peças chegaram.");
  await ok(sb().from("loja_estoque").update({ entradas: i.entradas + Math.round(n) }).eq("id", i.id));
};
export const removerItemEstoque = (id: string) => ok(sb().from("loja_estoque").delete().eq("id", id));
