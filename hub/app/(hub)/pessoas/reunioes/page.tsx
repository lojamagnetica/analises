"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copiar } from "@/components/Copiar";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia, hoje } from "@/lib/formato";
import { pmDoEstoque } from "@/lib/caixa";
import { buscarMeuDia, vendedoras } from "@/lib/meu-dia";
import { supabaseBrowser } from "@/lib/supabase/client";
import { montarModelos, pautaTexto, roteiroIndividual, type Modelo } from "@/lib/reunioes-modelo";

/** As reuniões da loja prontas: o roteiro em blocos de tempo, já com os números da loja e de cada vendedora. */
function Reunioes() {
  const { portal } = usePortal();
  const pedida = useSearchParams().get("m");
  const { dados, recarregar } = useDados(async () => {
    const sb = supabaseBrowser();
    const [d, { data: feitas }] = await Promise.all([
      buscarMeuDia(portal.id),
      sb.from("loja_reunioes").select("id, tipo, data").eq("portal_id", portal.id).in("tipo", ["abertura", "reta_final", "individual"]).order("data", { ascending: false }).limit(30),
    ]);
    return { d, feitas: (feitas ?? []) as { id: string; tipo: string; data: string }[] };
  }, [portal.id]);
  const [aberta, setAberta] = useState<string>(pedida ?? "abertura");
  const [salvando, setSalvando] = useState(false);
  if (!dados) return <Carregando />;
  const vs = vendedoras(dados.d, pmDoEstoque(undefined)?.valor ?? null);
  const modelos = montarModelos(dados.d, vs);
  const m = modelos.find((x) => x.id === aberta) ?? modelos[0];
  const feitasDela = dados.feitas.filter((f) => f.tipo === m.id);
  const registrar = async (x: Modelo) => {
    setSalvando(true);
    await supabaseBrowser().from("loja_reunioes").insert({ portal_id: portal.id, tipo: x.id, data: hoje(), dados: {}, pauta: pautaTexto(x) });
    setSalvando(false); recarregar();
  };

  return (
    <>
      <Titulo titulo="Reuniões prontas" sub="Os modelos de reunião da loja: o roteiro em blocos de tempo, já com os números da loja e de cada vendedora. É só abrir, seguir e marcar como feita." />
      <div className="chips mb">
        {modelos.map((x) => <button key={x.id} type="button" className={`chip${m.id === x.id ? " escolhido" : ""}`} onClick={() => setAberta(x.id)}>{x.nome} · {x.duracao}</button>)}
        <Link className="chip" href="/pessoas/reuniao-semanal">Reunião semanal do time →</Link>
        <Link className="chip" href="/pessoas/reuniao-mensal">Reunião do mês →</Link>
      </div>

      <div className="card card-borda mb" style={{ ["--c" as string]: "var(--orange)" }}>
        <div className="linha entre" style={{ gap: 10, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0 }}>{m.nome} <span className="mudo" style={{ fontSize: 16 }}>· {m.duracao}</span></h2>
            <small className="mudo">{m.quando}</small>
          </div>
          <div className="linha" style={{ gap: 8 }}>
            <Copiar texto={pautaTexto(m)} rotulo="Copiar a pauta" />
            <button type="button" className="btn p peq" disabled={salvando} onClick={() => registrar(m)}>Marcar como feita hoje</button>
          </div>
        </div>
        <p style={{ margin: "10px 0 0" }}><b>Objetivo:</b> {m.objetivo}</p>
        {feitasDela.length > 0 && <small className="mudo">Feitas: {feitasDela.slice(0, 6).map((f) => dia(f.data)).join(" · ")}</small>}
      </div>

      {m.blocos.map((b) => (
        <div key={b.titulo} className="card mb" style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 14 }}>
          <div><span className="selo andamento">{b.tempo}</span></div>
          <div>
            <h3 style={{ margin: "0 0 6px" }}>{b.titulo}</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>{b.itens.map((i) => <li key={i} style={{ marginBottom: 4 }}>{i}</li>)}</ul>
          </div>
        </div>
      ))}

      {m.id === "individual" && (
        <>
          <div className="secao">O roteiro de cada pessoa</div>
          {!vs.length && <div className="card mudo">Cadastre a equipe em Minha equipe e lance o caixa por vendedora para o roteiro de cada uma aparecer aqui.</div>}
          <div className="grade g2">
            {vs.map((v) => {
              const r = roteiroIndividual(v);
              return (
                <div key={v.id} className="card">
                  <b style={{ fontSize: 16 }}>{v.nome}</b>
                  <p style={{ margin: "6px 0" }}><small className="mudo">Para abrir</small><br />{r.abrir}</p>
                  <p style={{ margin: "6px 0" }}><small className="mudo">Os números</small><br />{r.numeros}</p>
                  <p style={{ margin: "6px 0" }}><small className="mudo">O que está acontecendo</small><br />{r.situacao}</p>
                  {r.fala && <p style={{ margin: "6px 0" }}><small className="mudo">O que dizer</small><br />{r.fala}</p>}
                  <p style={{ margin: "6px 0 0" }}><small className="mudo">Para fechar</small><br />{r.fechar}</p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

export default function ReunioesProntas() {
  return <Suspense fallback={<Carregando />}><Reunioes /></Suspense>;
}
