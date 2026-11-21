"use client";

// O mês na cabeça da cliente: o que ela busca, as datas fortes e de caixa rápido e ideias de campanha (lib/calendario-varejo.ts).
// Aparece no calendário do mural e como lembrete das datas no Planeje do mês.
import { MES_CLIENTE, datasMoveis, seloDaData } from "@/lib/calendario-varejo";

export function MesDaCliente({ mes, datas }: { mes: string; datas?: { dia: number | null; titulo: string }[] }) {
  const m = Number(mes.slice(5, 7)) - 1;
  const g = MES_CLIENTE[m];
  if (!g) return null;
  // As datas fortes do mês (as do cadastro, quando vierem, e as que mudam de dia).
  const nomes = [...(datas ?? []).map((x) => x.titulo), ...datasMoveis(Number(mes.slice(0, 4))).filter((x) => Number(x.data.slice(5, 7)) === m + 1).map((x) => x.titulo)];
  const fortes = [...new Set(nomes.filter((t) => seloDaData(t) === "forte").map((t) => t.replace(/\s*\(.*\)$/, "")))];
  return (
    <div className="card card-borda mt" style={{ ["--c" as string]: "var(--orange)" }}>
      <b>O mês na cabeça da cliente</b>
      <p style={{ margin: "4px 0 8px" }}>{g.busca}</p>
      {fortes.length > 0 && <p style={{ margin: "0 0 6px" }}>★ <b>Data forte do varejo:</b> {fortes.join(", ")}. Comece a campanha antes da data.</p>}
      {g.rapido && <p style={{ margin: "0 0 6px" }}>💰 <b>Caixa rápido:</b> {g.rapido}</p>}
      <b style={{ fontSize: 14 }}>Ideias de campanha</b>
      <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>{g.ideias.map((x) => <li key={x}>{x}</li>)}</ul>
    </div>
  );
}
