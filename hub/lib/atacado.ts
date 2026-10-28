"use client";

// Atacado: a carteira de lojistas, a reativação dos parados, a carteira por vendedora e as praças.
// A situação de cada lojista vem do último pedido: ativo (até 30 dias), em risco (31 a 60), parado (mais de 60).
import { hoje } from "@/lib/formato";
import { supabaseBrowser } from "@/lib/supabase/client";

export type ClienteAtacado = {
  id: string; portal_id: string; nome: string; documento: string; cidade: string; uf: string; canal: string; vendedora: string;
  telefone: string; ultimo_pedido: string | null; total_ano: number; pedidos: number; motivo: string; decisao: string; obs: string;
  tipo?: string; etapa?: string; aberto_em?: string | null; projecao?: number; exclusivo?: boolean;
};
export type Colecao = { id: string; portal_id: string; nome: string; inicio: string; fim: string; meta_aberturas: number; meta_valor: number; obs: string };
export type Area = { id: string; portal_id: string; cidade: string; uf: string; potencial: string; status: string; responsavel: string; motivo: string };
export type SecaoPolitica = { titulo: string; texto: string };
export type Contato = { id: string; portal_id: string; cliente_id: string; vendedora: string; dia: string; resultado: string; obs: string; created_at: string };

export type Situacao = "ativo" | "risco" | "parado" | "sem";
export const SITUACOES: Record<Situacao, { nome: string; classe: string }> = {
  ativo: { nome: "Ativo", classe: "feito" },
  risco: { nome: "Em risco", classe: "alerta" },
  parado: { nome: "Parado", classe: "erro" },
  sem: { nome: "Sem pedido", classe: "espera" },
};
export function diasSemPedido(c: Pick<ClienteAtacado, "ultimo_pedido">) {
  if (!c.ultimo_pedido) return null;
  return Math.round((Date.parse(hoje()) - Date.parse(c.ultimo_pedido)) / 86_400_000);
}
export function situacao(c: Pick<ClienteAtacado, "ultimo_pedido">): Situacao {
  const d = diasSemPedido(c);
  return d === null ? "sem" : d <= 30 ? "ativo" : d <= 60 ? "risco" : "parado";
}

export const MOTIVOS = ["Não sei ainda", "Estoque parado na loja dela", "Achou caro", "Problema de entrega ou troca", "Comprou de outro fornecedor", "Loja fechou ou mudou", "Ninguém ligou", "Só compra em data especial", "Cadastro errado ou duplicado"];
export const DECISOES = ["", "Reativar", "Substituir a praça", "Encerrar", "Corrigir cadastro"];
export const RESULTADOS = ["Fez pedido", "Vai fazer pedido", "Pediu catálogo ou visita", "Sem resposta", "Não quer mais", "Ligar de novo"];

/** Curva ABC pelo total do ano: A = os que somam 80%, B = até 95%, C = o resto. */
export function curvaAbc(lista: ClienteAtacado[]) {
  const ord = [...lista].sort((a, b) => Number(b.total_ano) - Number(a.total_ano));
  const total = ord.reduce((s, c) => s + Number(c.total_ano), 0) || 1;
  let acum = 0;
  const m = new Map<string, "A" | "B" | "C">();
  for (const c of ord) { acum += Number(c.total_ano); m.set(c.id, acum / total <= 0.8 ? "A" : acum / total <= 0.95 ? "B" : "C"); }
  return m;
}

const sb = () => supabaseBrowser();
async function ok<T extends { error: { message: string } | null }>(p: PromiseLike<T>) {
  const r = await p;
  if (r.error) throw new Error(r.error.message);
  return r;
}

/** Carteira (clientes), prospects, contatos dos últimos 35 dias, metas de contato e a política. */
export async function buscarAtacado(portalId: string) {
  const desde = new Date(Date.parse(hoje()) - 35 * 86_400_000).toISOString().slice(0, 10);
  const [c, k, cfg] = await Promise.all([
    sb().from("atacado_clientes").select("*").eq("portal_id", portalId).order("total_ano", { ascending: false }).limit(5000),
    sb().from("atacado_contatos").select("*").eq("portal_id", portalId).gte("dia", desde).order("created_at", { ascending: false }),
    sb().from("atacado_config").select("metas, politica").eq("portal_id", portalId).maybeSingle(),
  ]);
  const todos = (c.data ?? []) as ClienteAtacado[];
  return {
    clientes: todos.filter((x) => x.tipo !== "prospect"), prospects: todos.filter((x) => x.tipo === "prospect"), todos,
    contatos: (k.data ?? []) as Contato[], metas: ((cfg.data?.metas ?? {}) as Record<string, number>),
    politica: ((cfg.data?.politica ?? []) as SecaoPolitica[]),
  };
}

