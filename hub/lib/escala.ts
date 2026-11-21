// Escala do mês do mural e a conferência das regras da jornada (vale para todas as lojas).
// Regras da transição do fim da escala 6x1 (PEC 221/2019), as mesmas da ferramenta "Escala sem susto" da Camilla:
// hoje 44h e 1 folga por semana; a partir de 16/12/2026, 42h e 2 folgas; a partir de 16/12/2027, 40h e 2 folgas.
// Sem banco aqui (dá para testar). A convenção coletiva da categoria pode ter regras próprias: é orientação.
import { feriadoNacional } from "./feriados.ts";

/** Os códigos de cada dia: dia vazio é dia normal de trabalho. Tocar no dia passa para o próximo. */
export const ESCALA = [
  { c: "F", nome: "Folga", cor: "#F2C230" },
  { c: "M", nome: "Só manhã", cor: "#9FD3B0" },
  { c: "T", nome: "Só tarde", cor: "#9DB8E8" },
  { c: "FÉ", nome: "Férias", cor: "#E8A0A0" },
];
export const proximoCodigo = (c: string) => { const i = ESCALA.findIndex((x) => x.c === c); return i === ESCALA.length - 1 ? "" : ESCALA[i + 1].c; };

export type Horario = { entrada: string; saida: string; almoco: number };
/** O horário da pessoa no mês; `sabado` quando o sábado tem outro horário (ex.: a loja fecha mais cedo). */
export type PessoaEscala = Horario & { dias: Record<string, string>; sabado?: Horario };
/** `fecha`: os dias da semana em que a loja fica fechada (0 = domingo, 1 = segunda...), além do domingo quando não abre. */
export type EscalaMes = { abreDomingo: boolean; fecha?: number[]; pessoas: Record<string, PessoaEscala> };
/** A loja fica fechada nesse dia da semana? */
export const lojaFechada = (e: Pick<EscalaMes, "abreDomingo" | "fecha">, diaDaSemana: number) => (diaDaSemana === 0 && !e.abreDomingo) || !!e.fecha?.includes(diaDaSemana);
/** O horário da pessoa naquele dia da semana. */
export const horarioDoDia = (p: PessoaEscala, diaDaSemana: number): Horario => (diaDaSemana === 6 && p.sabado ? p.sabado : p);
export const pessoaVazia = (): PessoaEscala => ({ entrada: "09:00", saida: "18:00", almoco: 60, dias: {} });

/** As fases da lei: a partir da segunda-feira depois de cada data, vale a regra nova. */
export const FASES = [
  { desde: "2026-12-16", horas: 42, folgas: 2, nome: "Fase 1 (42h)" },
  { desde: "2027-12-16", horas: 40, folgas: 2, nome: "Fase 2 (40h)" },
];
/** A regra da semana que começa na segunda `seg`. */
export function regraDaSemana(seg: string) {
  let r = { horas: 44, folgas: 1, nome: "Regra de hoje (44h)" };
  for (const f of FASES) if (seg > f.desde) r = f;
  return r;
}

const min = (h: string) => { const [a, b] = (h || "0:0").split(":").map(Number); return (a || 0) * 60 + (b || 0); };
/** Horas trabalhadas num dia inteiro, sem o almoço. */
export const horasDoDia = (p: Horario) => Math.max(0, (min(p.saida) - min(p.entrada) - (Number(p.almoco) || 0)) / 60);
const fmtH = (h: number) => (Number.isInteger(h) ? `${h}h` : `${h.toFixed(1).replace(".", ",")}h`);

export type Alerta = { pessoa: string; regra: string; texto: string; erro: boolean };

