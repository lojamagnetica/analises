"use client";

// Desafio do dia: a gestão lança um desafio que vale pontos para todo mundo. A equipe vê ao abrir o link e marca cada vez que cumpre.
import { hoje } from "@/lib/formato";
import { supabaseBrowser } from "@/lib/supabase/client";

const sb = () => supabaseBrowser();

export type DesafioDoDia = { id: string; titulo: string; descricao: string; unidade: string; pontos: number; limite: number | null; feitos: number };
export const vezDesafios = async (token: string) => ((await sb().rpc("vez_desafios", { p_token: token })).data as DesafioDoDia[] | null) ?? [];
export const vezDesafioMarcar = async (token: string, id: string, delta: 1 | -1) => ((await sb().rpc("vez_desafio_marcar", { p_token: token, p_id: id, p_delta: delta })).data as number | null) ?? -1;

// ───── Modelos prontos: a gestão escolhe um e ajusta os números ─────
export type Campo = { chave: string; rotulo: string; padrao: string };
export type Modelo = { id: string; rotulo: string; quando: string; pontos: number; campos: Campo[]; titulo: (v: Record<string, string>) => string; unidade: (v: Record<string, string>) => string };

export const MODELOS: Modelo[] = [
  { id: "linha_parada", rotulo: "Linha parada no estoque", quando: "Tem uma linha que não gira.", pontos: 10,
    campos: [{ chave: "linha", rotulo: "Qual linha?", padrao: "calças" }, { chave: "n", rotulo: "A cada quantas peças?", padrao: "2" }],
    titulo: (v) => `Girar ${v.linha}`, unidade: (v) => `cada ${v.n} peças de ${v.linha} vendidas` },
  { id: "pa_baixo", rotulo: "P.A. baixo", quando: "As clientes estão levando uma peça só.", pontos: 15,
    campos: [{ chave: "pa", rotulo: "Venda com quantas peças ou mais?", padrao: "3" }],
    titulo: () => "Subir o P.A.", unidade: (v) => `cada venda com ${v.pa} peças ou mais` },
  { id: "fluxo_baixo", rotulo: "Fluxo baixo: chamar clientes", quando: "Pouca gente entrando na loja.", pontos: 20,
    campos: [], titulo: () => "Trazer clientes para a loja", unidade: () => "cada cliente resgatada (comprou porque recebeu a sua mensagem)" },
  { id: "ticket", rotulo: "Ticket médio", quando: "As vendas estão saindo baratas.", pontos: 15,
    campos: [{ chave: "valor", rotulo: "Venda acima de quanto (R$)?", padrao: "600" }],
    titulo: () => "Subir o ticket médio", unidade: (v) => `cada venda acima de R$ ${v.valor}` },
  { id: "posvenda", rotulo: "Pós-venda", quando: "Garantir o carimbo de conexão.", pontos: 5,
    campos: [], titulo: () => "Pós-venda em dia", unidade: () => "cada pós-venda enviada em até 24 horas" },
  { id: "cadastro", rotulo: "Cadastro de clientes", quando: "Base de clientes incompleta.", pontos: 5,
    campos: [], titulo: () => "Cadastro completo", unidade: () => "cada cliente cadastrada com WhatsApp e aniversário" },
  { id: "livre", rotulo: "Outro desafio", quando: "Escreva do seu jeito.", pontos: 10,
    campos: [{ chave: "titulo", rotulo: "Nome do desafio", padrao: "" }, { chave: "unidade", rotulo: "Cada o quê? (ex.: cada vitrine montada)", padrao: "" }],
    titulo: (v) => v.titulo || "Desafio do dia", unidade: (v) => v.unidade || "cada ação feita" },
];

// ───── Gestão (logada) ─────
export type DesafioGestao = { id: string; loja: string | null; dia: string; modelo: string; titulo: string; descricao: string; unidade: string; pontos: number; limite: number | null; feitos: { pessoa_id: string; qtd: number }[] };

export async function buscarDesafios(portalId: string) {
  const de = (() => { const d = new Date(`${hoje()}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - 3); return d.toISOString().slice(0, 10); })();
  const { data } = await sb().from("loja_desafios").select("id, loja, dia, modelo, titulo, descricao, unidade, pontos, limite").eq("portal_id", portalId).gte("dia", de).order("dia", { ascending: false }).order("created_at", { ascending: false });
  const lista = (data ?? []) as Omit<DesafioGestao, "feitos">[];
  const { data: f } = lista.length ? await sb().from("loja_desafio_feitos").select("desafio_id, pessoa_id, qtd").in("desafio_id", lista.map((d) => d.id)).gt("qtd", 0) : { data: [] };
  const porDesafio = new Map<string, { pessoa_id: string; qtd: number }[]>();
  for (const x of (f ?? []) as { desafio_id: string; pessoa_id: string; qtd: number }[]) porDesafio.set(x.desafio_id, [...(porDesafio.get(x.desafio_id) ?? []), { pessoa_id: x.pessoa_id, qtd: x.qtd }]);
  return lista.map((d) => ({ ...d, feitos: porDesafio.get(d.id) ?? [] })) as DesafioGestao[];
}
export type DadosDesafio = { loja: string | null; dia: string; modelo: string; titulo: string; descricao: string; unidade: string; pontos: number; limite: number | null };
export async function desafioSalvar(portalId: string, id: string | null, d: DadosDesafio) {
  const { error } = id ? await sb().from("loja_desafios").update(d).eq("id", id) : await sb().from("loja_desafios").insert({ ...d, portal_id: portalId });
  if (error) throw new Error(error.message);
}
export async function desafioExcluir(id: string) {
  const { error } = await sb().from("loja_desafios").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