export const salvarCliente = (portalId: string, id: string | null, d: Partial<ClienteAtacado>) => {
  const dados = { ...d, updated_at: new Date().toISOString() };
  return ok(id ? sb().from("atacado_clientes").update(dados).eq("id", id) : sb().from("atacado_clientes").insert({ ...dados, portal_id: portalId }));
};
export const excluirCliente = (id: string) => ok(sb().from("atacado_clientes").delete().eq("id", id));
export const registrarContato = (portalId: string, clienteId: string, vendedora: string, resultado: string, obs = "") =>
  ok(sb().from("atacado_contatos").insert({ portal_id: portalId, cliente_id: clienteId, vendedora, resultado, obs, dia: hoje() }));
export const excluirContato = (id: string) => ok(sb().from("atacado_contatos").delete().eq("id", id));
export const salvarMetas = (portalId: string, metas: Record<string, number>) =>
  ok(sb().from("atacado_config").upsert({ portal_id: portalId, metas, updated_at: new Date().toISOString() }, { onConflict: "portal_id" }));
export const salvarPolitica = (portalId: string, politica: SecaoPolitica[]) =>
  ok(sb().from("atacado_config").upsert({ portal_id: portalId, politica, updated_at: new Date().toISOString() }, { onConflict: "portal_id" }));

// ───── Prospecção ─────
export const ETAPAS_PROSPECCAO = ["Mapeado", "Primeiro contato", "Apresentação feita", "Catálogo e política enviados", "Negociando o primeiro pedido", "Perdido"];
/** Fechou o primeiro pedido: vira cliente da carteira e conta como abertura na coleção. */
export const abrirCliente = (id: string, valor: number) =>
  salvarCliente("", id, { tipo: "cliente", etapa: "", aberto_em: hoje(), ultimo_pedido: hoje(), total_ano: valor, pedidos: 1 });

// ───── Coleções (meta de abertura) ─────
export async function buscarColecoes(portalId: string) {
  const { data } = await sb().from("atacado_colecoes").select("*").eq("portal_id", portalId).order("inicio", { ascending: false });
  return (data ?? []) as Colecao[];
}
export const salvarColecao = (portalId: string, id: string | null, d: Partial<Colecao>) =>
  ok(id ? sb().from("atacado_colecoes").update(d).eq("id", id) : sb().from("atacado_colecoes").insert({ ...d, portal_id: portalId }));
export const excluirColecao = (id: string) => ok(sb().from("atacado_colecoes").delete().eq("id", id));
/** Lojistas abertos (primeiro pedido) dentro da coleção. */
export const abertosNa = (col: Colecao, lista: ClienteAtacado[]) => lista.filter((c) => c.aberto_em && c.aberto_em >= col.inicio && c.aberto_em <= col.fim);

// ───── Áreas potenciais ─────
export const POTENCIAIS: Record<string, { nome: string; classe: string }> = {
  alto: { nome: "Alto", classe: "feito" }, medio: { nome: "Médio", classe: "andamento" }, baixo: { nome: "Baixo", classe: "espera" },
};
export const STATUS_AREA: Record<string, string> = { mapeada: "Mapeada", prospectando: "Prospectando", aberta: "Aberta (tem lojista)", descartada: "Descartada" };
export async function buscarAreas(portalId: string) {
  const { data } = await sb().from("atacado_areas").select("*").eq("portal_id", portalId).order("created_at", { ascending: false });
  return (data ?? []) as Area[];
}
export const salvarArea = (portalId: string, id: string | null, d: Partial<Area>) =>
  ok(id ? sb().from("atacado_areas").update(d).eq("id", id) : sb().from("atacado_areas").insert({ ...d, portal_id: portalId }));
export const excluirArea = (id: string) => ok(sb().from("atacado_areas").delete().eq("id", id));

// ───── Política unificada ─────
/** O modelo para começar: a loja troca os textos pelos dela. */
export const POLITICA_PADRAO: SecaoPolitica[] = [
  { titulo: "Apresentação da marca (o passo a passo)", texto: "1. Quem somos: a história da marca em 3 frases.\n2. Para quem vendemos: a cliente final da lojista.\n3. As linhas e a coleção atual (catálogo).\n4. Por que a loja vende mais com a marca: giro, margem, reposição.\n5. Como funciona comprar: pedido mínimo, prazo e entrega.\n6. Próximo passo combinado com data." },
  { titulo: "Política comercial", texto: "Pedido mínimo: \nPrazo de pagamento: \nDescontos (à vista, volume): \nFrete: \nPrazo de entrega: \nTrocas e defeitos: \nReposição: " },
  { titulo: "Política de exclusividade", texto: "Quem tem direito: \nRaio ou cidade de exclusividade: \nCompra mínima por coleção para manter: \nQuando perde a exclusividade: \nComo é revisada (a cada coleção): " },
];

