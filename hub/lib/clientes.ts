"use client";

// De cliente a fã: a base de clientes da loja, o tipo de cada cliente, o resgate e a importação de planilha.
// Aqui fica só a lógica. O conteúdo do método (o que fazer com cada tipo, mensagens, campanhas, experiência)
// fica no banco, na tabela "metodo" (chave 'clientes'), e chega por buscarMetodoClientes().
import { supabaseBrowser } from "@/lib/supabase/client";

export type Tipo = "Nova" | "Recorrente" | "VIP" | "Em risco" | "Sumida";
export type TipoOuSem = Tipo | "Sem data";
export const TIPOS: Tipo[] = ["Nova", "Recorrente", "VIP", "Em risco", "Sumida"];

export const DIAS_ATIVA = 90;
export const DIAS_RISCO = 180;
export const QUANTAS_VIP = 20;
/** Base pequena: VIP é 1 em cada 5 clientes (no máximo 20), para não virar todo mundo VIP. */
export const quantasVip = (tamanho: number) => Math.min(QUANTAS_VIP, Math.floor(tamanho / 5));

/** Como cada tipo é calculado, numa linha (aparece nas páginas). */
export const REGRAS: Record<TipoOuSem, string> = {
  Nova: "1 compra, a última nos últimos 90 dias.",
  Recorrente: "2 compras ou mais, a última nos últimos 90 dias.",
  VIP: "Entre as que mais gastaram na loja (as 20 maiores, ou 1 em cada 5 numa base pequena) e comprou nos últimos 90 dias.",
  "Em risco": "A última compra foi entre 91 e 180 dias atrás.",
  Sumida: "A última compra foi há mais de 180 dias.",
  "Sem data": "Ainda sem a data da última compra. Preencha para entrar num tipo.",
};

export const CLASSE_TIPO: Record<TipoOuSem, string> = {
  Nova: "espera", Recorrente: "feito", VIP: "andamento", "Em risco": "alerta", Sumida: "erro", "Sem data": "espera",
};

export type Cliente = {
  id: string; portal_id: string; loja: string | null; nome: string; whatsapp: string | null; aniversario: string | null;
  ultima_compra: string | null; n_compras: number; total: number; vendedora: string | null; obs: string | null;
  contato_em: string | null; created_at?: string;
};

export type MetodoTipo = { objetivo: string; acoes: string[]; mensagem: string };
export type Campanha = { nome: string; quando: string; para_quem: string; como: string; meta: string };
export type MetodoClientes = {
  rascunho?: boolean;
  textos?: Record<string, string>;
  tipos: Record<Tipo, MetodoTipo>;
  campanhas: Campanha[];
  experiencia: { antes: string[]; durante: string[]; depois: string[] };
};

// ───── Datas ─────

/** Dias entre duas datas "aaaa-mm-dd" (positivo = a primeira é mais antiga). */
export function diasEntre(de: string, ate: string) {
  return Math.round((Date.parse(ate.slice(0, 10)) - Date.parse(de.slice(0, 10))) / 86_400_000);
}

