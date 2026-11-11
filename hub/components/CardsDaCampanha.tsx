"use client";

// Cards do Programa Brasil, na área da campanha (Central do Cliente): Card do Mês e crachá do Destaque para o Instagram.
import { useState } from "react";
import { Carregando, useDados } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { hoje } from "@/lib/formato";
import { buscarRankingMentoria } from "@/lib/vez";
import { RESGATES } from "@/lib/programa-brasil";
import { DestaqueInstagram } from "@/components/DestaqueInstagram";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const PRETO = "#141210", OURO = "#D6AA54", LARANJA = "#BC4914", OFF = "#F5F0EA";

/** Mês anterior ao de uma data AAAA-MM-DD, no formato do primeiro dia do mês. */
const mesAnterior = (d: string) => { const [a, m] = d.split("-").map(Number); const x = new Date(a, m - 2, 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-01`; };
const proximoMes = (iso: string) => { const [a, m] = iso.split("-").map(Number); return MESES[m % 12]; };

function CardDoMes() {
  const [mes, setMes] = useState(mesAnterior(hoje()));
  const { dados } = useDados(() => buscarRankingMentoria(mes), [mes]);
  const nomeMes = MESES[Number(mes.slice(5, 7)) - 1];
  const ranking = (dados?.ranking ?? []).slice(0, 5);
  const ganhadora = (dados?.ranking ?? []).find((r) => r.elegivel);
  return (
    <>
      <div className="linha" style={{ gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
        <label className="ajuda" style={{ margin: 0 }}>Mês do card <input type="month" value={mes.slice(0, 7)} onChange={(e) => e.target.value && setMes(`${e.target.value}-01`)} /></label>
      </div>
      {!dados ? <Carregando /> : (
        <div style={{ background: PRETO, color: OFF, borderRadius: 18, padding: "22px 20px", maxWidth: 460 }}>
          <div style={{ fontSize: 11, letterSpacing: ".2em", color: OURO, fontWeight: 800 }}>PROGRAMA LOJA MAGNÉTICA · BRASIL</div>
          <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.05, margin: "8px 0 4px" }}>Card do Mês<br /><span style={{ color: OURO, fontStyle: "italic" }}>{nomeMes}</span> {mes.slice(0, 4)}</div>
          <div style={{ height: 3, background: LARANJA, margin: "12px 0" }} />
          <div style={{ fontSize: 11, letterSpacing: ".16em", color: OURO, fontWeight: 800 }}>LOJA MAGNÉTICA DO MÊS 🏆</div>
          <div style={{ fontSize: 26, fontWeight: 800, margin: "4px 0 14px" }}>{ganhadora ? ganhadora.loja : "Será que é você?"}</div>
          <div style={{ fontSize: 11, letterSpacing: ".16em", color: OURO, fontWeight: 800 }}>PLACAR BRASIL</div>
          {ranking.length === 0 && <p style={{ color: "#CFC5BB", fontSize: 14 }}>Nenhuma loja pontuou neste mês.</p>}
          {ranking.map((r, i) => (
            <div key={r.portal_id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderTop: "1px solid #3A342E", fontSize: 15 }}>
              <span><b style={{ color: OURO }}>{i + 1}</b>&nbsp; {r.loja}</span><b>{r.pontos.toLocaleString("pt-BR")}</b>
            </div>
          ))}
          <div style={{ fontSize: 11, letterSpacing: ".16em", color: OURO, fontWeight: 800, marginTop: 16 }}>RESGATES DE PRÊMIO</div>
          {RESGATES.map((r) => <div key={r.quando} style={{ fontSize: 13, padding: "5px 0", color: "#E6DCD0" }}><b style={{ color: OURO }}>{r.quando}</b> · {r.premio}</div>)}
          <div style={{ fontSize: 11, letterSpacing: ".16em", color: OURO, fontWeight: 800, marginTop: 16 }}>MISSÃO DE {proximoMes(mes).toUpperCase()}</div>
          <div style={{ fontSize: 13, color: "#E6DCD0", padding: "4px 0" }}>Caixa lançado todo sábado · planejamento com a meta até o dia 5 · feedback individual no meio do mês · missão da semana enviada pelo Hub todo dia</div>
        </div>
      )}
      <p className="ajuda">O placar usa os pontos do Hub no mês escolhido. Pilares (Gestão, Execução e Resultado) entram quando o placar do mês estiver completo.</p>
    </>
  );
}

export function CardsDaCampanha() {
  const { dados } = useDados(async () => {
    const { data } = await supabaseBrowser().from("loja_equipe").select("id, nome, loja, foto").eq("ativo", true).not("loja", "is", null).order("nome");
    return (data ?? []) as { id: string; nome: string; loja: string | null; foto: string | null }[];
  }, []);
  return (
    <>
      <div className="secao">Cards da campanha</div>
      <div className="card mb"><b>Card do Mês</b><p className="ajuda" style={{ marginTop: 2 }}>Apresentado todo mês na reunião em grupo.</p><CardDoMes /></div>
      <div className="card mb">
        <b>Crachá do Destaque (Instagram)</b>
        <p className="ajuda" style={{ marginTop: 2 }}>Sem valor de prêmio. Escolha a pessoa, suba a foto na Gamificação da loja e baixe a imagem.</p>
        {!dados ? <Carregando /> : <DestaqueInstagram pessoas={dados.map((d) => ({ id: d.id, nome: d.nome.split(" ")[0], loja: d.loja, foto: d.foto }))} />}
      </div>
      <div className="card mb"><b>Card de Resultado da loja</b><p className="ajuda" style={{ marginBottom: 0 }}>Gerado pelo Hub para a loja postar e ganhar 20 pontos. Em construção.</p></div>
    </>
  );
}
