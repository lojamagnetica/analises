"use client";

import { useState } from "react";
import { Carregando, useDados } from "@/lib/hub";
import { ROTULO_TEMPO, buscarLinhaDoTempo } from "@/lib/gestao-clientes";
import { dataCurta, dataHora, haQuanto } from "@/lib/formato";

const PASSO = 15;

/** Tudo o que aconteceu com a cliente, em ordem de data. Só a equipe vê. */
export function LinhaDoTempo({ portalId }: { portalId: string }) {
  const { dados } = useDados(() => buscarLinhaDoTempo(portalId), [portalId]);
  const [mostrar, setMostrar] = useState(PASSO);
  if (!dados) return <Carregando />;
  const agora = new Date().toISOString();

  return (
    <div className="card mt" id="linha-do-tempo">
      <h2>Linha do tempo</h2>
      <p className="mudo" style={{ marginTop: 0 }}>Venda, contrato, etapas, reuniões e mensagens desta cliente, do mais recente para o mais antigo.</p>
      {dados.length === 0 && <p className="mudo">Nada registrado ainda.</p>}
      {dados.slice(0, mostrar).map((e) => (
        <div key={e.id} className="linha entre marcar" style={{ cursor: "default" }}>
          <span>
            <span className={`selo ${ROTULO_TEMPO[e.tipo].selo}`}>{ROTULO_TEMPO[e.tipo].rotulo}</span> {e.texto}
            {e.quem && <span className="mudo"> · {e.quem}</span>}
          </span>
          <span className="mudo" style={{ whiteSpace: "nowrap" }} title={dataHora(e.quando)}>
            {e.quando > agora ? <><span style={{ textTransform: "capitalize" }}>{e.soDia ? dataCurta(e.quando) : dataHora(e.quando)}</span> <span className="selo andamento">agendado</span></> : haQuanto(e.quando)}
          </span>
        </div>
      ))}
      {dados.length > mostrar && <button type="button" className="btn s peq mt" onClick={() => setMostrar(mostrar + PASSO)}>Ver mais</button>}
    </div>
  );
}