// ───── Importar a planilha do sistema (CSV) ─────

const sem = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const CAMPOS: [keyof ClienteAtacado, RegExp][] = [
  ["nome", /^(nome|cliente|razao|razao social|fantasia|nome fantasia|lojista)/],
  ["documento", /(cnpj|cpf|documento)/],
  ["cidade", /(cidade|municipio|praca)/],
  ["uf", /^(uf|estado)$/],
  ["canal", /(canal|empresa|marca)/],
  ["vendedora", /(vendedor|representante|consultor)/],
  ["telefone", /(telefone|whatsapp|celular|fone)/],
  ["ultimo_pedido", /(ultim|ult\.? ?(compra|pedido)|data)/],
  ["total_ano", /(total|valor|faturamento|comprou)/],
  ["pedidos", /(pedidos|qtd|quantidade|n de pedidos)/],
];

/** Lê o CSV (vírgula ou ponto e vírgula) e devolve as linhas já com os campos do Hub. */
export function lerPlanilha(texto: string) {
  const linhas = texto.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (linhas.length < 2) return { mapa: {} as Record<string, string>, clientes: [] as Partial<ClienteAtacado>[] };
  const sep = (linhas[0].match(/;/g)?.length ?? 0) > (linhas[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const partir = (l: string) => {
    const out: string[] = []; let atual = ""; let aspas = false;
    for (const ch of l) { if (ch === '"') aspas = !aspas; else if (ch === sep && !aspas) { out.push(atual); atual = ""; } else atual += ch; }
    out.push(atual); return out.map((x) => x.trim());
  };
  const cab = partir(linhas[0]);
  const col: Partial<Record<keyof ClienteAtacado, number>> = {};
  cab.forEach((h, i) => { const c = CAMPOS.find(([k, re]) => col[k] === undefined && re.test(sem(h))); if (c) col[c[0]] = i; });
  const num = (t: string) => Number(t.replace(/[R$\s]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")) || 0;
  const data = (t: string) => {
    const m = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m) return `${m[3].length === 2 ? "20" + m[3] : m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : null;
  };
  const clientes = linhas.slice(1).map(partir).map((v) => {
    const g = (k: keyof ClienteAtacado) => (col[k] !== undefined ? v[col[k]!] ?? "" : "");
    return {
      nome: g("nome").slice(0, 160), documento: g("documento").slice(0, 30), cidade: g("cidade").slice(0, 80), uf: g("uf").toUpperCase().slice(0, 2),
      canal: g("canal").slice(0, 40), vendedora: g("vendedora").slice(0, 60), telefone: g("telefone").slice(0, 30),
      ultimo_pedido: data(g("ultimo_pedido")), total_ano: num(g("total_ano")), pedidos: Math.round(num(g("pedidos"))),
    };
  }).filter((c) => c.nome.trim());
  const mapa = Object.fromEntries(Object.entries(col).map(([k, i]) => [k, cab[i as number]]));
  return { mapa, clientes };
}

/** Grava a importação: quem já existe (mesmo nome ou documento) é atualizado; o resto entra novo. */
export async function importarClientes(portalId: string, novos: Partial<ClienteAtacado>[], atuais: ClienteAtacado[]) {
  const chave = (c: Partial<ClienteAtacado>) => (c.documento?.replace(/\D/g, "") || sem(c.nome ?? ""));
  const porChave = new Map(atuais.map((c) => [chave(c), c]));
  const inserir: Partial<ClienteAtacado>[] = [];
  let atualizados = 0;
  for (const n of novos) {
    const ja = porChave.get(chave(n));
    if (ja) {
      const campos = Object.fromEntries(Object.entries(n).filter(([, v]) => v !== "" && v !== null && v !== 0));
      await salvarCliente(portalId, ja.id, campos); atualizados++;
    } else inserir.push({ ...n, portal_id: portalId });
  }
  for (let i = 0; i < inserir.length; i += 500) await ok(sb().from("atacado_clientes").insert(inserir.slice(i, i + 500)));
  return { novos: inserir.length, atualizados };
}