/** Segunda-feira da semana da data. */
export function inicioSemana(ref: string) {
  const d = new Date(`${ref.slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

// ───── Tipo de cada cliente ─────

export type Leitura = { tipo: TipoOuSem; dias: number | null; top: boolean };

/** Tipo de cada cliente na data ref. As 20 maiores são contadas dentro de cada loja do portal. */
export function classificar(cs: Cliente[], ref: string) {
  const top = new Set<string>();
  const porLoja = new Map<string, Cliente[]>();
  cs.forEach((c) => { const k = c.loja ?? ""; porLoja.set(k, [...(porLoja.get(k) ?? []), c]); });
  porLoja.forEach((grupo) => {
    [...grupo].filter((c) => Number(c.total) > 0).sort((a, b) => Number(b.total) - Number(a.total)).slice(0, quantasVip(grupo.length)).forEach((c) => top.add(c.id));
  });
  const out = new Map<string, Leitura>();
  cs.forEach((c) => {
    const ehTop = top.has(c.id);
    if (!c.ultima_compra) { out.set(c.id, { tipo: "Sem data", dias: null, top: ehTop }); return; }
    const dias = diasEntre(c.ultima_compra, ref);
    const tipo: Tipo = dias > DIAS_RISCO ? "Sumida" : dias > DIAS_ATIVA ? "Em risco" : ehTop ? "VIP" : c.n_compras >= 2 ? "Recorrente" : "Nova";
    out.set(c.id, { tipo, dias, top: ehTop });
  });
  return out;
}

export function contarTipos(leituras: Map<string, Leitura>, ids?: string[]) {
  const n: Record<TipoOuSem, number> = { Nova: 0, Recorrente: 0, VIP: 0, "Em risco": 0, Sumida: 0, "Sem data": 0 };
  (ids ?? [...leituras.keys()]).forEach((id) => { const l = leituras.get(id); if (l) n[l.tipo] += 1; });
  return n;
}

/** Ordem de cada lista: Nova e Recorrente pela compra mais recente, VIP por quem mais gastou, risco e sumida pela mais antiga. */
export function ordenarDoTipo(tipo: TipoOuSem, cs: Cliente[]) {
  const data = (c: Cliente) => c.ultima_compra ?? "";
  if (tipo === "VIP") return [...cs].sort((a, b) => Number(b.total) - Number(a.total));
  if (tipo === "Em risco" || tipo === "Sumida") return [...cs].sort((a, b) => data(a).localeCompare(data(b)));
  return [...cs].sort((a, b) => data(b).localeCompare(data(a)));
}

// ───── Resgate ─────

/** Mandou a mensagem e ela ainda não comprou de novo. */
export const contatada = (c: Cliente) => !!c.contato_em && (!c.ultima_compra || c.ultima_compra < c.contato_em);
/** Comprou de novo no dia do contato ou depois. */
export const resgatada = (c: Cliente) => !!c.contato_em && !!c.ultima_compra && c.ultima_compra >= c.contato_em;

export function resumoResgate(cs: Cliente[], ref: string) {
  const mes = ref.slice(0, 7), semana = inicioSemana(ref);
  return {
    resgatadasMes: cs.filter((c) => resgatada(c) && c.ultima_compra!.slice(0, 7) === mes),
    contatadasSemana: cs.filter((c) => contatada(c) && c.contato_em! >= semana).length,
  };
}

// ───── Mensagens ─────

export const MENSAGEM_SIMPLES = "Oi, {nome}! Aqui é da {loja}. Passando para dizer que chegaram novidades e lembrei de você. Quer que eu te mande algumas fotos?";

/** "pronto" = a loja vê; "rascunho" = só a equipe vê (com aviso); "preparo" = a loja ainda não vê. */
export function estadoConteudo(m: MetodoClientes | null, equipe: boolean): "pronto" | "rascunho" | "preparo" {
  if (!m) return "preparo";
  if (!m.rascunho) return "pronto";
  return equipe ? "rascunho" : "preparo";
}

/** "MARIA DA SILVA" → "Maria da Silva" (só quando o nome veio todo em maiúsculas). */
export function arrumarNome(nome: string) {
  const n = nome.trim().replace(/\s+/g, " ");
  if (n !== n.toUpperCase() || !/[A-ZÀ-Ý]/.test(n)) return n;
  return n.toLowerCase().split(" ").map((p, i) => (i > 0 && /^(da|de|do|das|dos|e)$/.test(p) ? p : p.charAt(0).toUpperCase() + p.slice(1))).join(" ");
}

export const primeiro = (nome: string) => arrumarNome(nome).split(" ")[0] ?? "";

export function preencher(modelo: string, v: { nome: string; loja: string }) {
  return modelo.replace(/\{nome\}/g, primeiro(v.nome)).replace(/\{loja\}/g, v.loja);
}

export function mensagemDoTipo(m: MetodoClientes | null, equipe: boolean, tipo: TipoOuSem, v: { nome: string; loja: string }) {
  const modelo = estadoConteudo(m, equipe) !== "preparo" && tipo !== "Sem data" ? m?.tipos?.[tipo]?.mensagem : null;
  return preencher(modelo || MENSAGEM_SIMPLES, v);
}

/** Número para o wa.me: só dígitos, com 55 na frente quando é um número do Brasil sem o código do país. */
export function whatsDigitos(tel: string | null | undefined) {
  let d = (tel ?? "").replace(/\D/g, "").replace(/^0+/, "");
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  return d.length >= 12 && d.length <= 15 ? d : null;
}

export function linkWhats(tel: string | null | undefined, texto: string) {
  const d = whatsDigitos(tel);
  return d ? `https://wa.me/${d}?text=${encodeURIComponent(texto)}` : null;
}

/** "(81) 99999-1234" para mostrar na lista. */
export function telefoneBonito(tel: string | null | undefined) {
  const d = (tel ?? "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return tel ?? "";
}

export const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// ───── Leitura de valores digitados ou importados ─────

/** Data em "dd/mm/aaaa", "dd/mm/aa", "aaaa-mm-dd" (com ou sem hora) ou número de série do Excel → "aaaa-mm-dd".
 * Com semAno, "dd/mm" também vale (o ano fica 2000, só o dia e o mês importam no aniversário). */
export function lerData(s: string | null | undefined, semAno = false): string | null {
  const t = (s ?? "").trim();
  if (!t) return null;
  let a: number, m: number, d: number;
  let x: RegExpMatchArray | null;
  if ((x = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) [a, m, d] = [+x[1], +x[2], +x[3]];
  else if ((x = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?!\d)/))) {
    [d, m, a] = [+x[1], +x[2], +x[3]];
    if (x[3].length === 2) a += a < 50 ? 2000 : 1900;
    else if (x[3].length === 3) return null;
  } else if (semAno && (x = t.match(/^(\d{1,2})[-/.](\d{1,2})$/))) [d, m, a] = [+x[1], +x[2], 2000];
  else if (/^\d{5}$/.test(t) && +t > 20000 && +t < 80000) return new Date(Date.UTC(1899, 11, 30) + +t * 86_400_000).toISOString().slice(0, 10);
  else return null;
  const dt = new Date(Date.UTC(a, m - 1, d));
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d || a < 1900) return null;
  return dt.toISOString().slice(0, 10);
}