/** Os dias do mês ("AAAA-MM" → "AAAA-MM-DD"). */
export function diasDoMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  const n = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`);
}
const diaSemana = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay();

/** Confere a escala do mês, regra por regra. As regras da semana valem para as semanas inteiras (segunda a domingo) do mês. */
export function conferirEscala(mes: string, e: EscalaMes): Alerta[] {
  const dias = diasDoMes(mes);
  const out: Alerta[] = [];
  for (const [nome, p] of Object.entries(e.pessoas)) {
    const primeiro = nome.split(" ")[0];
    const add = (regra: string, texto: string, erro = true) => out.push({ pessoa: nome, regra, texto, erro });
    // O que cada dia é para a pessoa: horas trabalhadas (0 = folga, loja fechada ou férias).
    const codigo = (d: string) => p.dias[d.slice(8)] ?? "";
    const fechado = (d: string) => lojaFechada(e, diaSemana(d));
    const horas = (d: string) => { const c = codigo(d); if (c === "F" || c === "FÉ" || fechado(d)) return 0; const h = horasDoDia(horarioDoDia(p, diaSemana(d))); return c === "M" || c === "T" ? h / 2 : h; };
    // O horário de todo dia e o do sábado (quando é outro): limite do dia, almoço e descanso.
    for (const [qual, x] of [["por dia", p], ["no sábado", p.sabado]] as const) {
      if (!x || (qual === "no sábado" && lojaFechada(e, 6))) continue;
      const h = horasDoDia(x);
      if (h > 10) add("Até 8h por dia", `${primeiro} fica ${fmtH(h)} ${qual}. Nem com acordo de compensação passa de 10h.`);
      else if (h > 8) add("Até 8h por dia", `${primeiro} fica ${fmtH(h)} ${qual}. Acima de 8h só com acordo de compensação (até 10h).`, false);
      if (h > 6 && (Number(x.almoco) || 0) < 60) add("Almoço", `${primeiro} trabalha mais de 6h ${qual} e o almoço tem ${x.almoco || 0} minutos. O mínimo é 1 hora.`);
      const descanso = 24 - (min(x.saida) - min(x.entrada)) / 60;
      if (descanso < 11) add("11h de descanso", `${primeiro} sai às ${x.saida} e volta às ${x.entrada}: só ${fmtH(descanso)} de descanso entre um dia e outro. O mínimo é 11h.`);
    }
    // Semanas inteiras do mês: horas e folgas.
    for (const seg of dias.filter((d) => diaSemana(d) === 1)) {
      const semana = dias.slice(dias.indexOf(seg), dias.indexOf(seg) + 7);
      if (semana.length < 7) continue;
      if (semana.every((d) => codigo(d) === "FÉ")) continue;
      const r = regraDaSemana(seg);
      const tot = semana.reduce((s, d) => s + horas(d), 0);
      const folgas = semana.filter((d) => horas(d) === 0).length;
      const quando = `semana de ${seg.slice(8)}/${seg.slice(5, 7)}`;
      if (tot > r.horas + 0.01) add(`Até ${r.horas}h por semana`, `${primeiro} soma ${fmtH(tot)} na ${quando}. O teto é ${r.horas}h.`);
      if (folgas < r.folgas) add(`${r.folgas} folga${r.folgas > 1 ? "s" : ""} por semana`, `${primeiro} tem ${folgas} folga${folgas === 1 ? "" : "s"} na ${quando}. Precisa de ${r.folgas}.`);
    }
    // 7 dias seguidos sem folga.
    let seguidos = 0;
    for (const d of dias) { seguidos = horas(d) > 0 ? seguidos + 1 : 0; if (seguidos === 7) { add("Folga antes do 7º dia", `${primeiro} chega ao 7º dia seguido de trabalho em ${d.slice(8)}/${d.slice(5, 7)}. A folga tem de vir antes.`); break; } }
    // Domingo de folga pelo menos a cada 3 semanas (comércio).
    if (e.abreDomingo) {
      const doms = dias.filter((d) => diaSemana(d) === 0);
      for (let i = 0; i + 3 <= doms.length; i++) if (doms.slice(i, i + 3).every((d) => horas(d) > 0)) { add("Domingo de folga", `${primeiro} trabalha 3 domingos seguidos (${doms.slice(i, i + 3).map((d) => d.slice(8)).join(", ")}). No comércio, folga 1 domingo a cada 3 semanas.`); break; }
    }
    // Feriado trabalhado: só com a convenção coletiva.
    const fer = dias.filter((d) => feriadoNacional(d) && horas(d) > 0);
    if (fer.length) add("Feriado", `${primeiro} está trabalhando no feriado ${fer.map((d) => `${d.slice(8)}/${d.slice(5, 7)} (${feriadoNacional(d)})`).join(", ")}. Só abra se a convenção coletiva autorizar.`, false);
  }
  return out;
}

/** O aviso da regra do mês: quando a fase muda dentro do mês, avisa. */
export function avisoDoMes(mes: string) {
  const f = FASES.find((x) => x.desde.slice(0, 7) === mes);
  if (f) return `A partir de ${f.desde.slice(8)}/${f.desde.slice(5, 7)} muda a regra (fim da escala 6x1): até ${f.horas}h por semana e ${f.folgas} folgas. As semanas a partir da segunda seguinte já são conferidas na regra nova.`;
  const r = regraDaSemana(`${mes}-01`);
  return r.horas === 44 ? "Regra de hoje: até 44h por semana e 1 folga. A partir de 16/12/2026, 42h e 2 folgas." : `Regra deste mês: até ${r.horas}h por semana e ${r.folgas} folgas.`;
}
