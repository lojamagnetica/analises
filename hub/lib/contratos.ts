"use client";

// Contratos: um modelo por plano (texto com campos {{ASSIM}} e blocos opcionais [[BONUS]]…[[/BONUS]]) preenchido
// com os dados da passagem do Comercial. Os modelos e os contratos ficam só no banco (o repositório é público).
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Passagem } from "@/lib/jornada";
import { somarMeses } from "@/lib/comercial";

export type Modelo = { plano_id: string; titulo: string; texto: string; aprovado: boolean; updated_at: string; updated_by: string | null };

const sb = () => supabaseBrowser();

export async function buscarModelos() {
  const [{ data: modelos }, { data: planos }] = await Promise.all([
    sb().from("contrato_modelos").select("*"),
    sb().from("planos").select("id, nome, tipo, meses, valor, vendendo").order("ordem"),
  ]);
  return { modelos: (modelos ?? []) as Modelo[], planos: (planos ?? []) as { id: string; nome: string; tipo: string; meses: number | null; valor: number | null; vendendo: boolean }[] };
}

export async function salvarModelo(m: Pick<Modelo, "plano_id" | "titulo" | "texto" | "aprovado">, porNome: string) {
  const { error } = await sb().from("contrato_modelos").upsert({ ...m, updated_at: new Date().toISOString(), updated_by: porNome }, { onConflict: "plano_id" });
  if (error) throw new Error(error.message);
}

const UNI = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZ = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CEN = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
function ate999(n: number): string {
  if (n === 100) return "cem";
  const c = Math.floor(n / 100), r = n % 100;
  const partes = [];
  if (c) partes.push(CEN[c]);
  if (r) partes.push(r < 20 ? UNI[r] : DEZ[Math.floor(r / 10)] + (r % 10 ? ` e ${UNI[r % 10]}` : ""));
  return partes.join(" e ");
}
/** Número inteiro por extenso (até milhões), como num contrato. */
export function extenso(n: number): string {
  if (n === 0) return "zero";
  const mi = Math.floor(n / 1_000_000), mil = Math.floor((n % 1_000_000) / 1000), r = n % 1000;
  const partes: string[] = [];
  if (mi) partes.push(mi === 1 ? "um milhão" : `${ate999(mi)} milhões`);
  if (mil) partes.push(mil === 1 ? "mil" : `${ate999(mil)} mil`);
  if (r) partes.push(ate999(r));
  return partes.length > 1 && (r < 100 || r % 100 === 0) && r ? partes.slice(0, -1).join(" ") + " e " + partes[partes.length - 1] : partes.join(" ");
}
export function reaisPorExtenso(v: number) {
  const inteiro = Math.floor(v), cent = Math.round((v - inteiro) * 100);
  return `${extenso(inteiro)} ${inteiro === 1 ? "real" : "reais"}${cent ? ` e ${extenso(cent)} centavos` : ""}`;
}
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const dataPorExtenso = (iso: string) => { const [a, m, d] = iso.split("-"); return `${d} de ${MESES[Number(m) - 1]} de ${a}`; };
const moedaBr = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/\s/g, " ");

export type DadosContrato = { passagem: Passagem; loja: string; meses: number; planoNome: string; hoje: string };

/** Os campos do contrato e o que falta preencher na passagem para gerar. */
export function camposDoContrato(d: DadosContrato) {
  const p = d.passagem;
  const inicio = p.pagamento_em ?? d.hoje;
  const campos: Record<string, string> = {
    CONTRATANTE_NOME: p.contratante_nome ?? "",
    CONTRATANTE_DOC: p.contratante_doc ?? "",
    CONTRATANTE_ENDERECO: p.contratante_endereco ?? "",
    REPRESENTANTE: p.representante ?? "",
    REPRESENTANTE_CARGO: p.representante_cargo ?? "",
    REPRESENTANTE_CPF: p.representante_cpf ?? "",
    LOJAS: p.lojas_mentoradas || d.loja,
    PLANO: d.planoNome,
    MESES: String(d.meses),
    MESES_EXTENSO: extenso(d.meses),
    INICIO: dataPorExtenso(inicio),
    FIM: dataPorExtenso(somarMeses(inicio, d.meses)),
    VALOR: p.valor != null ? moedaBr(p.valor) : "",
    VALOR_EXTENSO: p.valor != null ? reaisPorExtenso(p.valor) : "",
    PAGAMENTO_DATA: p.pagamento_em ? dataPorExtenso(p.pagamento_em) : "",
    FORMA_PAGAMENTO: p.forma_pagamento ?? "",
    DATA_CONTRATO: dataPorExtenso(d.hoje),
  };
  const ROTULOS: Record<string, string> = {
    CONTRATANTE_NOME: "Razão social ou nome da contratante", CONTRATANTE_DOC: "CNPJ ou CPF da contratante", CONTRATANTE_ENDERECO: "Endereço completo",
    REPRESENTANTE: "Representante legal", REPRESENTANTE_CARGO: "Cargo do representante", REPRESENTANTE_CPF: "CPF do representante",
    VALOR: "Valor", PAGAMENTO_DATA: "Data do pagamento", FORMA_PAGAMENTO: "Forma de pagamento",
  };
  const faltam = Object.keys(ROTULOS).filter((k) => !campos[k]).map((k) => ROTULOS[k]);
  return { campos, faltam };
}

/** Preenche o modelo: troca {{CAMPO}} e mantém ou tira os blocos opcionais. Campo sem valor fica marcado para conferir. */
export function preencher(texto: string, campos: Record<string, string>, blocos: { BONUS: boolean; GARANTIA: boolean }) {
  let t = texto;
  for (const [b, manter] of Object.entries(blocos)) {
    const re = new RegExp(`\\[\\[${b}\\]\\]([\\s\\S]*?)\\[\\[/${b}\\]\\]\\n?`, "g");
    t = t.replace(re, manter ? "$1" : "");
  }
  return t.replace(/\{\{([A-Z_]+)\}\}/g, (_, k: string) => campos[k] || `[PREENCHER: ${k}]`);
}

/** Arquivo .doc (Word abre direto; dá para subir no Autentique). */
export function baixarDoc(titulo: string, texto: string) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const corpo = texto.split(/\n{2,}/).map((p) => {
    const l = p.trim();
    if (/^(CL[ÁA]USULA|QUALIFICA|CONTRATO DE)/.test(l)) return `<p style="font-weight:bold;margin-top:14pt">${esc(l).replace(/\n/g, "<br>")}</p>`;
    return `<p style="text-align:justify">${esc(l).replace(/\n/g, "<br>")}</p>`;
  }).join("");
  const html = `<html><head><meta charset="utf-8"><title>${esc(titulo)}</title></head><body style="font-family:Arial;font-size:11pt;line-height:1.4">${corpo}</body></html>`;
  const blob = new Blob(["﻿", html], { type: "application/msword" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${titulo.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "_")}.doc`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export async function registrarContrato(portalId: string, planoId: string | null, texto: string, porNome: string) {
  const { error } = await sb().from("contratos_gerados").insert({ portal_id: portalId, plano_id: planoId, texto, gerado_por: porNome });
  if (error) throw new Error(error.message);
}
