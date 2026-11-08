"use client";

import { Titulo } from "@/components/Titulo";
import { Copiar } from "@/components/Copiar";
import { BASE } from "@/lib/config";
import { GUIAS, linkGuia } from "@/lib/guias";

export default function GuiasEmVideo() {
  return (
    <>
      <Titulo titulo="Guias em vídeo" sub="Vídeos de passo a passo para mandar às lojas. Qualquer pessoa da equipe pode assistir, baixar ou enviar o link pelo WhatsApp." />
      <div className="grade g2" style={{ gap: 16 }}>
        {GUIAS.map((g) => {
          const link = linkGuia(g);
          const texto = `Oi! Aqui está o passo a passo em vídeo: ${g.para}\n${link}`;
          return (
            <div key={g.id} className="card">
              <h3 style={{ marginTop: 0 }}>{g.titulo}</h3>
              <p className="mudo" style={{ marginTop: -4 }}>{g.para} · {g.duracao}</p>
              <video src={`${BASE}/video/${g.arquivo}`} poster={`${BASE}/video/primeiro-acesso.jpg`} controls playsInline preload="none"
                style={{ width: "100%", maxWidth: 320, borderRadius: 12, display: "block", background: "#141210" }} />
              <div className="linha mt" style={{ gap: 8, flexWrap: "wrap" }}>
                <a className="btn p peq" href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener">Enviar no WhatsApp</a>
                <Copiar texto={link} rotulo="Copiar link" />
                <a className="btn s peq" href={`${BASE}/video/${g.arquivo}`} download>Baixar</a>
              </div>
            </div>
          );
        })}
      </div>
      <p className="ajuda mt">Na Central, a mensagem do link de acesso já vai com os dois vídeos (iPhone e Android).</p>
    </>
  );
}
