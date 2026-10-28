"use client";

import { useState } from "react";
import Link from "next/link";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados } from "@/lib/hub";
import { dia } from "@/lib/formato";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  PERGUNTAS, buscarHistorias, excluirHistoria, salvarHistoria, tirarFoto, urlsDasFotos, type Historia, type Respostas,
} from "@/lib/historia";

const LINK = "https://lojamagnetica.github.io/analises/portal/historia/";
const valoresEmTexto = (r: Respostas) => (r.valores ?? []).map((v) => `${v.nome}: ${v.como}`.trim()).join("\n");
const textoEmValores = (t: string) => t.split("\n").map((l) => l.trim()).filter(Boolean)
  .map((l) => { const [nome, ...resto] = l.split(":"); return { nome: nome.trim(), como: resto.join(":").trim() }; });

/** Editar as respostas e as fotos de uma história (a Camilla revisa antes de liberar). */
function Editor({ h, urls, aoSalvar, aoCancelar }: { h: Historia; urls: Record<string, string>; aoSalvar: () => void; aoCancelar: () => void }) {
  const [r, setR] = useState<Respostas>(h.respostas ?? {});
  const [valores, setValores] = useState(valoresEmTexto(h.respostas ?? {}));
  const [fotos, setFotos] = useState(h.fotos ?? []);
  const [loja, setLoja] = useState(h.loja);
  const [erro, setErro] = useState("");
  return (
    <div className="mt">
      <label className="ajuda" style={{ display: "block" }}>Nome da loja (como aparece no título)<input type="text" value={loja} onChange={(e) => setLoja(e.target.value)} /></label>
      {PERGUNTAS.map((p) => (
        <label key={p.id} className="ajuda" style={{ display: "block" }}><b>{p.titulo}</b>
          <textarea rows={4} value={r[p.id] ?? ""} onChange={(e) => setR({ ...r, [p.id]: e.target.value })} />
        </label>
      ))}
      <label className="ajuda" style={{ display: "block" }}><b>Valores</b>: um por linha, &quot;Valor: como aparece no dia a dia&quot;
        <textarea rows={4} value={valores} onChange={(e) => setValores(e.target.value)} />
      </label>
      {fotos.length > 0 && <b style={{ fontSize: 14 }}>Fotos</b>}
      {fotos.map((f) => (
        <div key={f.caminho} className="linha mb" style={{ gap: 10, alignItems: "flex-start" }}>
          {urls[f.caminho] ? <img src={urls[f.caminho]} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 10 }} /> : <div style={{ width: 80 }}>📷</div>}
          <div style={{ flex: 1 }}>
            <input type="text" placeholder="Ano" value={f.ano} style={{ marginTop: 0 }} onChange={(e) => setFotos(fotos.map((x) => (x.caminho === f.caminho ? { ...x, ano: e.target.value } : x)))} />
            <input type="text" placeholder="Legenda" value={f.legenda} onChange={(e) => setFotos(fotos.map((x) => (x.caminho === f.caminho ? { ...x, legenda: e.target.value } : x)))} />
            <button type="button" className="link-loja" style={{ color: "var(--red)", fontSize: 13 }} onClick={async () => {
              if (!confirm("Excluir esta foto? Não dá para desfazer.")) return;
              try { await tirarFoto({ ...h, fotos }, f.caminho); setFotos(fotos.filter((x) => x.caminho !== f.caminho)); } catch (x) { setErro((x as Error).message); }
            }}>Excluir foto</button>
          </div>
        </div>
      ))}
      {erro && <div className="aviso mb">{erro}</div>}
      <div className="linha" style={{ gap: 8 }}>
        <button type="button" className="btn p peq" onClick={async () => {
          setErro("");
          try { await salvarHistoria(h.id, { loja: loja.trim(), respostas: { ...r, valores: textoEmValores(valores) }, fotos }); aoSalvar(); } catch (x) { setErro((x as Error).message); }
        }}>Salvar</button>
        <button type="button" className="btn s peq" onClick={aoCancelar}>Cancelar</button>
      </div>
    </div>
  );
}

