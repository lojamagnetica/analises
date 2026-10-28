"use client";

import Link from "next/link";
import { useState } from "react";
import { BASE } from "@/lib/config";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, moeda } from "@/lib/formato";
import {
  buscarLeitura, caixaDaSemana, despublicar, excluirLeitura, marcarAcao, montarRascunho, numerosDaLoja, publicarLeitura, semanaDe, type Leitura,
} from "@/lib/leitura";

const DIAS = ["seg", "ter", "qua", "qui", "sex", "sáb"];

/** O caixa da semana no Início da loja: sem número lançado, não tem leitura na segunda. */
export function CaixaDaSemana() {
  const { portal } = usePortal();
  const { dados } = useDados(() => caixaDaSemana(portal.id), [portal.id]);
  if (!dados || (portal.menu_oculto ?? []).includes("gestao")) return null;
  const faltam = dados.filter((d) => d.passou && !d.lancado).length;
  return (
    <div className={`card mt card-borda`} style={{ ["--c" as string]: faltam ? "var(--red)" : "var(--green)" }}>
      <div className="linha entre" style={{ gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <b>🧾 Caixa desta semana</b>
          <div className="linha" style={{ gap: 6, marginTop: 6 }}>
            {dados.map((d, i) => (
              <span key={d.dia} title={dia(d.dia)} style={{ textAlign: "center", fontSize: 11.5, width: 34 }}>
                <span style={{ display: "block", width: 22, height: 22, margin: "0 auto 2px", borderRadius: 11, lineHeight: "22px", fontSize: 12,
                  background: d.lancado ? "var(--green)" : d.passou ? "var(--red-soft)" : "var(--soft)", color: d.lancado ? "#fff" : "var(--text)", border: d.hoje ? "2px solid var(--ink)" : "none" }}>
                  {d.lancado ? "✓" : d.passou ? "!" : ""}
                </span>{DIAS[i]}
              </span>
            ))}
          </div>
        </div>
        <Link className={`btn ${faltam ? "p" : "s"} peq`} href="/gestao/caixa">{faltam ? `Lançar ${faltam === 1 ? "o dia que falta" : `os ${faltam} dias que faltam`}` : "Lançar o caixa de hoje"}</Link>
      </div>
      <p className="ajuda" style={{ margin: "8px 0 0" }}>Toda segunda a Camilla lê os números da sua semana e te manda a leitura com as ações. Sem caixa lançado, não tem leitura. Quer passar isso para alguém da equipe? Peça à Camilla um acesso só do caixa.</p>
    </div>
  );
}

/** A leitura publicada, como a loja vê (a loja marca as ações). */
function Publicada({ l, recarregar, extra }: { l: Leitura; recarregar: () => void; extra?: React.ReactNode }) {
  const [erro, setErro] = useState("");
  const feitas = l.acoes.filter((a) => a.feita).length;
  return (
    <div className="card card-borda mt" style={{ ["--c" as string]: "var(--purple)" }}>
      <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>📊 A leitura da sua semana</h3>
        <small className="mudo">por {l.autor_nome || "Camilla"} · semana de {dia(l.semana)}</small>
      </div>
      {l.texto && <p style={{ margin: "8px 0", fontSize: 15.5, whiteSpace: "pre-wrap" }}>{l.texto}</p>}
      {l.acoes.length > 0 && (
        <>
          <b style={{ fontSize: 14 }}>As ações da semana · {feitas} de {l.acoes.length}</b>
          {l.acoes.map((a, i) => (
            <label key={i} className="marcar" style={{ margin: "4px 0" }}>
              <input type="checkbox" checked={a.feita} onChange={async (e) => { try { await marcarAcao(l.id, i, e.target.checked); recarregar(); } catch (x) { setErro((x as Error).message); } }} />
              <span style={{ textDecoration: a.feita ? "line-through" : undefined }}>{a.t}</span>
            </label>
          ))}
        </>
      )}
      {erro && <div className="aviso mt">{erro}</div>}
      <div className="linha mt" style={{ gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <Link className="btn s peq" href="/assistente">💬 Falar com a Camilla sobre isso</Link>
        {extra}
      </div>
    </div>
  );
}

/** No Início: a leitura da semana. A equipe revisa o rascunho do Hub e publica aqui mesmo. */
export function LeituraDaSemana() {
  const { portal, equipe, nome } = usePortal();
  const { dados, recarregar } = useDados(async () => ({
    ...(await buscarLeitura(portal.id, equipe)),
    numeros: equipe ? await numerosDaLoja(portal.id).catch(() => null) : null,
  }), [portal.id, equipe]);
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState<string | null>(null);
  const [acoes, setAcoes] = useState<string[] | null>(null);
  const [montando, setMontando] = useState(false);
  const [erro, setErro] = useState("");
  if (!dados) return <Carregando />;
  const l = dados.leitura;
  const zap = (portal.whatsapp ?? "").replace(/\D/g, "");
  const avisar = zap && (
    <a className="btn p peq" target="_blank" rel="noopener"
      href={`https://wa.me/55${zap.replace(/^55/, "")}?text=${encodeURIComponent(`Oi, ${portal.responsavel?.split(" ")[0] ?? ""}! A leitura da sua semana já está no Hub, com as 3 ações para esta semana: ${typeof window !== "undefined" ? window.location.origin : ""}${BASE}/inicio/`)}`}>
      Avisar a loja no WhatsApp
    </a>
  );

  // Equipe: revisa o rascunho e publica (ou edita a publicada).
  if (equipe && (editando || !dados.publicadaNestaSemana)) {
    const r = dados.rascunho;
    const tx = texto ?? r?.texto ?? (editando ? l?.texto ?? "" : "");
    const ac = acoes ?? [...(r?.acoes.map((a) => a.t) ?? (editando ? l?.acoes.map((a) => a.t) ?? [] : [])), "", "", ""].slice(0, 3);
    const n = dados.numeros;
    return (
      <div className="card card-borda mt" style={{ ["--c" as string]: "var(--purple)" }}>
        <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>✍️ A leitura da semana de {dia(semanaDe())} · {portal.loja}</h3>
          <span className="selo espera">{r ? "rascunho do Hub" : "ainda sem rascunho"}</span>
        </div>
        <p className="mudo" style={{ marginTop: 4 }}>Só a equipe vê esta caixa. Revise, ajuste e publique: aparece no topo do Início da loja, com o seu nome. As suas correções ensinam o agente.</p>
        {n && (
          <div className="grade g4 mb" style={{ gap: 8 }}>
            <div className="kpi"><small>Semana passada</small><b>{moeda(n.semanaPassada)}</b></div>
            <div className="kpi"><small>Dias lançados (de 6)</small><b>{n.diasLancados}</b></div>
            <div className="kpi"><small>Vendeu no mês</small><b>{moeda(n.noMes)}</b></div>
            <div className="kpi"><small>Meta do mês</small><b>{n.meta ? moeda(n.meta) : "—"}</b></div>
          </div>
        )}
        {r?.rascunho?.para_camilla && <div className="aviso mb">🔎 <b>Para você conferir:</b> {r.rascunho.para_camilla}</div>}
        <label className="ajuda" style={{ display: "block" }}><b style={{ color: "var(--ink)" }}>O que os números mostram</b>
          <textarea rows={4} value={tx} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: A semana fechou 18% abaixo do ritmo da meta. O ticket subiu, mas entraram menos clientes: o foco é trazer gente para a loja." />
        </label>
        <b style={{ fontSize: 14 }}>As 3 ações da semana</b>
        {ac.map((a, i) => (
          <input key={i} type="text" value={a} placeholder={`Ação ${i + 1}`} onChange={(e) => setAcoes(ac.map((x, j) => (j === i ? e.target.value : x)))} />
        ))}
        {erro && <div className="aviso mb">{erro}</div>}
        <div className="linha" style={{ gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn p peq" disabled={!tx.trim() && !ac.some((a) => a.trim())} onClick={async () => {
            setErro("");
            const lista = ac.filter((a) => a.trim()).map((t) => ({ t: t.trim(), feita: l?.acoes.find((x) => x.t === t.trim())?.feita ?? false }));
            try {
              await publicarLeitura(portal.id, tx, lista, nome.split(" ")[0] || "Camilla", r?.rascunho ?? null);
              setEditando(false); setTexto(null); setAcoes(null); recarregar();
            } catch (e) { setErro((e as Error).message); }
          }}>Publicar para a loja</button>
          <button type="button" className="btn s peq" disabled={montando} onClick={async () => {
            setErro(""); setMontando(true);
            try { await montarRascunho({ portal_id: portal.id }); setTexto(null); setAcoes(null); recarregar(); } catch (e) { setErro((e as Error).message); }
            setMontando(false);
          }}>{montando ? "Montando…" : r ? "✨ Montar de novo" : "✨ Montar o rascunho"}</button>
          {editando && <button type="button" className="btn s peq" onClick={() => { setEditando(false); setTexto(null); setAcoes(null); }}>Cancelar</button>}
        </div>
      </div>
    );
  }

  if (!l) {
    return (
      <div className="card mt linha entre" style={{ gap: 10, flexWrap: "wrap" }}>
        <span>💬 <b>Dúvida, travou em algo?</b> <span className="mudo">Fale com a Camilla: a equipe responde em até 12 horas úteis.</span></span>
        <Link className="btn s peq" href="/assistente">Fale com a Camilla</Link>
      </div>
    );
  }

  return (
    <Publicada l={l} recarregar={recarregar} extra={equipe && dados.publicadaNestaSemana ? <>
      {avisar}
      <button type="button" className="link-loja" onClick={() => setEditando(true)}>Editar</button>
      <button type="button" className="link-loja" onClick={async () => { if (confirm("Tirar a leitura do Início da loja (volta para rascunho)?")) { try { await despublicar(l.id); recarregar(); } catch (x) { setErro((x as Error).message); } } }}>Voltar para rascunho</button>
      <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={async () => { if (confirm("Excluir a leitura desta semana?")) { try { await excluirLeitura(l.id); recarregar(); } catch (x) { setErro((x as Error).message); } } }}>Excluir</button>
      {erro && <span className="aviso">{erro}</span>}
    </> : undefined} />
  );
}
