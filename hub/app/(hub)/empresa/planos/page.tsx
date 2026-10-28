"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados } from "@/lib/hub";
import { moeda } from "@/lib/formato";
import { supabaseBrowser } from "@/lib/supabase/client";

type Inclui = { reunioes?: string; grupo?: boolean; leitura?: boolean; visitas?: number; detalhes?: string; revisado?: boolean };
type Plano = { id: string; nome: string; tipo: string; meses: number; valor: number | null; vendendo: boolean; inclui: Inclui };

const REUNIOES = [
  { v: "semanal", rotulo: "Toda semana" },
  { v: "quinzenal", rotulo: "A cada 15 dias" },
  { v: "mensal", rotulo: "Uma por mês" },
  { v: "so_inicio", rotulo: "Só no primeiro mês (depois, encontros em grupo)" },
  { v: "nenhuma", rotulo: "Nenhuma reunião individual" },
];

function Cartao({ p, lojas, aoSalvar }: { p: Plano; lojas: number; aoSalvar: () => void }) {
  const [r, setR] = useState<Plano>(p);
  const [msg, setMsg] = useState("");
  const i = r.inclui ?? {};
  const muda = (x: Partial<Inclui>) => setR({ ...r, inclui: { ...i, ...x } });
  return (
    <div className="card card-borda" style={{ ["--c" as string]: i.revisado ? "var(--green)" : "var(--orange)" }}>
      <div className="linha entre" style={{ gap: 8 }}>
        <h3 style={{ margin: 0 }}>{p.nome}</h3>
        <span className={`selo ${i.revisado ? "feito" : "alerta"}`}>{i.revisado ? "revisado" : "a revisar"}</span>
      </div>
      <small className="mudo">{p.tipo} · {p.meses} meses{p.valor ? ` · ${moeda(p.valor)}` : ""} · {lojas} loja{lojas === 1 ? "" : "s"} · {p.vendendo ? "à venda" : "fora de venda"}</small>
      <label className="ajuda" style={{ display: "block" }}><b style={{ color: "var(--ink)" }}>Reunião individual</b>
        <select value={i.reunioes ?? "so_inicio"} onChange={(e) => muda({ reunioes: e.target.value })}>
          {REUNIOES.map((x) => <option key={x.v} value={x.v}>{x.rotulo}</option>)}
        </select>
      </label>
      <div className="grade g2" style={{ gap: "0 10px" }}>
        <label className="marcar"><input type="checkbox" checked={!!i.grupo} onChange={(e) => muda({ grupo: e.target.checked })} /><span>Encontros em grupo</span></label>
        <label className="marcar"><input type="checkbox" checked={!!i.leitura} onChange={(e) => muda({ leitura: e.target.checked })} /><span>Leitura da semana</span></label>
      </div>
      <label className="ajuda" style={{ display: "block" }}>Visitas presenciais incluídas
        <input type="number" min={0} value={i.visitas ?? 0} onChange={(e) => muda({ visitas: Number(e.target.value) || 0 })} />
      </label>
      <label className="ajuda" style={{ display: "block" }}>O que mais o plano inclui
        <textarea rows={3} value={i.detalhes ?? ""} placeholder="Ex.: Diagnóstico, Plano de Ação 90 dias, acesso ao curso, grupo de WhatsApp" onChange={(e) => muda({ detalhes: e.target.value })} />
      </label>
      <label className="marcar"><input type="checkbox" checked={!!i.revisado} onChange={(e) => muda({ revisado: e.target.checked })} /><span>Revisei este plano</span></label>
      {msg && <p className="ajuda" style={{ margin: "4px 0" }}>{msg}</p>}
      <button type="button" className="btn p peq mt" onClick={async () => {
        setMsg("");
        const { error } = await supabaseBrowser().from("planos").update({ inclui: r.inclui }).eq("id", p.id);
        if (error) setMsg(error.message); else { setMsg("Salvo ✓"); aoSalvar(); }
      }}>Salvar</button>
    </div>
  );
}

/** Planos e o que cada um inclui: é daqui que o acompanhamento sabe quem precisa de reunião individual marcada. */
export default function Planos() {
  const { dados, recarregar } = useDados(async () => {
    const sb = supabaseBrowser();
    const [{ data: planos }, { data: fichas }, { data: portais }] = await Promise.all([
      sb.from("planos").select("id, nome, tipo, meses, valor, vendendo, inclui").order("ordem"),
      sb.from("fichas").select("portal_id, plano_id"),
      sb.from("portais").select("id").eq("ativo", true),
    ]);
    const ativos = new Set((portais ?? []).map((p) => p.id));
    return { planos: (planos ?? []) as Plano[], fichas: (fichas ?? []).filter((f) => ativos.has(f.portal_id)) };
  }, []);
  if (!dados) return <Carregando />;
  const aRevisar = dados.planos.filter((p) => !p.inclui?.revisado).length;
  return (
    <>
      <Titulo titulo="Planos e o que cada um inclui" sub="Reunião individual, encontros em grupo, leitura da semana e visitas de cada plano. O acompanhamento das lojas segue o que estiver aqui." />
      {aRevisar > 0 && <div className="aviso mb">{aRevisar} plano{aRevisar === 1 ? "" : "s"} ainda a revisar. O que está preenchido é só um ponto de partida.</div>}
      <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {dados.planos.map((p) => <Cartao key={p.id} p={p} lojas={dados.fichas.filter((f) => f.plano_id === p.id).length} aoSalvar={recarregar} />)}
      </div>
    </>
  );
}
