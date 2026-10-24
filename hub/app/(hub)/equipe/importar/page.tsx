"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { useEquipe } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";

// Importação de dados preparados pela equipe (histórico de reuniões, planejamentos, notas…), gravada com o login de quem
// está na tela e com as regras de acesso de sempre. Só cria e atualiza; nunca apaga. Rodar de novo não duplica nada.

type Op = { tabela: string; tipo: "inserir" | "atualizar"; portal_id: string; chave?: Record<string, unknown>; valores: Record<string, unknown> };

const COLUNAS: Record<string, { rotulo: string; colunas: string[]; conflito: string }> = {
  reunioes: { rotulo: "Reuniões", colunas: ["id", "portal_id", "titulo", "data", "selecionar", "status", "gravacao_url", "ata"], conflito: "id" },
  notas: { rotulo: "Notas", colunas: ["id", "portal_id", "titulo", "conteudo"], conflito: "id" },
  planeje: { rotulo: "Planejamento do mês", colunas: ["portal_id", "mes", "bloco", "texto"], conflito: "portal_id,mes,bloco" },
  plano_itens: { rotulo: "Plano de Ação", colunas: ["id", "portal_id", "mes", "ordem", "texto", "feito", "feito_em", "origem"], conflito: "id" },
  consultoria_acoes: { rotulo: "Ações da consultoria", colunas: ["id", "portal_id", "acao", "quem", "prazo", "tipo", "status", "obs", "loja"], conflito: "id" },
};

const so = (o: Record<string, unknown>, cols: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => cols.includes(k)));

export default function Importar() {
  useEquipe();
  const [ops, setOps] = useState<Op[] | null>(null);
  const [lojas, setLojas] = useState<Map<string, string>>(new Map());
  const [erro, setErro] = useState("");
  const [rodando, setRodando] = useState(false);
  const [feitos, setFeitos] = useState(0);
  const [falhas, setFalhas] = useState<string[]>([]);
  const [fim, setFim] = useState(false);

  async function abrir(f: File) {
    setErro(""); setOps(null); setFim(false); setFalhas([]); setFeitos(0);
    try {
      const j = JSON.parse(await f.text()) as { ops?: Op[] };
      const lista = (j.ops ?? []).filter((o) => COLUNAS[o.tabela] && (o.tipo === "inserir" || o.tipo === "atualizar") && o.portal_id);
      if (!lista.length) throw new Error("O arquivo não tem nada para importar.");
      const ids = [...new Set(lista.map((o) => o.portal_id))];
      const { data } = await supabaseBrowser().from("portais").select("id, loja").in("id", ids);
      setLojas(new Map((data ?? []).map((p) => [p.id as string, p.loja as string])));
      setOps(lista);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Arquivo inválido.");
    }
  }

  async function importar() {
    if (!ops) return;
    setRodando(true); setFalhas([]); setFeitos(0);
    const sb = supabaseBrowser();
    const erros: string[] = [];
    let n = 0;
    for (const o of ops) {
      const def = COLUNAS[o.tabela];
      const loja = lojas.get(o.portal_id) ?? o.portal_id;
      let res;
      if (o.tipo === "inserir") {
        // Se já existir (mesmo id, ou o mesmo bloco do mês), não mexe: não sobrescreve nada.
        res = await sb.from(o.tabela).upsert(so(o.valores, def.colunas), { onConflict: def.conflito, ignoreDuplicates: true });
      } else {
        let q = sb.from(o.tabela).update(so(o.valores, def.colunas.filter((c) => c !== "id" && c !== "portal_id")));
        for (const [k, v] of Object.entries(o.chave ?? {})) q = q.eq(k, v as string);
        res = await q.eq("portal_id", o.portal_id);
      }
      if (res.error) erros.push(`${loja} · ${def.rotulo}: ${res.error.message}`);
      n++; setFeitos(n);
    }
    setFalhas(erros); setRodando(false); setFim(true);
  }

  const porLoja = new Map<string, Map<string, number>>();
  (ops ?? []).forEach((o) => {
    const l = lojas.get(o.portal_id) ?? o.portal_id;
    const m = porLoja.get(l) ?? new Map<string, number>();
    const k = `${COLUNAS[o.tabela].rotulo} (${o.tipo === "inserir" ? "novo" : "atualizar"})`;
    m.set(k, (m.get(k) ?? 0) + 1); porLoja.set(l, m);
  });

  return (
    <>
      <Titulo titulo="Importar dados" sub="Grava no Hub os dados preparados pela equipe: reuniões, planejamentos, Plano de Ação, notas e ações da consultoria. Só cria e atualiza, nunca apaga. Pode rodar de novo sem duplicar." />
      <div className="card mb" style={{ maxWidth: 720 }}>
        <label className="rotulo" style={{ marginTop: 0 }}>Arquivo de importação (.json)</label>
        <input type="file" accept=".json,application/json" disabled={rodando} onChange={(e) => { const f = e.target.files?.[0]; if (f) abrir(f); }} />
        {erro && <div className="aviso mt">{erro}</div>}
      </div>

      {ops && (
        <>
          <div className="secao">O que vai entrar · {ops.length} itens em {porLoja.size} lojas</div>
          <div className="card tabela-wrap mb">
            <table className="tabela">
              <thead><tr><th>Loja</th><th>O que entra</th></tr></thead>
              <tbody>
                {[...porLoja.entries()].sort().map(([l, m]) => (
                  <tr key={l}><td><b>{l}</b></td><td>{[...m.entries()].map(([k, v]) => `${v} ${k}`).join(" · ")}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          {!fim && (
            <button type="button" className="btn p" disabled={rodando} onClick={importar}>
              {rodando ? `Gravando… ${feitos} de ${ops.length}` : `Importar ${ops.length} itens`}
            </button>
          )}
          {fim && (
            <div className={`aviso mt ${falhas.length ? "" : "ok"}`}>
              {falhas.length ? `${ops.length - falhas.length} de ${ops.length} gravados. ${falhas.length} com erro:` : `Pronto: ${ops.length} itens gravados.`}
              {falhas.length > 0 && <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>{falhas.slice(0, 30).map((f, i) => <li key={i}>{f}</li>)}</ul>}
            </div>
          )}
        </>
      )}
    </>
  );
}
