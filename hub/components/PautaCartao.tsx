"use client";

import Link from "next/link";
import { useState } from "react";
import { hoje } from "@/lib/formato";
import { COR_OBJETIVO, postsCriar } from "@/lib/instagram";
import { postDaPauta, type Pauta } from "@/lib/pautas";

/** Uma pauta quente: o assunto, o porquê, o ângulo e os botões para usar na semana da loja. */
export function PautaCartao({ p, portalId, hora, compacta, aoColocar }: { p: Pauta; portalId: string; hora: string; compacta?: boolean; aoColocar?: () => void }) {
  const [escolhendo, setEscolhendo] = useState(false);
  const [data, setData] = useState(hoje());
  const [ok, setOk] = useState("");
  const [erro, setErro] = useState("");
  return (
    <div className="card card-borda" style={{ ["--c" as string]: COR_OBJETIVO[p.objetivo], display: "flex", flexDirection: "column", gap: 6, padding: compacta ? 14 : undefined }}>
      <div className="linha entre" style={{ gap: 6 }}>
        <b>🔥 {p.titulo}</b>
        <span className="selo espera" style={{ fontSize: 11 }}>{p.objetivo}</span>
      </div>
      {!compacta && p.porque && <p className="mudo" style={{ margin: 0, fontSize: 14 }}><b>Por que agora:</b> {p.porque}</p>}
      {p.angulo && <p style={{ margin: 0, fontSize: 14 }}>{compacta ? p.angulo.split(/(?<=[.!?])\s|\n/)[0] : <><b>Como a sua loja entra:</b> {p.angulo}</>}</p>}
      {ok ? <div className="aviso ok">{ok}</div> : escolhendo ? (
        <div className="linha" style={{ gap: 6 }}>
          <input type="date" value={data} min={hoje()} onChange={(e) => setData(e.target.value)} style={{ maxWidth: 170 }} aria-label="Dia do post" />
          <button type="button" className="btn p peq" onClick={async () => {
            setErro("");
            try { await postsCriar([postDaPauta(p, portalId, data, hora)]); setOk(`Post criado em ${data.split("-").reverse().join("/")}. Abra na Programação para ajustar com as suas peças.`); aoColocar?.(); }
            catch (e) { setErro((e as Error).message); }
          }}>Criar o post</button>
          <button type="button" className="btn s peq" onClick={() => setEscolhendo(false)}>Cancelar</button>
        </div>
      ) : (
        <div className="linha" style={{ gap: 6, marginTop: "auto" }}>
          <button type="button" className="btn p peq" onClick={() => setEscolhendo(true)}>Colocar na minha semana</button>
          <Link className="btn s peq" href={`/conteudo/roteiro?pauta=${p.id}`}>Criar roteiro</Link>
        </div>
      )}
      {erro && <div className="aviso">{erro}</div>}
    </div>
  );
}
