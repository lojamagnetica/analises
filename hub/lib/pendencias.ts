"use client";

// Pendências por cliente: o que falta para o portal ficar completo. As automáticas saem dos dados do Hub e somem
// sozinhas quando o dado entra; a equipe marca o andamento (pedido à loja, recebido, dispensado) e escreve as que faltarem.
import { supabaseBrowser } from "@/lib/supabase/client";
import { ETAPAS, chaveSituacao } from "@/lib/conteudo";

export type Quem = "Loja" | "Equipe";
export type StatusPend = "pendente" | "solicitado" | "recebido" | "dispensado";
export const STATUS_PEND: { v: StatusPend; rotulo: string }[] = [
  { v: "pendente", rotulo: "Falta pedir" }, { v: "solicitado", rotulo: "Pedido à loja" },
  { v: "recebido", rotulo: "Recebido" }, { v: "dispensado", rotulo: "Não se aplica" },
];
export const classePend = (s: StatusPend) => (s === "recebido" ? "feito" : s === "solicitado" ? "andamento" : s === "dispensado" ? "espera" : "alerta");

export type Pendencia = {
  chave: string; texto: string; detalhe?: string; quem: Quem; manual: boolean;
  /** Onde a loja resolve isso no Hub (caminho da página). */
  onde?: string;
  status: StatusPend; obs: string; por_nome: string | null; updated_at: string | null; id?: string;
};
export type PortalPend = { id: string; loja: string; responsavel: string | null; tipo: string; pendencias: Pendencia[] };

type Linha = { id: string; portal_id: string; chave: string; texto: string | null; quem: Quem; manual: boolean; status: StatusPend; obs: string | null; por_nome: string | null; updated_at: string };

const sb = () => supabaseBrowser();
const conta = (lista: { portal_id: string | null }[] | null) => {
  const m = new Map<string, number>();
  (lista ?? []).forEach((x) => { if (x.portal_id) m.set(x.portal_id, (m.get(x.portal_id) ?? 0) + 1); });
  return m;
};
const vazio = (v: unknown) => v == null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && v.length === 0);

