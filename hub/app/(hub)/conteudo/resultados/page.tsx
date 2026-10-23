"use client";

import Link from "next/link";
import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Trancado } from "@/components/Trancado";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, hoje } from "@/lib/formato";
import { carregarConteudo, metaViews, postSalvar, resultados, roteirosDaLoja, segundaDe, taxaEnvio, type Post } from "@/lib/instagram";
import { somarDias } from "@/lib/acoes-mes";

const NUMEROS: [keyof Post, string][] = [["views", "Views"], ["alcance", "Alcance"], ["envios", "Envios"], ["salvamentos", "Salvos"], ["comentarios", "Coment."], ["mensagens", "DMs/Whats"], ["vendas", "Vendas"]];

function Linha({ p, aoMudar }: { p: Post; aoMudar: () => void }) {
  const [f, setF] = useState<Record<string, string>>(() => Object.fromEntries(NUMEROS.map(([k]) => [k, p[k] == null ? "" : String(p[k])])));
  const [rosto, setRosto] = useState<boolean | null>(p.com_rosto);
  const [salvo, setSalvo] = useState(false);
  const taxa = Number(f.alcance) > 0 && f.envios !== "" ? Math.round((Number(f.envios) / Number(f.alcance)) * 1000) / 10 : null;
  return (
    <tr>
      <td style={{ whiteSpace: "nowrap" }}>{dia(p.data).slice(0, 5)}<div className="mudo" style={{ fontSize: 12 }}>{p.formato}</div></td>
      <td style={{ minWidth: 180 }}><b style={{ fontSize: 13.5 }}>{p.gancho || p.tema}</b></td>
      <td><input type="checkbox" checked={!!rosto} onChange={(e) => { setRosto(e.target.checked); setSalvo(false); }} aria-label="Com você no vídeo" /></td>
      {NUMEROS.map(([k, r]) => (
        <td key={k}><input type="number" min={0} inputMode="numeric" aria-label={`${r} de ${p.gancho || p.tema}`} value={f[k]} onChange={(e) => { setF({ ...f, [k]: e.target.value }); setSalvo(false); }} style={{ width: 78 }} /></td>
      ))}
      <td style={{ whiteSpace: "nowrap" }}>{taxa != null ? `${taxa.toLocaleString("pt-BR")}%` : "—"}</td>
      <td>
        <button type="button" className="btn s peq" disabled={salvo} onClick={async () => {
          await postSalvar(p.id, { ...Object.fromEntries(NUMEROS.map(([k]) => [k, f[k] === "" ? null : Number(f[k])])), com_rosto: rosto, status: "Publicado" });
          setSalvo(true); aoMudar();
        }}>{salvo ? "✓" : "Salvar"}</button>
      </td>
    </tr>
  );
}