function Cartao({ h, portais, recarregar }: { h: Historia; portais: { id: string; loja: string }[]; recarregar: () => void }) {
  const [editando, setEditando] = useState(false);
  const [urls, setUrls] = useState<Record<string, string> | null>(null);
  const [erro, setErro] = useState("");
  const respondidas = PERGUNTAS.filter((p) => h.respostas?.[p.id]?.trim()).length + (h.respostas?.valores?.length ? 1 : 0);
  const selo = h.liberado ? ["feito", "liberada"] : h.enviado ? ["andamento", "enviada · revisar"] : ["espera", "preenchendo"];
  const mudar = async (x: Partial<Historia>) => { setErro(""); try { await salvarHistoria(h.id, x); recarregar(); } catch (e) { setErro((e as Error).message); } };

  return (
    <div className="card mb">
      <div className="linha entre" style={{ alignItems: "flex-start", gap: 8 }}>
        <div>
          <h3 style={{ margin: 0 }}>{h.loja || "(sem nome)"}</h3>
          <small className="mudo">{h.nome}{h.whatsapp ? ` · ${h.whatsapp}` : ""} · {respondidas} de 9 respostas · {h.fotos?.length ?? 0} fotos · {dia(h.updated_at.slice(0, 10))}</small>
        </div>
        <span className={`selo ${selo[0]}`}>{selo[1]}</span>
      </div>
      <label className="ajuda" style={{ display: "block" }}>Portal da loja
        <select value={h.portal_id ?? ""} onChange={(e) => mudar({ portal_id: e.target.value || null, ...(e.target.value ? {} : { liberado: false }) })}>
          <option value="">Escolher o portal…</option>
          {portais.map((p) => <option key={p.id} value={p.id}>{p.loja}</option>)}
        </select>
      </label>
      {erro && <div className="aviso mb">{erro}</div>}
      <div className="linha" style={{ gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        {!editando && <button type="button" className="btn s peq" onClick={async () => { setUrls(await urlsDasFotos(h.fotos ?? [])); setEditando(true); }}>Ver e editar</button>}
        {h.portal_id && <Link className="link-loja" href={`/nossa-historia?portal=${h.portal_id}`}>Ver como fica no portal</Link>}
        {h.liberado
          ? <button type="button" className="link-loja" onClick={() => mudar({ liberado: false })}>Voltar para rascunho</button>
          : <button type="button" className="btn p peq" disabled={!h.portal_id} title={h.portal_id ? "" : "Escolha o portal primeiro"} onClick={() => { if (confirm(`Liberar a história para ${h.loja}?`)) mudar({ liberado: true }); }}>Liberar para a loja</button>}
        <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={async () => {
          if (!confirm(`Excluir a história de ${h.loja || "esta loja"}, com as fotos? Não dá para desfazer.`)) return;
          try { await excluirHistoria(h); recarregar(); } catch (e) { setErro((e as Error).message); }
        }}>Excluir</button>
      </div>
      {editando && urls && <Editor h={h} urls={urls} aoSalvar={() => { setEditando(false); recarregar(); }} aoCancelar={() => setEditando(false)} />}
    </div>
  );
}

/** As histórias que chegaram pelo link do grupo: ligar ao portal, revisar e liberar. */
export default function Historias() {
  const { dados, recarregar } = useDados(async () => {
    const [historias, { data: portais }] = await Promise.all([
      buscarHistorias(),
      supabaseBrowser().from("portais").select("id, loja").eq("ativo", true).order("loja"),
    ]);
    return { historias, portais: (portais ?? []) as { id: string; loja: string }[] };
  }, []);
  const [copiado, setCopiado] = useState(false);
  if (!dados) return <Carregando />;
  return (
    <>
      <Titulo titulo="Histórias das lojas" sub="As lojas contam a própria história pelo link do grupo. Ligue cada uma ao portal, revise e libere: a loja vê em Nossa história." />
      <div className="card mb linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
        <span style={{ wordBreak: "break-all" }}>🔗 {LINK}</span>
        <button type="button" className="btn s peq" onClick={() => navigator.clipboard.writeText(LINK).then(() => setCopiado(true))}>{copiado ? "Copiado ✓" : "Copiar link"}</button>
      </div>
      {!dados.historias.length && <div className="card mudo">Nenhuma história chegou ainda.</div>}
      {dados.historias.map((h) => <Cartao key={h.id} h={h} portais={dados.portais} recarregar={recarregar} />)}
    </>
  );
}
