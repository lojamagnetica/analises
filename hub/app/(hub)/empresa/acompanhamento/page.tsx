"use client";

import Link from "next/link";
import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { dataHora, dia, diasDesde, haQuanto, hoje } from "@/lib/formato";
import { montarRascunho, semanaDe, semanaPassada } from "@/lib/leitura";
import { mesesDoInicio } from "@/lib/plano-mes";
import { supabaseBrowser } from "@/lib/supabase/client";

type Alerta = { txt: string; grave: boolean };

/** Lojas que precisam de você: quem está ficando para trás, antes de virar um áudio de desistência. */
export default function Acompanhamento() {
  const { abrirPortal } = useEquipe();
  const [filtro, setFiltro] = useState<"atencao" | "todas">("atencao");
  const [montando, setMontando] = useState(false);
  const [msg, setMsg] = useState("");
  const { dados } = useDados(async () => {
    const sb = supabaseBrowser();
    const semana = semanaDe();
    const prox = mesesDoInicio().proximo;
    const [{ data: portais }, { data: perfis }, { data: caixa }, { data: leituras }, { data: reunioes }, { data: planos }, { data: fichas }, { data: planosNome }, { data: contratos }] = await Promise.all([
      sb.from("portais").select("id, loja, tipo, menu_oculto").eq("ativo", true).order("loja"),
      sb.from("perfis").select("portal_id, ultimo_acesso").not("portal_id", "is", null),
      sb.from("loja_caixa").select("portal_id, dia").gte("dia", semana),
      sb.from("loja_leituras").select("portal_id, semana, publicada").eq("semana", semana),
      sb.from("reunioes").select("portal_id, data").gte("data", new Date().toISOString()).order("data"),
      sb.from("loja_plano_mes").select("portal_id, status").eq("mes", prox),
      sb.from("fichas").select("portal_id, plano_id"),
      sb.from("planos").select("id, nome, inclui"),
      sb.from("contratos").select("portal_id, plano_id, inicio").order("inicio", { ascending: false }),
    ]);
    const { data: numeros } = await sb.from("loja_numeros_semana").select("portal_id").eq("semana", semanaPassada());
    // O plano de cada loja (da ficha ou do último contrato) e quando começou.
    const planoDe = (id: string) => {
      const c = (contratos ?? []).find((x) => x.portal_id === id);
      const pid = (fichas ?? []).find((x) => x.portal_id === id)?.plano_id ?? c?.plano_id;
      const pl = (planosNome ?? []).find((x) => x.id === pid);
      return { nome: pl?.nome ?? "", reunioes: ((pl?.inclui as { reunioes?: string } | null)?.reunioes ?? ""), inicio: (c?.inicio as string | null) ?? null };
    };
    return { numeros: numeros ?? [], portais: portais ?? [], perfis: perfis ?? [], caixa: caixa ?? [], leituras: leituras ?? [], reunioes: reunioes ?? [], planos: planos ?? [], semana, prox, planoDe };
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
    // Loja sem a Gestão no menu manda os números da semana; as outras lançam o caixa.
    if (acessos.length && (p.menu_oculto ?? []).includes("gestao")) {
      if (!dados.numeros.some((x) => x.portal_id === p.id)) al.push({ txt: "Não mandou os números da semana passada", grave: true });
    } else if (acessos.length && !dados.caixa.some((c) => c.portal_id === p.id)) al.push({ txt: "Sem caixa lançado nesta semana", grave: true });
    const leit = dados.leituras.find((x) => x.portal_id === p.id);
    if (!leit) al.push({ txt: "Sem a leitura desta semana", grave: true });
    else if (!leit.publicada) al.push({ txt: "Rascunho da leitura pronto: revisar e publicar", grave: true });
    // A reunião individual segue o que o plano inclui (Minha empresa › Planos). "Só no início": até 35 dias do começo.
    const pl = dados.planoDe(p.id);
    const individual = ["semanal", "quinzenal", "mensal"].includes(pl.reunioes) || (pl.reunioes !== "nenhuma" && !!pl.inicio && diasDesde(pl.inicio) <= 35)
      || (!pl.reunioes && p.tipo === "Consultoria");
    if (!prox && individual) al.push({ txt: "Sem próxima reunião individual marcada", grave: true });
    if (p.tipo === "Mentoria" && diaDoMes >= 15 && !(plano && ["enviado", "ok"].includes(plano.status))) al.push({ txt: "Plano do próximo mês ainda não enviado", grave: diaDoMes >= 20 });
    return { p, ultimo, prox, al, graves: al.filter((a) => a.grave).length, plano: pl.nome, individual };
  }).sort((a, b) => b.graves - a.graves || a.p.loja.localeCompare(b.p.loja));
  const mostrar = filtro === "todas" ? linhas : linhas.filter((l) => l.graves > 0);
  const semLeitura = linhas.filter((l) => !dados.leituras.some((x) => x.portal_id === l.p.id && x.publicada)).length;

  return (
    <>
      <Titulo titulo="Lojas que precisam de você" sub="Quem está ficando para trás, antes de virar uma desistência: acesso, números da semana, a leitura da semana, a próxima reunião e o plano do mês." />
      <div className="grade g3 mb">
        <div className="kpi"><small>Lojas com algum alerta</small><b style={{ fontSize: 26, color: "var(--red)" }}>{linhas.filter((l) => l.graves).length}</b></div>
        <div className="kpi"><small>Sem leitura publicada na semana de {dia(dados.semana)}</small><b style={{ fontSize: 26 }}>{semLeitura}</b></div>
        <div className="kpi"><small>Sem reunião individual marcada (planos com reunião)</small><b style={{ fontSize: 26 }}>{linhas.filter((l) => !l.prox && l.individual).length}</b></div>
      </div>
      <div className="card mb linha entre" style={{ gap: 10, flexWrap: "wrap" }}>
        <span><b>Segunda à tarde: as devolutivas.</b> <span className="mudo">Toda segunda às 12h o Hub monta o rascunho da leitura de cada loja com os números. Você revisa e publica no Início de cada uma.</span></span>
        <button type="button" className="btn s peq" disabled={montando} onClick={async () => {
          setMontando(true); setMsg("");
          try { const r = await montarRascunho({ todas: true }); setMsg(`Montando os rascunhos de ${r.lojas ?? 0} lojas. Em alguns minutos estão prontos: atualize a página.`); } catch (e) { setMsg((e as Error).message); }
          setMontando(false);
        }}>{montando ? "Pedindo…" : "✨ Montar os rascunhos agora"}</button>
        {msg && <small className="mudo" style={{ width: "100%" }}>{msg}</small>}
      </div>
      <div className="chips mb">
        <button type="button" className={`chip${filtro === "atencao" ? " escolhido" : ""}`} onClick={() => setFiltro("atencao")}>Precisam de atenção</button>
        <button type="button" className={`chip${filtro === "todas" ? " escolhido" : ""}`} onClick={() => setFiltro("todas")}>Todas as lojas</button>
      </div>
      {!mostrar.length && <div className="card mudo">Nenhuma loja com alerta agora. 🎉</div>}
      <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {mostrar.map(({ p, ultimo, prox, al, graves, plano, individual }) => (
          <div key={p.id} className="card card-borda" style={{ ["--c" as string]: graves ? "var(--red)" : "var(--line)" }}>
            <div className="linha entre" style={{ gap: 8 }}><b style={{ fontSize: 16 }}>{p.loja}</b><small className="mudo">{plano || p.tipo}</small></div>
            <small className="mudo">Último acesso: {ultimo ? haQuanto(ultimo) : "nunca"} · {individual ? `Próxima reunião: ${prox ? dataHora(prox.data) : "nenhuma"}` : "Encontros em grupo"}</small>
            <ul style={{ margin: "8px 0", paddingLeft: 18, fontSize: 14 }}>
              {al.map((a) => <li key={a.txt} style={{ color: a.grave ? "var(--red)" : "var(--muted)" }}>{a.txt}</li>)}
              {!al.length && <li className="mudo">Tudo em dia ✓</li>}
            </ul>
            <div className="linha" style={{ gap: 10, flexWrap: "wrap" }}>
              <button type="button" className="btn p peq" onClick={() => abrirPortal(p.id, "/inicio")}>Revisar a leitura</button>
              {!prox && individual && <Link className="link-loja" href="/equipe/reunioes">Marcar reunião</Link>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