/** "R$ 1.234,56", "1234.56", "1.234" → número. */
export function lerValor(s: string | null | undefined): number | null {
  let t = (s ?? "").replace(/R\$|\s/gi, "").replace(/[^\d.,-]/g, "");
  if (!t || !/\d/.test(t)) return null;
  const v = t.lastIndexOf(","), p = t.lastIndexOf(".");
  if (v >= 0 && p >= 0) t = v > p ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  else if (v >= 0) t = /^-?\d{1,3}(,\d{3}){2,}$/.test(t) ? t.replace(/,/g, "") : t.replace(/,/g, ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export function lerInteiro(s: string | null | undefined): number | null {
  const n = lerValor(s);
  return n == null ? null : Math.max(0, Math.round(n));
}

/** Data guardada → "dd/mm" (aniversário). */
export const diaMes = (d: string | null | undefined) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : "—");

// ───── Planilha ─────

export type Campo = "nome" | "whatsapp" | "aniversario" | "ultima_compra" | "n_compras" | "total" | "vendedora" | "obs" | "loja";
export const CAMPOS: { campo: Campo; rotulo: string }[] = [
  { campo: "nome", rotulo: "Nome" }, { campo: "whatsapp", rotulo: "WhatsApp" }, { campo: "aniversario", rotulo: "Aniversário" },
  { campo: "ultima_compra", rotulo: "Última compra" }, { campo: "n_compras", rotulo: "Nº de compras" }, { campo: "total", rotulo: "Total gasto" },
  { campo: "vendedora", rotulo: "Vendedora" }, { campo: "obs", rotulo: "Observação" }, { campo: "loja", rotulo: "Loja" },
];

/** Texto colado ou arquivo .csv → linhas e colunas. Descobre o separador (tab, ponto e vírgula ou vírgula). */
export function lerTabela(texto: string): string[][] {
  const t = texto.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const primeira = t.split("\n").find((l) => l.trim()) ?? "";
  const conta = (c: string) => primeira.split(c).length - 1;
  const sep = conta("\t") > 0 ? "\t" : conta(";") >= conta(",") && conta(";") > 0 ? ";" : ",";
  const linhas: string[][] = [];
  let linha: string[] = [], campo = "", aspas = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (aspas) {
      if (ch === '"' && t[i + 1] === '"') { campo += '"'; i++; }
      else if (ch === '"') aspas = false;
      else campo += ch;
    } else if (ch === '"' && campo.trim() === "") { aspas = true; campo = ""; }
    else if (ch === sep) { linha.push(campo.trim()); campo = ""; }
    else if (ch === "\n") { linha.push(campo.trim()); linhas.push(linha); linha = []; campo = ""; }
    else campo += ch;
  }
  linha.push(campo.trim());
  linhas.push(linha);
  return linhas.filter((l) => l.some((c) => c !== ""));
}

