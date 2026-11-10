// Contas da Lista da vez (sem banco, dá para testar): resumo do dia, fluxo por horário e a meta do dia.
// Rode com: node --experimental-strip-types lib/vez-calculo.test.ts

export type Atend = {
  id: string; pessoa_id: string | null; nome: string; inicio_em: string; fim_em: string | null;
  resultado: "vendeu" | "nao_vendeu" | null; motivo: string; cliente: string; fora_da_vez?: boolean;
};

/** Os motivos de "não vendeu" que mais aparecem (do método). */
export const MOTIVOS = ["Preço", "Tamanho / grade", "Modelagem", "Cor ou estampa", "Insegurança na compra", "Forma de pagamento", "Troca", "Só passeando", "Defeito", "Outro"];

const FUSO = "America/Recife";

/** A hora cheia (0 a 23) de um instante, no horário de Recife. */
export function horaDe(iso: string) {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: FUSO, hour: "2-digit", hourCycle: "h23" }).format(new Date(iso)));
}
export const horaMin = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export type ResumoDia = {
  total: number; vendeu: number; naoVendeu: number; abertos: number; conversao: number | null; tempoMedioMin: number | null; foraDaVez: number;
  porPessoa: { nome: string; total: number; vendeu: number; conversao: number | null }[];
  porHora: { hora: number; total: number; vendeu: number }[];
  motivos: { motivo: string; qtd: number }[];
};

const taxa = (v: number, t: number) => (t ? v / t : null);

export function resumoDoDia(atends: Atend[]): ResumoDia {
  const fechados = atends.filter((a) => a.resultado);
  const vendeu = fechados.filter((a) => a.resultado === "vendeu").length;
  const naoVendeu = fechados.length - vendeu;
  const pessoas = new Map<string, { nome: string; total: number; vendeu: number }>();
  for (const a of fechados) {
    const k = a.pessoa_id ?? a.nome;
    const p = pessoas.get(k) ?? { nome: a.nome, total: 0, vendeu: 0 };
    p.total++; if (a.resultado === "vendeu") p.vendeu++;
    pessoas.set(k, p);
  }
  const horas = new Map<number, { hora: number; total: number; vendeu: number }>();
  for (const a of atends) {
    const h = horaDe(a.inicio_em);
    const x = horas.get(h) ?? { hora: h, total: 0, vendeu: 0 };
    x.total++; if (a.resultado === "vendeu") x.vendeu++;
    horas.set(h, x);
  }
  const motivos = new Map<string, number>();
  for (const a of fechados) if (a.resultado === "nao_vendeu") { const m = a.motivo.trim() || "Sem motivo"; motivos.set(m, (motivos.get(m) ?? 0) + 1); }
  const duracoes = fechados.filter((a) => a.fim_em).map((a) => (new Date(a.fim_em!).getTime() - new Date(a.inicio_em).getTime()) / 60000).filter((m) => m >= 0 && m < 240);
  return {
    total: atends.length, vendeu, naoVendeu, abertos: atends.length - fechados.length, conversao: taxa(vendeu, fechados.length),
    tempoMedioMin: duracoes.length ? duracoes.reduce((s, m) => s + m, 0) / duracoes.length : null,
    foraDaVez: atends.filter((a) => a.fora_da_vez).length,
    porPessoa: [...pessoas.values()].map((p) => ({ ...p, conversao: taxa(p.vendeu, p.total) })).sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome)),
    porHora: [...horas.values()].sort((a, b) => a.hora - b.hora),
    motivos: [...motivos.entries()].map(([motivo, qtd]) => ({ motivo, qtd })).sort((a, b) => b.qtd - a.qtd),
  };
}

/** Quem está na lista: quem está atendendo primeiro; depois a fila, pela hora de chegada (quem atende volta para o final). */
export function ordenarFila<T extends { status: string; ordem_em: string }>(fila: T[]) {
  return [...fila].sort((a, b) => (a.status === b.status ? a.ordem_em.localeCompare(b.ordem_em) : a.status === "atendendo" ? -1 : 1));
}
/** Só a fila de espera, na ordem da vez. */
export const filaDeEspera = <T extends { status: string; ordem_em: string }>(fila: T[]) => ordenarFila(fila.filter((f) => f.status === "fila"));

// ───── Meta do dia ─────

const ddn = (d: string) => new Date(`${d}T12:00:00Z`);
/** Dias de loja (de segunda a sábado) entre duas datas, as duas inclusas. */
export function diasDeLoja(de: string, ate: string) {
  let n = 0;
  for (let t = ddn(de).getTime(); t <= ddn(ate).getTime(); t += 86_400_000) if (new Date(t).getUTCDay() !== 0) n++;
  return n;
}
const fimDoMes = (d: string) => { const x = ddn(d); return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).toISOString().slice(0, 10); };
const diaAnterior = (d: string) => new Date(ddn(d).getTime() - 86_400_000).toISOString().slice(0, 10);