/** As pendências de todos os portais ativos (ou de um só). */
export async function buscarPendencias(portalId?: string): Promise<PortalPend[]> {
  type Reg = { portal_id: string | null; [k: string]: unknown };
  const de = async (tabela: string, colunas: string, limite = 1000, papel?: string) => {
    let q = sb().from(tabela).select(colunas).limit(limite);
    if (portalId) q = q.eq("portal_id", portalId);
    if (papel) q = q.eq("papel", papel);
    const { data } = await q;
    return { data: (data ?? []) as unknown as Reg[] };
  };
  let qp = sb().from("portais").select("id, loja, responsavel, tipo").eq("ativo", true).order("loja");
  if (portalId) qp = qp.eq("id", portalId);
  const [{ data: portais }, { data: pers }, { data: equipe }, { data: caixa }, { data: clientes }, { data: reunioes }, { data: insta }, { data: diag }, { data: acessos }, { data: salvas }] = await Promise.all([
    qp,
    de("personalizacao", "portal_id, etapa, respostas, concluida", 5000),
    de("loja_equipe", "portal_id, perfil", 5000),
    de("loja_caixa", "portal_id", 5000),
    de("loja_clientes", "portal_id", 20000),
    de("reunioes", "portal_id"),
    de("loja_analise_perfil", "portal_id"),
    de("loja_diagnostico", "portal_id"),
    de("perfis", "portal_id", 1000, "mentorado"),
    de("portal_pendencias", "*", 5000),
  ]);
  const lista = (portais ?? []) as { id: string; loja: string; responsavel: string | null; tipo: string }[];
  const relatorios = new Map(await Promise.all(lista.map(async (p) => {
    const [{ data }, { count }] = await Promise.all([
      sb().storage.from("relatorios").list(p.id, { limit: 1 }),
      sb().from("loja_relatorios_drive").select("id", { count: "exact", head: true }).eq("portal_id", p.id),
    ]);
    return [p.id, (data ?? []).filter((f) => f.id).length + (count ?? 0)] as const;
  })));
  const nCaixa = conta(caixa), nClientes = conta(clientes), nReun = conta(reunioes), nInsta = conta(insta), nDiag = conta(diag), nAcesso = conta(acessos);

  return lista.map((p) => {
    const auto: Omit<Pendencia, "status" | "obs" | "por_nome" | "updated_at">[] = [];
    const add = (chave: string, texto: string, quem: Quem, detalhe?: string, onde?: string) => auto.push({ chave, texto, quem, detalhe, onde, manual: false });

    // Dados da loja: cada etapa com campos em branco (quem marcou "ainda não tenho" já respondeu).
    for (const e of ETAPAS) {
      const r = ((pers ?? []).find((x) => x.portal_id === p.id && x.etapa === e.numero)?.respostas ?? {}) as Record<string, unknown>;
      const faltam = e.campos.filter((c) => vazio(r[c.id]) && r[chaveSituacao(c.id)] !== "nao_tenho");
      if (faltam.length) add(`dados_${e.numero}`, `Dados da loja · ${e.titulo}`, "Loja", faltam.map((c) => c.rotulo).join(" · "), `/personalizacao/etapa/?n=${e.numero}`);
    }
    const time = (equipe ?? []).filter((x) => x.portal_id === p.id);
    if (!time.length) add("equipe", "Nomes e funções de quem trabalha na loja", "Loja", undefined, "/pessoas/");
    else if (time.some((x) => !x.perfil)) add("perfis", `Teste de perfil da equipe (${time.filter((x) => !x.perfil).length} de ${time.length} sem responder)`, "Loja", "Mandar o link do teste em Minha equipe e perfis", "/pessoas/");
    if (!relatorios.get(p.id)) {
      add("rel_estoque", "Relatório de estoque atual do sistema (lista de produtos com custo, preço, marca e fornecedor)", "Loja", undefined, "/personalizacao/etapa/?n=8");
      add("rel_vendas", "Relatório de vendas por produto dos últimos 12 meses (com quantidade e valor)", "Loja", undefined, "/personalizacao/etapa/?n=8");
    }
    if (!nClientes.get(p.id)) add("clientes", "Lista de clientes (nome, WhatsApp e data da última compra)", "Loja", undefined, "/clientes/");
    if (!nCaixa.get(p.id)) add("caixa", "Começar o fechamento de caixa diário no Hub", "Loja", undefined, "/gestao/caixa/");
    if (!nAcesso.get(p.id)) add("acesso", "Criar o acesso da loja e mandar o link de entrada", "Equipe");
    if (!nReun.get(p.id)) add("reunioes", "Registrar as reuniões e gravações no portal", "Equipe");
    if (!nInsta.get(p.id)) add("instagram", "Análise do perfil do Instagram", "Equipe");
    if (!nDiag.get(p.id)) add("diagnostico", "Diagnóstico da loja", "Equipe");

    const minhas = ((salvas ?? []) as unknown as Linha[]).filter((x) => x.portal_id === p.id);
    const comStatus = (a: (typeof auto)[number]): Pendencia => {
      const s = minhas.find((x) => x.chave === a.chave);
      return { ...a, status: s?.status ?? "pendente", obs: s?.obs ?? "", por_nome: s?.por_nome ?? null, updated_at: s?.updated_at ?? null, id: s?.id };
    };
    const manuais: Pendencia[] = minhas.filter((x) => x.manual).map((x) => ({
      chave: x.chave, texto: x.texto ?? "", quem: x.quem, manual: true, onde: ondeResolver(x.texto ?? ""), status: x.status, obs: x.obs ?? "", por_nome: x.por_nome, updated_at: x.updated_at, id: x.id,
    }));
    return { ...p, pendencias: [...auto.map(comStatus), ...manuais] };
  });
}

