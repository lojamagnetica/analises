"use client";

// Painel do dia da CS: os alertas por assunto, só das lojas que já estão no acompanhamento. Cada alerta junta as lojas
// com o mesmo problema (ou o mesmo parabéns) para a CS falar com todas de uma vez, com a mesma mensagem.
import { diasDesde, hoje } from "@/lib/formato";
import { somarDias } from "@/lib/acoes-mes";
import { semanaDe, semanaPassada } from "@/lib/leitura";
import { dataCurta } from "@/lib/formato";
import { supabaseBrowser } from "@/lib/supabase/client";

export type Cor = "laranja" | "vermelho" | "verde";
export type LojaAlerta = { id: string; loja: string; whatsapp: string | null; msg: string };
export type GrupoAlerta = {
  chave: string; cor: Cor; titulo: string; detalhe: string;
  /** Lojas que já estão em dia neste assunto (para o "18 lançaram"). */
  ok: number; total: number; lojas: LojaAlerta[];
  /** Para os parabéns: o texto pronto para postar no grupo. */
  grupo?: string;
  /** O registro que fecha o alerta quando a CS marca "falei com todas". */
  registro: { tipo: string; ref: string };
};
export type PainelDia = { grupos: GrupoAlerta[]; ontem: string; acompanhadas: number };

const primeiro = (n: string | null) => (n ?? "").trim().split(/\s+/)[0] || "tudo bem";
const abertura = (r: string | null) => `Oi, ${primeiro(r)}! Aqui é a Claudia, da Loja Magnética.`;
const dow = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay();
/** Dias de loja aberta (segunda a sábado) de uma semana que começa na segunda. */
const diasDaSemana = (seg: string) => Array.from({ length: 6 }, (_, i) => somarDias(seg, i));
/** O último dia de loja aberta antes de hoje (pula o domingo). */
export function diaDeOntem(d = hoje()) { let x = somarDias(d, -1); while (dow(x) === 0) x = somarDias(x, -1); return x; }
const lista = (nomes: string[]) => (nomes.length <= 1 ? nomes.join("") : `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`);

