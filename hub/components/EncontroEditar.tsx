"use client";

import { useState } from "react";
import { Carregando, useDados } from "@/lib/hub";
import { dataHora } from "@/lib/formato";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ENCONTRO_PADRAO, proximoEncontro, salvarEncontro, type EncontroGrupo } from "@/lib/encontro";

/** Equipe: o link fixo e a data do encontro em grupo da mentoria (aparece no Início de todas as mentoradas). */
export function EncontroEditar() {
  const { dados } = useDados(async () => {
    const { data } = await supabaseBrowser().from("hub_config").select("valor").eq("chave", "encontro_grupo").maybeSingle();
    return { ...ENCONTRO_PADRAO, ...((data?.valor ?? {}) as Partial<EncontroGrupo>) };
  }, []);
  const [e, setE] = useState<EncontroGrupo | null>(null);
  const [aviso, setAviso] = useState("");
  if (!dados) return <Carregando />;
  const v = e ?? dados;
  const muda = (x: Partial<EncontroGrupo>) => { setE({ ...v, ...x }); setAviso(""); };
  const prox = v.link && v.primeiro ? proximoEncontro(v) : null;

  return (
    <form className="card card-borda mb" style={{ ["--c" as string]: "var(--purple)" }} onSubmit={async (ev) => {
      ev.preventDefault();
      try { await salvarEncontro(v); setAviso("Salvo. Já aparece no Início e em Reuniões de todas as mentoradas."); } catch (x) { setAviso((x as Error).message); }
    }}>
      <h3 style={{ marginTop: 0 }}>👥 Encontro em grupo da mentoria</h3>
      <p className="ajuda" style={{ marginTop: -4 }}>Um link fixo do Meet para todas as mentoradas. O Hub calcula sozinho a data do próximo encontro e mostra o botão &quot;Entrar na sala&quot;.</p>
      <div className="grade g2" style={{ gap: "0 12px" }}>
        <div><label className="rotulo" htmlFor="eg-titulo">Nome</label><input id="eg-titulo" type="text" value={v.titulo} onChange={(x) => muda({ titulo: x.target.value })} /></div>
        <div><label className="rotulo" htmlFor="eg-link">Link fixo do Meet</label><input id="eg-link" type="url" required placeholder="https://meet.google.com/…" value={v.link} onChange={(x) => muda({ link: x.target.value })} /></div>
        <div><label className="rotulo" htmlFor="eg-data">Data e hora de um encontro (o próximo ou o último)</label><input id="eg-data" type="datetime-local" required value={v.primeiro} onChange={(x) => muda({ primeiro: x.target.value })} /></div>
        <div>
          <label className="rotulo" htmlFor="eg-int">Repete</label>
          <select id="eg-int" value={v.intervalo} onChange={(x) => muda({ intervalo: Number(x.target.value) })}>
            <option value={7}>Toda semana</option>
            <option value={14}>A cada 15 dias (de 2 em 2 semanas, mesmo dia da semana)</option>
            <option value={28}>A cada 4 semanas</option>
          </select>
        </div>
      </div>
      {prox && <p className="mt">Próximo encontro: <b style={{ textTransform: "capitalize" }}>{dataHora(prox.iso)}</b></p>}
      {aviso && <div className="aviso ok mt">{aviso}</div>}
      <div className="linha mt" style={{ gap: 8 }}>
        <button className="btn p peq" type="submit">Salvar</button>
        {v.link && <button className="btn s peq" type="button" onClick={async () => {
          if (!confirm("Tirar o encontro em grupo do Hub? As mentoradas deixam de ver o botão.")) return;
          const vazio = { ...v, link: "", primeiro: "" };
          await salvarEncontro(vazio); setE(vazio); setAviso("Encontro em grupo tirado do Hub.");
        }}>Tirar do Hub</button>}
      </div>
    </form>
  );
}