export async function marcarPendencia(portalId: string, p: Pick<Pendencia, "chave" | "texto" | "quem" | "manual">, mudanca: { status?: StatusPend; obs?: string }, porNome: string) {
  const { error } = await sb().from("portal_pendencias").upsert({
    portal_id: portalId, chave: p.chave, texto: p.texto, quem: p.quem, manual: p.manual, ...mudanca, por_nome: porNome, updated_at: new Date().toISOString(),
  }, { onConflict: "portal_id,chave" });
  if (error) throw new Error(error.message);
}

export async function novaPendencia(portalId: string, texto: string, quem: Quem, porNome: string) {
  const t = texto.trim();
  if (!t) throw new Error("Escreva a pendência.");
  await marcarPendencia(portalId, { chave: `manual_${Date.now()}`, texto: t, quem, manual: true }, { status: "pendente" }, porNome);
}

export const aberta = (p: Pendencia) => p.status === "pendente" || p.status === "solicitado";

/** Para pendência escrita à mão: relatório, estoque e vendas sobem em Estoque e relatórios; o resto a loja manda pelo Fale com a Camilla. */
function ondeResolver(texto: string) {
  const t = texto.toLowerCase();
  if (/relat[óo]rio|estoque|vendas|planilha|faturamento|custo|compras/.test(t)) return "/personalizacao/etapa/?n=8";
  if (/equipe|vendedor|time\b|funcion/.test(t)) return "/pessoas/";
  if (/cliente/.test(t)) return "/clientes/";
  return "/assistente/";
}

/** Nome da página do Hub onde a loja resolve a pendência. */
export function nomeDoLugar(onde: string) {
  if (onde.startsWith("/personalizacao/etapa/?n=8")) return "Estoque e relatórios";
  if (onde.startsWith("/personalizacao")) return "Dados da loja";
  if (onde.startsWith("/pessoas")) return "Minha equipe e perfis";
  if (onde.startsWith("/clientes")) return "Minhas clientes";
  if (onde.startsWith("/gestao/caixa")) return "Fechamento de caixa";
  return "Fale com a Camilla";
}

/** Mensagem pronta para a loja: o que falta, agrupado pela página do Hub onde ela resolve, com o link de cada página. */
export function mensagemParaLoja(p: PortalPend, site: string) {
  const itens = p.pendencias.filter((x) => x.quem === "Loja" && aberta(x));
  const nome = (p.responsavel ?? "").trim().split(/\s+/)[0];
  const semAcesso = p.pendencias.some((x) => x.chave === "acesso" && aberta(x));
  const grupos = new Map<string, { link: string; linhas: string[] }>();
  for (const x of itens) {
    const onde = x.onde ?? "/assistente/";
    const lugar = nomeDoLugar(onde);
    const link = lugar === "Dados da loja" ? "/personalizacao/" : onde;
    const g = grupos.get(lugar) ?? { link, linhas: [] };
    const texto = x.chave.startsWith("dados_") ? `${x.texto.replace("Dados da loja · ", "")}: ${x.detalhe ?? ""}` : x.texto;
    g.linhas.push(`• ${texto}`);
    grupos.set(lugar, g);
  }
  return [
    `Oi${nome ? `, ${nome}` : ""}! Tudo bem?`,
    "",
    `Estamos finalizando o Hub da ${p.loja}. Para deixar tudo pronto, falta só isto:`,
    ...[...grupos.entries()].flatMap(([lugar, g]) => ["", `*${lugar}*`, ...(semAcesso ? [] : [`${site}${g.link}`]), ...g.linhas]),
    "",
    semAcesso
      ? "Seu acesso ao Hub chega em seguida, num link só seu. Até lá, pode mandar tudo por aqui."
      : "É só abrir o link de cada parte já com o seu acesso ao Hub. Os relatórios do sistema podem subir do jeito que vierem. Qualquer dúvida, é só chamar.",
  ].join("\n");
}
