"use client";

// Radar das iscas: lê o CSV exportado do Respondi, organiza as respostas em colunas comuns e importa para o Supabase.
// O arquivo vai do navegador direto para o banco; nada passa pelo repositório.
import { supabaseBrowser } from "@/lib/supabase/client";
import { normalizar } from "@/lib/agenda-regras";

export type Campo = "" | "nome" | "whatsapp" | "instagram" | "funcionarios" | "desafio" | "faturamento" | "topa_diagnostico" | "motivo" | "data" | "extra";
export const CAMPOS: { id: Campo; rotulo: string }[] = [
  { id: "", rotulo: "Ignorar" }, { id: "nome", rotulo: "Nome" }, { id: "whatsapp", rotulo: "WhatsApp" }, { id: "instagram", rotulo: "Instagram" },
  { id: "funcionarios", rotulo: "Funcionários" }, { id: "faturamento", rotulo: "Faturamento" }, { id: "desafio", rotulo: "Desafio ou dor" },
  { id: "topa_diagnostico", rotulo: "Topa o diagnóstico" }, { id: "motivo", rotulo: "Motivo (texto livre)" }, { id: "data", rotulo: "Data da resposta" },
  { id: "extra", rotulo: "Guardar como informação extra" },
];

export type Resposta = {
  id: string; isca: string; respondido_em: string | null; importado_em: string; nome: string | null; whatsapp: string | null; instagram: string | null;
  funcionarios: string | null; faturamento: string | null; topa_diagnostico: boolean | null; desafio: string | null; motivo: string | null; temas: string[];
  extras: Record<string, string>;
};

// ----- Arquivo CSV -----
/** Lê o arquivo como UTF-8; se não for, tenta o formato do Excel em português (Windows-1252). */
export async function lerArquivo(arq: File) {
  const bytes = await arq.arrayBuffer();
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { return new TextDecoder("windows-1252").decode(bytes); }
}

export function lerCsv(texto: string): string[][] {
  const t = texto.replace(/^﻿/, "");
  const cabecalho = t.split(/\r?\n/, 1)[0] ?? "";
  const contar = (s: string) => { let n = 0, aspas = false; for (const c of cabecalho) { if (c === '"') aspas = !aspas; else if (c === s && !aspas) n++; } return n; };
  const sep = [";", "\t", ","].sort((a, b) => contar(b) - contar(a))[0];
  const linhas: string[][] = [];
  let campo = "", linha: string[] = [], aspas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) { if (c === '"') { if (t[i + 1] === '"') { campo += '"'; i++; } else aspas = false; } else campo += c; }
    else if (c === '"') aspas = true;
    else if (c === sep) { linha.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      linha.push(campo); campo = "";
      if (linha.some((x) => x.trim() !== "")) linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  if (campo !== "" || linha.length) { linha.push(campo); if (linha.some((x) => x.trim() !== "")) linhas.push(linha); }
  return linhas;
}

/** Sugere para onde vai cada coluna, pelo texto da pergunta. O usuário pode corrigir antes de importar. */
export function sugerirMapa(cabecalho: string[]): Campo[] {
  const usado = new Set<Campo>();
  return cabecalho.map((titulo) => {
    const t = normalizar(titulo);
    const regras: [Campo, RegExp][] = [
      ["whatsapp", /telefone|whatsapp|celular|\bfone\b/], ["instagram", /instagram|\binsta\b/], ["nome", /^nome|nome completo/],
      ["data", /^data|respondid|submitted|timestamp|criado em|created/], ["topa_diagnostico", /toparia|topa |diagnostico|reuniao/],
      ["faturamento", /faturamento|fatura\b|receita/], ["funcionarios", /funcionari|colaborador|quantas pessoas|tamanho da equipe/],
      ["desafio", /desafio|\bdor\b|dores|dificuldade|maior problema/], ["motivo", /por que voce|vaga|motivo|por que/],
    ];
    const achou = regras.find(([campo, re]) => re.test(t) && !usado.has(campo));
    if (achou) { usado.add(achou[0]); return achou[0]; }
    return "extra";
  });
}