export type MetaDoDia = {
  /** Quanto falta para a meta do mês e o que dá por dia de loja que resta (hoje incluso). */
  faltam: number; porDia: number; diasRestantes: number;
  /** Quanto já era para ter vendido até ontem, no ritmo da meta. */
  esperado: number; pct: number; ritmo: number | null; batida: boolean;
};

export function metaDoDia(p: { meta: number; realizado: number; hoje: string }): MetaDoDia {
  const mes = `${p.hoje.slice(0, 7)}-01`;
  const restantes = Math.max(1, diasDeLoja(p.hoje, fimDoMes(p.hoje)));
  const passados = p.hoje > mes ? diasDeLoja(mes, diaAnterior(p.hoje)) : 0;
  const total = restantes + passados;
  const faltam = Math.max(0, p.meta - p.realizado);
  const esperado = p.meta * (passados / total);
  return {
    faltam, porDia: Math.ceil(faltam / restantes / 10) * 10, diasRestantes: restantes, esperado,
    pct: p.meta ? p.realizado / p.meta : 0, ritmo: esperado > 0 ? p.realizado / esperado : null, batida: p.meta > 0 && p.realizado >= p.meta,
  };
}

/** A cor da meta: verde no ritmo ou acima, amarelo um pouco atrás, vermelho bem atrás. */
export function corDaMeta(ritmo: number | null, batida: boolean) {
  if (batida || ritmo === null || ritmo >= 1) return "verde";
  return ritmo >= 0.85 ? "amarela" : "vermelha";
}

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)}%`);

/** O resumo do dia em texto, pronto para a gestora mandar no WhatsApp. */
export function textoDoResumo(loja: string, dia: string, r: ResumoDia) {
  const [a, m, d] = dia.split("-");
  const linhas = [
    `*Lista da vez · ${loja ? `${loja} · ` : ""}${d}/${m}/${a}*`,
    `Atendimentos: ${r.total} · Vendas: ${r.vendeu} · Conversão: ${pct(r.conversao)}`,
  ];
  if (r.tempoMedioMin !== null) linhas.push(`Tempo médio de atendimento: ${fmt(r.tempoMedioMin)} min`);
  if (r.porPessoa.length) linhas.push("", "*Por vendedora*", ...r.porPessoa.map((p) => `${p.nome}: ${p.vendeu} de ${p.total} (${pct(p.conversao)})`));
  if (r.porHora.length) {
    const pico = [...r.porHora].sort((x, y) => y.total - x.total)[0];
    linhas.push("", `Horário de maior movimento: ${pico.hora}h (${pico.total} atendimentos)`);
  }
  if (r.motivos.length) linhas.push("", "*Por que não vendeu*", ...r.motivos.slice(0, 5).map((x) => `${x.motivo}: ${x.qtd}`));
  return linhas.join("\n");
}

// ───── Contagem por vendedora (atalho do Início da gestão) ─────

export type ContaVez = { total: number; vendeu: number; naoVendeu: number };
export type LinhaContagem = { pessoa_id: string; nome: string; hoje: ContaVez; mes: ContaVez };
const zero = (): ContaVez => ({ total: 0, vendeu: 0, naoVendeu: 0 });

/** Atendimentos de cada vendedora no dia e no mês (os que ainda estão em andamento contam como atendimento, sem resultado). */
export function contarPorPessoa(
  atends: { pessoa_id: string | null; dia: string; resultado: "vendeu" | "nao_vendeu" | null }[],
  pessoas: { id: string; nome: string }[],
  hoje: string,
): LinhaContagem[] {
  const linhas = new Map<string, LinhaContagem>(pessoas.map((p) => [p.id, { pessoa_id: p.id, nome: p.nome, hoje: zero(), mes: zero() }]));
  const mes = hoje.slice(0, 7);
  for (const a of atends) {
    const l = a.pessoa_id ? linhas.get(a.pessoa_id) : undefined;
    if (!l || a.dia.slice(0, 7) !== mes || a.dia > hoje) continue;
    const somar = (c: ContaVez) => { c.total++; if (a.resultado === "vendeu") c.vendeu++; else if (a.resultado === "nao_vendeu") c.naoVendeu++; };
    somar(l.mes);
    if (a.dia === hoje) somar(l.hoje);
  }
  return [...linhas.values()];
}