/** Qual campo é esta coluna, pelo nome do cabeçalho. */
export function detectarCampo(cabecalho: string): Campo | null {
  const h = semAcento(cabecalho).replace(/[_.\-/]+/g, " ").replace(/\s+/g, " ");
  if (!h || /medi[ao]|\bcod|codigo|\bid\b|cpf|cnpj|e ?mail|cep\b|endereco|bairro|cidade/.test(h)) return null;
  if (/vendedor|atendente|consultor|colaborador/.test(h)) return "vendedora";
  if (/aniversario|nascimento|nasc\b|dt nasc/.test(h)) return "aniversario";
  if (/ultim[ao]|data|dt\b/.test(h) && !/cadastro|contato/.test(h)) return "ultima_compra";
  if (/valor|gasto|faturamento|montante|r\$|ticket total|vl\b/.test(h)) return "total";
  if (/qtd|qtde|quantidade|numero|n de|nº|n compras|pedidos|frequencia|vezes|n vendas/.test(h)) return "n_compras";
  if (/total/.test(h)) return "total";
  if (/compras|vendas/.test(h)) return "n_compras";
  if (/whats|celular|telefone|fone|tel\b|contato/.test(h)) return "whatsapp";
  if (/loja|filial|unidade/.test(h)) return "loja";
  if (/obs|observ|nota|coment/.test(h)) return "obs";
  if (/nome|cliente/.test(h)) return "nome";
  return null;
}

/** Um campo para cada coluna; cada campo fica só com a primeira coluna que bater. */
export function detectarColunas(cab: string[]): (Campo | null)[] {
  const usados = new Set<Campo>();
  return cab.map((c) => {
    const campo = detectarCampo(c);
    if (!campo || usados.has(campo)) return null;
    usados.add(campo);
    return campo;
  });
}

export type Linha = {
  nome: string; whatsapp: string | null; aniversario: string | null; ultima_compra: string | null;
  n_compras: number | null; total: number | null; vendedora: string | null; obs: string | null; loja: string | null;
};

export function linhasDaTabela(tab: string[][], colunas: (Campo | null)[]) {
  const linhas: Linha[] = [];
  let ignoradas = 0;
  tab.slice(1).forEach((r) => {
    const v = (campo: Campo) => { const i = colunas.indexOf(campo); return i >= 0 ? (r[i] ?? "").trim() : ""; };
    const nome = arrumarNome(v("nome")).slice(0, 120);
    if (!nome) { ignoradas++; return; }
    linhas.push({
      nome,
      whatsapp: v("whatsapp").slice(0, 40) || null,
      aniversario: lerData(v("aniversario"), true),
      ultima_compra: lerData(v("ultima_compra")),
      n_compras: lerInteiro(v("n_compras")),
      total: lerValor(v("total")),
      vendedora: v("vendedora").slice(0, 80) || null,
      obs: v("obs").slice(0, 1000) || null,
      loja: v("loja").slice(0, 80) || null,
    });
  });
  return { linhas, ignoradas };
}

/** Mesma cliente: mesmo WhatsApp (últimos 8 dígitos) ou, sem WhatsApp, mesmo nome. Sempre dentro da mesma loja. */
export function chaves(c: { nome: string; whatsapp: string | null; loja: string | null }) {
  const d = (c.whatsapp ?? "").replace(/\D/g, "");
  const loja = semAcento(c.loja ?? "");
  return { tel: d.length >= 8 ? `${loja}|${d.slice(-8)}` : null, nome: `${loja}|${semAcento(c.nome).replace(/\s+/g, " ")}` };
}

const maior = (a: string | null, b: string | null) => (!a ? b : !b ? a : a > b ? a : b);

