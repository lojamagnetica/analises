"use client";

import Link from "next/link";
import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados } from "@/lib/hub";
import { dataHora, dia, diasDesde, haQuanto, hoje } from "@/lib/formato";
import { semanaDe } from "@/lib/leitura";
import { mesesDoInicio } from "@/lib/plano-mes";
import { supabaseBrowser } from "@/lib/supabase/client";

type Alerta = { txt: string; grave: boolean };

/** Lojas que precisam de você: quem está ficando para trás, antes de virar um áudio de desistência. */
export default function Acompanhamento() {
  const [filtro, setFiltro] = useState<"atencao" | "todas">("atencao");
  const { dados } = useDados(async () => {
    const sb = supabaseBrowser();
    const semana = semanaDe();
    const prox = mesesDoInicio().proximo;
    const [{ data: portais }, { data: perfis }, { data: caixa }, { data: leituras }, { data: reunioes }, { data: planos }] = await Promise.all([
      sb.from("portais").select("id, loja, tipo").eq("ativo", true).order("loja"),
      sb.from("perfis").select("portal_id, ultimo_acesso").not("portal_id", "is", null),
      sb.from("loja_caixa").select("portal_id, dia").gte("dia", semana),
      sb.from("loja_leituras").select("portal_id, semana").eq("semana", semana),
      sb.from("reunioes").select("portal_id, data").gte("data", new Date().toISOString()).order("data"),
      sb.from("loja_plano_mes").select("portal_id, status").eq("mes", prox),
    ]);
    return { portais: portais ?? [], perfis: perfis ?? [], caixa: caixa ?? [], leituras: leituras ?? [], reunioes: reunioes ?? [], planos: planos ?? [], semana, prox };
  }, []);
  if (!dados) return <Carregando />;

  const diaDoMes = Number(hoje().slice(8));
  const linhas = dados.portais.filter((p) => p.tipo !== "Curso").map((p) => {
    const acessos = dados.perfis.filter((x) => x.portal_id === p.id);
    const ultimo = acessos.map((x) => x.ultimo_acesso as string | null).filter(Boolean).sort().reverse()[0] ?? null;
    const prox = dados.reunioes.find((r) => r.portal_id === p.id);
    const plano = dados.planos.find((x) => x.portal_id === p.id);
    const al: Alerta[] = [];
    if (!acessos.length) al.push({ txt: "Acesso ao Hub ainda não criado", grave: false });
    else if (!ultimo) al.push({ txt: "Recebeu o acesso e nunca entrou", grave: true });
    else if (diasDesde(ultimo) >= 7) al.push({ txt: `Sem entrar no Hub há ${diasDesde(ultimo)} dias`, grave: true });
    if (acessos.length && !dados.caixa.some((c) => c.portal_id === p.id)) al.push({ txt: "Sem números lançados nesta semana", grave: true });
    if (!dados.leituras.some((x) => x.portal_id === p.id)) al.push({ txt: "Sem a leitura desta semana", grave: true });
    if (!prox) al.push({ txt: "Sem próxima reunião marcada", grave: true });
    if (p.tipo === "Mentoria" && diaDoMes >= 15 && !(plano && ["enviado", "ok"].includes(plano.status))) al.push({ txt: "Plano do próximo mês ainda não enviado", grave: diaDoMes >= 20 });
    return { p, ultimo, prox, al, graves: al.filter((a) => a.grave).length };
  }).sort((a, b) => b.graves - a.graves || a.p.loja.localeCompare(b.p.loja));
  const mostrar = filtro === "todas" ? linhas : linhas.filter((l) => l.graves > 0);
  const semLeitura = linhas.filter((l) => !dados.leituras.some((x) => x.portal_id === l.p.id)).length;

  return (
    <>
      <Titulo titulo="Lojas que precisam de você" sub="Quem está ficando para trás, antes de virar uma desistência: acesso, números da semana, a leitura da semana, a próxima reunião e o plano do mês." />
      <div className="grade g3 mb">
        <div className="kpi"><small>Lojas com algum alerta</small><b style={{ fontSize: 26, color: "var(--red)" }}>{linhas.filter((l) => l.graves).length}</b></div>
        <div className="kpi"><small>Sem a leitura da semana de {dia(dados.semana)}</small><b style={{ fontSize: 26 }}>{semLeitura}</b></div>
        <div className="kpi"><small>Sem próxima reunião</small><b style={{ fontSize: 26 }}>{linhas.filter((l) => !l.prox).length}</b></div>
      </div>
      <div className="chips mb">
        <button type="button" className={`chip${filtro === "atencao" ? " escolhido" : ""}`} onClick={() => setFiltro("atencao")}>Precisam de atenção</button>
        <button type="button" className={`chip${filtro === "todas" ? " escolhido" : ""}`} onClick={() => setFiltro("todas")}>Todas as lojas</button>
      </div>
      {!mostrar.length && <div className="card mudo">Nenhuma loja com alerta agora. 🎉</div>}
      <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {mostrar.map(({ p, ultimo, prox, al, graves }) => (
          <div key={p.id} className="card card-borda" style={{ ["--c" as string]: graves ? "var(--red)" : "var(--line)" }}>
            <div className="linha entre" style={{ gap: 8 }}><b style={{ fontSize: 16 }}>{p.loja}</b><small className="mudo">{p.tipo}</small></div>
            <small className="mudo">Último acesso: {ultimo ? haQuanto(ultimo) : "nunca"} · Próxima reunião: {prox ? dataHora(prox.data) : "nenhuma"}</small>
            <ul style={{ margin: "8px 0", paddingLeft: 18, fontSize: 14 }}>
              {al.map((a) => <li key={a.txt} style={{ color: a.grave ? "var(--red)" : "var(--muted)" }}>{a.txt}</li>)}
              {!al.length && <li className="mudo">Tudo em dia ✓</li>}
            </ul>
            <div className="linha" style={{ gap: 10, flexWrap: "wrap" }}>
              <Link className="btn p peq" href={`/inicio?portal=${p.id}`}>Escrever a leitura</Link>
              {!prox && <Link className="link-loja" href="/equipe/reunioes">Marcar reunião</Link>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