export async function painelDia(): Promise<PainelDia> {
  const sb = supabaseBrowser();
  const ontem = diaDeOntem();
  const passada = semanaPassada();
  const { data: portais } = await sb.from("portais").select("id, loja, whatsapp, responsavel, menu_oculto, sem_equipe").eq("ativo", true).eq("cs_acompanha", true).order("loja");
  const ids = (portais ?? []).map((p) => p.id as string);
  if (!ids.length) return { grupos: [], ontem, acompanhadas: 0 };
  const [{ data: perfis }, { data: caixa }, { data: rotina }, { data: analises }, { data: contatos }] = await Promise.all([
    sb.from("perfis").select("portal_id, ultimo_acesso").in("portal_id", ids),
    sb.from("loja_caixa").select("portal_id, dia").in("portal_id", ids).gte("dia", passada),
    sb.from("loja_rotina").select("portal_id, feitos").in("portal_id", ids),
    sb.from("loja_reunioes").select("portal_id, data, dados").in("portal_id", ids).eq("tipo", "analise_semana").gte("data", passada),
    sb.from("cs_contatos").select("portal_id, tipo, ref").in("portal_id", ids).gte("feito_em", new Date(Date.now() - 14 * 86_400_000).toISOString()),
  ]);
  const falouSobre = (id: string, tipo: string, ref: string) => (contatos ?? []).some((c) => c.portal_id === id && c.tipo === tipo && c.ref === ref);

  type Info = { id: string; loja: string; whatsapp: string | null; responsavel: string | null; gestao: boolean; equipe: boolean;
    caixaOntem: boolean; semAcesso: number | null; direcaoOntem: boolean; caixaPassada: boolean; direcaoPassada: boolean; analisePassada: boolean };
  const infos: Info[] = (portais ?? []).map((p) => {
    const id = p.id as string;
    const dias = new Set((caixa ?? []).filter((c) => c.portal_id === id).map((c) => c.dia as string));
    const ultimo = (perfis ?? []).filter((x) => x.portal_id === id).map((x) => x.ultimo_acesso as string | null).filter(Boolean).sort().reverse()[0] ?? null;
    const feitos = ((rotina ?? []).find((r) => r.portal_id === id)?.feitos ?? {}) as Record<string, string[]>;
    const direcao = (d: string) => (feitos[d] ?? []).includes("direcao");
    const semana = diasDaSemana(passada);
    const gestao = !((p.menu_oculto ?? []) as string[]).includes("gestao");
    const analise = (analises ?? []).some((a) => a.portal_id === id && ((a.dados as { semana?: string } | null)?.semana === passada || ((a.data as string) >= passada && (a.data as string) < semanaDe())));
    return { id, loja: p.loja as string, whatsapp: (p.whatsapp as string | null) ?? null, responsavel: (p.responsavel as string | null) ?? null, gestao, equipe: !p.sem_equipe,
      caixaOntem: dias.has(ontem), semAcesso: ultimo ? Math.floor(diasDesde(ultimo)) : null, direcaoOntem: direcao(ontem),
      caixaPassada: semana.every((d) => dias.has(d)), direcaoPassada: semana.every((d) => direcao(d)), analisePassada: analise };
  });

  const grupos: GrupoAlerta[] = [];
  const nova = (g: Omit<GrupoAlerta, "ok" | "total" | "lojas"> & { candidatas: Info[]; faltam: (i: Info) => boolean; msg: (i: Info) => string }) => {
    const baseOk = g.candidatas.filter((i) => !g.faltam(i)).length;
    const lojas = g.candidatas.filter((i) => g.faltam(i) && !falouSobre(i.id, g.registro.tipo, g.registro.ref)).map((i) => ({ id: i.id, loja: i.loja, whatsapp: i.whatsapp, msg: g.msg(i) }));
    return { chave: g.chave, cor: g.cor, titulo: g.titulo, detalhe: g.detalhe, ok: baseOk, total: g.candidatas.length, lojas, grupo: g.grupo, registro: g.registro } as GrupoAlerta;
  };

  // Caixa de ontem (laranja): quem ainda não lançou.
  const comCaixa = infos.filter((i) => i.gestao);
  grupos.push(nova({ chave: "caixa", cor: "laranja", titulo: "Caixa de ontem sem lançar", detalhe: `Dia ${dataCurta(ontem)}. A mesma conversa com todas: lançar agora e pedir ajuda se travar.`, registro: { tipo: "caixa", ref: ontem },
    candidatas: comCaixa, faltam: (i) => !i.caixaOntem,
    msg: (i) => `${abertura(i.responsavel)} Vi que o caixa de ontem (${dataCurta(ontem)}) da ${i.loja} ainda não foi lançado no Hub. Lança agora, leva 2 minutos? Se travou em algo, me conta que eu te ajudo.` }));

  // Quem não entra no Hub há mais de 2 dias (vermelho).
  grupos.push(nova({ chave: "acesso", cor: "vermelho", titulo: "Sem entrar no Hub há mais de 2 dias", detalhe: "Entender o motivo e lembrar que o Início já mostra o que fazer hoje.", registro: { tipo: "acesso", ref: hoje() },
    candidatas: infos, faltam: (i) => i.semAcesso === null || i.semAcesso > 2,
    msg: (i) => `${abertura(i.responsavel)} Faz ${i.semAcesso ?? "alguns"} dias que não vejo você no Hub da ${i.loja}. Abre o Início: lá já está o que fazer hoje. Está tudo bem por aí? Posso te ajudar em algo?` }));

  // Mensagem de direção do dia sem marcar (laranja): a conversa mostra que a loja precisa dar o check.
  grupos.push(nova({ chave: "direcao", cor: "laranja", titulo: "Mensagem de direção de ontem sem marcar", detalhe: "Se mandou no grupo, é só marcar o check no Meu dia. Se não mandou, mandar hoje: a mensagem já está pronta lá.", registro: { tipo: "direcao", ref: ontem },
    candidatas: infos.filter((i) => i.equipe), faltam: (i) => !i.direcaoOntem,
    msg: (i) => `${abertura(i.responsavel)} Vi que a mensagem de direção do dia de ontem da ${i.loja} não foi marcada no Hub. Se você mandou no grupo da equipe, marca o check no Meu dia para eu acompanhar. Se não mandou, manda hoje: ela já está pronta lá. Combinado?` }));

  // Parabéns da semana passada (verde): para puxar e motivar o time das outras lojas.
  const parabens = (chave: string, feito: string, frase: string, cand: Info[], fez: (i: Info) => boolean) => {
    const fizeram = cand.filter(fez);
    const g = nova({ chave, cor: "verde", titulo: `Parabéns: ${frase}`, detalhe: "Semana passada. Parabenize no grupo e individualmente: o time vê que quem faz é reconhecido.", registro: { tipo: `parabens_${chave}`, ref: passada },
      candidatas: cand, faltam: fez, msg: (i) => `${abertura(i.responsavel)} Parabéns, ${i.loja}! Na semana passada vocês ${feito}. É isso que faz a loja crescer. Continuem assim!`,
      grupo: fizeram.length ? `Parabéns às lojas que ${feito} na semana passada: ${lista(fizeram.map((i) => i.loja))}! É assim que a gente cresce. Quem está junto?` : undefined });
    // Nos parabéns a lista é de quem FEZ (a regra de "falta" acima só serve ao alerta).
    const lojas = fizeram.filter((i) => !falouSobre(i.id, `parabens_${chave}`, passada)).map((i) => ({ id: i.id, loja: i.loja, whatsapp: i.whatsapp, msg: `${abertura(i.responsavel)} Parabéns, ${i.loja}! Na semana passada vocês ${feito}. É isso que faz a loja crescer. Continuem assim!` }));
    grupos.push({ ...g, ok: fizeram.length, total: cand.length, lojas });
  };
  parabens("caixa_completo", "lançaram o caixa todos os dias", "caixa lançado todos os dias", comCaixa, (i) => i.caixaPassada);
  parabens("direcao_completa", "mandaram a mensagem de direção do dia todos os dias", "missão do dia todos os dias", infos.filter((i) => i.equipe), (i) => i.direcaoPassada);
  parabens("analise_semana", "fizeram a análise da semana", "análise da semana feita", infos, (i) => i.analisePassada);

  return { grupos, ontem, acompanhadas: infos.length };
}

/** "Falei com todas": registra a conversa em cada loja do alerta (fecha o alerta). */
export async function registrarEmLote(g: GrupoAlerta, por: string) {
  const agora = new Date().toISOString();
  const { error } = await supabaseBrowser().from("cs_contatos").insert(g.lojas.map((l) => ({ portal_id: l.id, tipo: g.registro.tipo, ref: g.registro.ref, feito_em: agora, feito_por: por || null, resumo: g.titulo })));
  if (error) throw new Error(error.message);
}