/** Planilha com uma linha por venda: junta as linhas da mesma cliente (soma compras e total, fica com a última data). */
export function agrupar(linhas: Linha[]): Linha[] {
  const grupos = new Map<string, Linha[]>();
  const porTel = new Map<string, string>();
  const porNome = new Map<string, { chave: string; tel: string | null }>();
  linhas.forEach((l) => {
    const k = chaves(l);
    let chave = k.tel ? porTel.get(k.tel) : undefined;
    const n = porNome.get(k.nome);
    // Mesmo nome só junta quando um dos lados não tem WhatsApp (duas Marias com números diferentes são duas clientes).
    if (!chave && n && (!k.tel || !n.tel)) chave = n.chave;
    chave ??= k.tel ?? k.nome;
    grupos.set(chave, [...(grupos.get(chave) ?? []), l]);
    if (k.tel) porTel.set(k.tel, chave);
    if (!n || (k.tel && !n.tel && n.chave === chave)) porNome.set(k.nome, { chave, tel: k.tel ?? n?.tel ?? null });
  });
  return [...grupos.values()].map((g) => {
    if (g.length === 1) {
      const l = g[0];
      return { ...l, n_compras: l.n_compras ?? (l.ultima_compra || (l.total ?? 0) > 0 ? 1 : 0) };
    }
    const recente = [...g].sort((a, b) => (b.ultima_compra ?? "").localeCompare(a.ultima_compra ?? ""))[0];
    const temCompras = g.some((l) => l.n_compras != null);
    return {
      nome: recente.nome,
      whatsapp: g.find((l) => l.whatsapp)?.whatsapp ?? null,
      aniversario: g.find((l) => l.aniversario)?.aniversario ?? null,
      ultima_compra: g.reduce<string | null>((m, l) => maior(m, l.ultima_compra), null),
      n_compras: temCompras ? g.reduce((s, l) => s + (l.n_compras ?? 0), 0) : g.length,
      total: Math.round(g.reduce((s, l) => s + (l.total ?? 0), 0) * 100) / 100,
      vendedora: recente.vendedora ?? g.find((l) => l.vendedora)?.vendedora ?? null,
      obs: [...new Set(g.map((l) => l.obs).filter(Boolean))].join(" · ") || null,
      loja: recente.loja,
    };
  });
}

export type NovaCliente = Omit<Cliente, "id" | "portal_id" | "created_at">;

/** O que a importação vai fazer: quem entra e quem já existe (e é atualizada).
 * Atualizar nunca apaga o que já estava anotado e nunca diminui compras, total ou a data da última compra. */
export function planoImportacao(existentes: Cliente[], linhas: Linha[], lojaDe: (l: Linha) => string | null) {
  const porTel = new Map<string, Cliente>(), porNome = new Map<string, Cliente>();
  existentes.forEach((c) => { const k = chaves(c); if (k.tel) porTel.set(k.tel, c); if (!porNome.has(k.nome)) porNome.set(k.nome, c); });
  const inserir: NovaCliente[] = [];
  const atualizar = new Map<string, Cliente>();
  agrupar(linhas).forEach((l) => {
    const loja = lojaDe(l);
    const k = chaves({ ...l, loja });
    const achada = (k.tel ? porTel.get(k.tel) : undefined) ?? (() => {
      const c = porNome.get(k.nome);
      return c && (!k.tel || !chaves(c).tel) ? c : undefined;
    })();
    const base = achada ? atualizar.get(achada.id) ?? achada : null;
    if (base) {
      atualizar.set(base.id, {
        ...base,
        whatsapp: l.whatsapp ?? base.whatsapp,
        aniversario: l.aniversario ?? base.aniversario,
        ultima_compra: maior(base.ultima_compra, l.ultima_compra),
        n_compras: Math.max(base.n_compras, l.n_compras ?? 0),
        total: Math.max(Number(base.total), l.total ?? 0),
        vendedora: l.vendedora ?? base.vendedora,
        obs: base.obs && l.obs && !base.obs.includes(l.obs) ? `${base.obs} · ${l.obs}` : base.obs ?? l.obs,
      });
    } else {
      inserir.push({
        loja, nome: l.nome, whatsapp: l.whatsapp, aniversario: l.aniversario, ultima_compra: l.ultima_compra,
        n_compras: l.n_compras ?? 0, total: l.total ?? 0, vendedora: l.vendedora, obs: l.obs, contato_em: null,
      });
    }
  });
  return { inserir, atualizar: [...atualizar.values()] };
}