export default function Resultados() {
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(() => carregarConteudo(portal.id), [portal.id]);
  if (!dados) return <Carregando />;
  const { m, a, posts } = dados;
  if (!a) return <Trancado titulo="Resultados" texto={m.textos.trancado} />;

  const r = resultados(posts);
  const meta = metaViews(a.numeros.meta_views);
  const nome = (id: string) => roteirosDaLoja(m, a).find((x) => x.id === id)?.nome ?? id;
  const lancar = posts.filter((p) => p.data <= hoje() && p.formato !== "Stories").sort((x, y) => y.data.localeCompare(x.data)).slice(0, 40);
  const semanas = Array.from({ length: 6 }, (_, i) => somarDias(segundaDe(hoje()), -7 * (5 - i)));
  const porSemana = semanas.map((s) => ({ s, taxa: taxaEnvio(posts.filter((p) => p.status === "Publicado" && p.data >= s && p.data <= somarDias(s, 6))) }));
  const maxTaxa = Math.max(1, ...porSemana.map((x) => x.taxa ?? 0));

  return (
    <>
      <Titulo titulo="Resultados" sub={m.textos.resultados_sub} />
      <div className="grade g4 mb">
        <div className="card kpi"><small className="mudo">Envios ÷ alcance (métrica-norte)</small><div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent)" }}>{r.envio != null ? `${r.envio.toLocaleString("pt-BR")}%` : "—"}</div></div>
        <div className="card kpi"><small className="mudo">Média de views</small><div style={{ fontSize: 28, fontWeight: 800 }}>{r.media?.toLocaleString("pt-BR") ?? "—"}</div>{meta && <small className="mudo">meta {a.numeros.meta_views}</small>}</div>
        <div className="card kpi"><small className="mudo">Conversas na DM e no WhatsApp</small><div style={{ fontSize: 28, fontWeight: 800 }}>{r.mensagens}</div></div>
        <div className="card kpi"><small className="mudo">Vendas que vieram do conteúdo</small><div style={{ fontSize: 28, fontWeight: 800, color: "var(--green)" }}>{r.vendas}</div></div>
      </div>
      <p className="ajuda">{m.textos.metrica}</p>

      <div className="grade g3 mb">
        <div className="card">
          <b>Os seus carro-chefes</b>
          <p className="mudo" style={{ fontSize: 13.5, margin: "2px 0 8px" }}>Os 3 formatos com mais envios por alcance. Repita.</p>
          {r.carroChefe.length ? <ol style={{ paddingLeft: 18, margin: 0 }}>{r.carroChefe.map((c) => <li key={c.modelo}><b>{nome(c.modelo)}</b> · {c.taxa?.toLocaleString("pt-BR")}% · {c.n} posts</li>)}</ol>
            : <small className="mudo">Lance alcance e envios dos reels publicados para descobrir.</small>}
        </div>
        <div className="card">
          <b>Com você × só produto</b>
          <p style={{ margin: "8px 0 0" }}>Com você no vídeo: <b>{r.rosto?.toLocaleString("pt-BR") ?? "—"}</b> views em média</p>
          <p style={{ margin: "4px 0 0" }}>Só produto ou loja: <b>{r.produto?.toLocaleString("pt-BR") ?? "—"}</b> views em média</p>
          {r.rosto != null && r.produto != null && r.rosto > r.produto && <p className="ajuda">{m.textos.rosto_conclusao}</p>}
        </div>
        <div className="card">
          <b>Envios ÷ alcance por semana</b>
          <div className="linha mt" style={{ alignItems: "flex-end", gap: 6, height: 90, flexWrap: "nowrap" }}>
            {porSemana.map((x) => (
              <div key={x.s} style={{ flex: 1, textAlign: "center" }}>
                <small style={{ fontSize: 11 }}>{x.taxa != null ? `${x.taxa}%` : ""}</small>
                <div title={`Semana de ${dia(x.s)}`} style={{ height: `${((x.taxa ?? 0) / maxTaxa) * 60}px`, minHeight: 2, background: x.taxa != null ? "var(--accent)" : "var(--line)", borderRadius: 6 }} />
                <small className="mudo" style={{ fontSize: 10.5 }}>{dia(x.s).slice(0, 5)}</small>
              </div>
            ))}
          </div>
          <p className="ajuda">O que conta é a sua evolução, semana a semana.</p>
        </div>
      </div>

      {r.top.length > 0 && (
        <div className="card mb">
          <b>Os 3 posts mais vistos</b>
          <ol style={{ paddingLeft: 18, marginBottom: 0 }}>{r.top.map((p) => <li key={p.id}>{p.gancho || p.tema} · <b>{(p.views ?? 0).toLocaleString("pt-BR")}</b> views{p.envios != null ? ` · ${p.envios} envios` : ""}</li>)}</ol>
          <p className="ajuda">{m.textos.repetir}</p>
        </div>
      )}

      <div className="secao">Lançar os números</div>
      {!lancar.length ? (
        <div className="card">Ainda não há posts com data passada. <Link href="/conteudo/semana">Monte a sua semana →</Link></div>
      ) : (
        <div className="card">
          <p className="ajuda" style={{ marginTop: 0 }}>Os números estão nos insights de cada post no Instagram. Lance 24 a 48 horas depois de publicar.</p>
          <div className="tabela-wrap">
            <table className="tabela">
              <thead><tr><th>Dia</th><th>Post</th><th>Você</th>{NUMEROS.map(([, r2]) => <th key={r2}>{r2}</th>)}<th>Envio</th><th></th></tr></thead>
              <tbody>{lancar.map((p) => <Linha key={p.id} p={p} aoMudar={recarregar} />)}</tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