// ----- Limpeza dos valores -----
export function normalizarWhatsapp(v: string) {
  const d = v.replace(/\D/g, "").replace(/^0+/, "");
  if (!d) return null;
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return d;
}
export function normalizarInstagram(v: string) {
  const u = v.trim().toLowerCase().replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/[/?].*$/, "").replace(/^@/, "").trim();
  return u || null;
}
function simNao(v: string) {
  const t = normalizar(v);
  if (!t) return null;
  if (/^(sim|s|yes|topo|claro|com certeza|quero|aceito)\b/.test(t)) return true;
  if (/^(nao|n|no|nunca|prefiro nao)\b/.test(t)) return false;
  return null;
}
export function lerData(v: string) {
  const s = v.trim();
  if (!s) return null;
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (br) { const d = new Date(`${br[3]}-${br[2]}-${br[1]}T${br[4] ?? "00"}:${br[5] ?? "00"}:${br[6] ?? "00"}-03:00`); return Number.isNaN(d.getTime()) ? null : d.toISOString(); }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s.replace(" ", "T")}${s.length <= 10 ? "T00:00:00" : ""}-03:00`);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

// ----- Temas dos desafios (palavras-chave; a equipe confere uma amostra) -----
export const TEMAS: Record<string, RegExp> = {
  "Vendas": /\bvend|conversao|fechar|fechamento|ticket|aumentar o faturamento|faturar mais/,
  "Equipe": /equipe|funcionari|vendedora|\btime\b|colaborador|contrat|treinar|treinamento|lideranca|delegar|motivar/,
  "Estoque e compras": /estoque|giro|compra|mercadoria|encalhad|reposicao|\bmix\b|fornecedor/,
  "Financeiro": /financeiro|fluxo de caixa|lucro|margem|precific|divida|custo|capital de giro|inadimpl|despesa/,
  "Gestão e rotina": /gestao|organiza|rotina|processo|planejamento|controle|\bmeta|\btempo\b|indicador/,
  "Marketing e Instagram": /instagram|marketing|divulga|conteudo|trafego|anuncio|rede social|seguidor|atrair|cliente nov|visibilidade|vitrine/,
  "Clientes e recompra": /fideliz|recompra|pos.?venda|relacionamento|atendimento|retorno do cliente|base de clientes|clientes antigas/,
};
export function temasDe(texto: string | null) {
  const t = normalizar(texto ?? "");
  if (!t.trim()) return [];
  const achados = Object.entries(TEMAS).filter(([, re]) => re.test(t)).map(([nome]) => nome);
  return achados.length ? achados : ["Outros"];
}

/** Para ordenar faixas ("Até R$ 20 mil", "20 a 50 mil", "Acima de 100 mil") da menor para a maior. */
export function ordemFaixa(texto: string) {
  const t = normalizar(texto).replace(/(\d)\.(\d{3})/g, "$1$2").replace(/,/g, ".");
  if (/\bso eu\b|sozinh|apenas eu|somente eu|nenhum/.test(t)) return 0;
  const m = t.match(/(\d+(?:\.\d+)?)/);
  if (!m) return 1e12;
  let v = parseFloat(m[1]);
  if (/\bmil\b|\bk\b/.test(t) && v < 1000) v *= 1000;
  if (/\bate\b|\bmenos\b|\babaixo\b/.test(t)) v -= 0.5;
  if (/\bacima\b|\bmais de\b|\bmaior\b/.test(t)) v += 0.5;
  return v;
}

// ----- Importar -----
async function chaveDa(isca: string, valores: string[]) {
  const dados = new TextEncoder().encode(`${isca}\u0001${valores.join("\u0001")}`);
  const hash = await crypto.subtle.digest("SHA-256", dados);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function montarRespostas(isca: string, cabecalho: string[], linhas: string[][], mapa: Campo[]) {
  const col = (c: Campo) => mapa.indexOf(c);
  const pega = (l: string[], c: Campo) => (col(c) >= 0 ? (l[col(c)] ?? "").trim() : "");
  const saida = [];
  for (const l of linhas) {
    const bruto: Record<string, string> = {}, extras: Record<string, string> = {};
    cabecalho.forEach((titulo, i) => { const v = (l[i] ?? "").trim(); if (v) { bruto[titulo] = v; if (mapa[i] === "extra") extras[titulo] = v; } });
    const desafio = pega(l, "desafio");
    saida.push({
      isca, chave: await chaveDa(isca, l.map((x) => x.trim())),
      respondido_em: lerData(pega(l, "data")), nome: pega(l, "nome") || null, whatsapp: normalizarWhatsapp(pega(l, "whatsapp")),
      instagram: normalizarInstagram(pega(l, "instagram")), funcionarios: pega(l, "funcionarios") || null, faturamento: pega(l, "faturamento") || null,
      topa_diagnostico: simNao(pega(l, "topa_diagnostico")), desafio: desafio || null, motivo: pega(l, "motivo") || null, temas: temasDe(desafio), extras, bruto,
    });
  }
  return saida;
}

/** Grava as respostas; as que já existem (mesma isca e mesmo conteúdo) são ignoradas. */
type Parecida = { whatsapp: string | null; faturamento: string | null; funcionarios: string | null; desafio: string | null; motivo: string | null };
/** A mesma pessoa com as mesmas respostas escritas. Sem resposta em texto não dá para afirmar que é repetida (null). */
const assinatura = (r: Parecida) => (r.desafio || r.motivo ? normalizar([r.whatsapp, r.faturamento, r.funcionarios, r.desafio, r.motivo].map((x) => x ?? "").join("|")) : null);

/**
 * Grava as respostas. Pula as que já existem, mesmo quando o arquivo foi importado antes com outro nome de isca
 * (o Respondi põe um código aleatório no nome do arquivo): mesma pessoa e mesmas respostas em qualquer isca.
 */
export async function importarRespostas(respostas: Awaited<ReturnType<typeof montarRespostas>>) {
  const sb = supabaseBrowser();
  const zaps = [...new Set(respostas.map((r) => r.whatsapp).filter((z): z is string => !!z))];
  const existentes = new Set<string>();
  for (let i = 0; i < zaps.length; i += 100) {
    const { data } = await sb.from("iscas_respostas").select("whatsapp, faturamento, funcionarios, desafio, motivo").in("whatsapp", zaps.slice(i, i + 100));
    for (const r of (data ?? []) as Parecida[]) { const a = assinatura(r); if (a) existentes.add(a); }
  }
  const vistas = new Set<string>();
  const paraGravar = respostas.filter((r) => {
    const a = r.whatsapp ? assinatura(r) : null;
    if (!a) return true;
    if (existentes.has(a) || vistas.has(a)) return false;
    vistas.add(a);
    return true;
  });
  let novas = 0;
  for (let i = 0; i < paraGravar.length; i += 200) {
    const { data, error } = await sb.from("iscas_respostas").upsert(paraGravar.slice(i, i + 200), { onConflict: "isca,chave", ignoreDuplicates: true }).select("id");
    if (error) throw new Error(error.message);
    novas += data?.length ?? 0;
  }
  return { novas, jaExistiam: respostas.length - novas };
}

/** Nome da isca a partir do nome do arquivo, sem a data e o código aleatório que o Respondi coloca. */
export function nomeDaIsca(arquivo: string) {
  return arquivo.replace(/\.[^.]+$/, "").replace(/^\d{8}[-_ ]+/, "").replace(/[-_ ]+[a-z0-9]{16,}$/i, "").replace(/[-_]+/g, " ").trim();
}

export async function buscarRespostas() {
  const { data } = await supabaseBrowser().from("iscas_respostas")
    .select("id, isca, respondido_em, importado_em, nome, whatsapp, instagram, funcionarios, faturamento, topa_diagnostico, desafio, motivo, temas, extras")
    .order("respondido_em", { ascending: false, nullsFirst: false }).limit(5000);
  return (data ?? []) as Resposta[];
}

/** Texto CSV (UTF-8 com BOM, para o Excel abrir os acentos certos) das respostas escolhidas. */
export function paraCsv(linhas: Resposta[]) {
  const cab = ["Isca", "Data", "Nome", "WhatsApp", "Instagram", "Funcionários", "Faturamento", "Topa diagnóstico", "Temas", "Desafio", "Motivo"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const corpo = linhas.map((r) => [r.isca, (r.respondido_em ?? r.importado_em).slice(0, 10), r.nome, r.whatsapp, r.instagram, r.funcionarios, r.faturamento,
    r.topa_diagnostico === null ? "" : r.topa_diagnostico ? "Sim" : "Não", r.temas.join("; "), r.desafio, r.motivo].map(esc).join(","));
  return `﻿${[cab.map(esc).join(","), ...corpo].join("\r\n")}`;
}