// ───── Dados ─────

const sb = () => supabaseBrowser();

async function ok<T extends { error: { message: string } | null }>(p: PromiseLike<T>) {
  const r = await p;
  if (r.error) throw new Error(r.error.message);
  return r;
}

const COLUNAS = "id, portal_id, loja, nome, whatsapp, aniversario, ultima_compra, n_compras, total, vendedora, obs, contato_em, created_at";

/** Todas as clientes do portal (o banco entrega de mil em mil). */
export async function buscarClientes(portalId: string): Promise<Cliente[]> {
  const todas: Cliente[] = [];
  for (let de = 0; ; de += 1000) {
    const r = await sb().from("loja_clientes").select(COLUNAS).eq("portal_id", portalId).order("nome").order("id").range(de, de + 999);
    if (r.error) throw new Error(r.error.message);
    const lote = (r.data ?? []) as Cliente[];
    todas.push(...lote.map((c) => ({ ...c, total: Number(c.total) })));
    if (lote.length < 1000) return todas;
  }
}

let metodo: Promise<MetodoClientes | null> | null = null;
/** O conteúdo do método vem do banco uma vez por sessão (null = ainda não existe). */
export function buscarMetodoClientes(): Promise<MetodoClientes | null> {
  metodo ??= (async () => {
    const r = await sb().from("metodo").select("dados").eq("chave", "clientes").maybeSingle();
    if (r.error) { metodo = null; throw new Error(r.error.message); }
    return (r.data?.dados as MetodoClientes | undefined) ?? null;
  })();
  return metodo;
}

/** Campos do formulário de cliente → dados para salvar. */
export function dadosDoForm(form: FormData) {
  const txt = (k: string, max: number) => String(form.get(k) ?? "").trim().slice(0, max) || null;
  const aniv = txt("aniversario", 20);
  const dados = {
    nome: arrumarNome(String(form.get("nome") ?? "")).slice(0, 120),
    whatsapp: txt("whatsapp", 40),
    aniversario: lerData(aniv, true),
    ultima_compra: lerData(txt("ultima_compra", 20)),
    n_compras: lerInteiro(txt("n_compras", 10)) ?? 0,
    total: lerValor(txt("total", 20)) ?? 0,
    vendedora: txt("vendedora", 80),
    obs: txt("obs", 1000),
    loja: txt("loja", 80),
  };
  if (!dados.nome) throw new Error("Escreva o nome.");
  if (aniv && !dados.aniversario) throw new Error("Aniversário: escreva o dia e o mês, por exemplo 25/03.");
  return dados;
}

export const clienteSalvar = (portalId: string, id: string | null, form: FormData) => {
  const dados = dadosDoForm(form);
  return ok(id ? sb().from("loja_clientes").update(dados).eq("id", id) : sb().from("loja_clientes").insert({ ...dados, portal_id: portalId }));
};
export const clienteRemover = (id: string) => ok(sb().from("loja_clientes").delete().eq("id", id));
export const marcarContato = (id: string, data: string | null) => ok(sb().from("loja_clientes").update({ contato_em: data }).eq("id", id));

/** Ela voltou a comprar: nova data, mais uma compra e o valor somado ao total. */
export const registrarCompra = (c: Cliente, data: string, valor: number) =>
  ok(sb().from("loja_clientes").update({
    ultima_compra: maior(c.ultima_compra, data), n_compras: c.n_compras + 1, total: Math.round((Number(c.total) + valor) * 100) / 100,
  }).eq("id", c.id));

export async function importar(portalId: string, plano: ReturnType<typeof planoImportacao>) {
  for (let i = 0; i < plano.inserir.length; i += 500) {
    await ok(sb().from("loja_clientes").insert(plano.inserir.slice(i, i + 500).map((c) => ({ ...c, portal_id: portalId }))));
  }
  for (let i = 0; i < plano.atualizar.length; i += 500) {
    await ok(sb().from("loja_clientes").upsert(plano.atualizar.slice(i, i + 500)));
  }
}
