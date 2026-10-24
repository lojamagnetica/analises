"use client";

import { useState } from "react";
import { useDados } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { erroDaFuncao } from "@/lib/supabase/client";
import { atualizarAgora } from "@/lib/agenda";

type Status = { tem: boolean; email: string | null };

/** Caixa para colar a chave do Google. O Hub confere se o Google aceita antes de guardar; só a equipe usa. */
export function ConectarGoogle({ aoSalvar }: { aoSalvar: () => void }) {
  const { dados, recarregar } = useDados(async () => {
    const { data } = await supabaseBrowser().functions.invoke("agenda-chave", { body: { acao: "status" } });
    return (data ?? { tem: false, email: null }) as Status;
  }, []);
  const [texto, setTexto] = useState("");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [trocando, setTrocando] = useState(false);

  async function guardar() {
    setSalvando(true); setErro(""); setMsg("");
    try {
      const { data, error } = await supabaseBrowser().functions.invoke("agenda-chave", { body: { chave: texto } });
      if (error) throw new Error(await erroDaFuncao(error));
      setTexto(""); setTrocando(false);
      const leitura = await atualizarAgora();
      setMsg(`Chave guardada (conta ${(data as { email: string }).email}). ${leitura ? `Primeira leitura: ${leitura}` : "A agenda já foi lida."}`);
      recarregar(); aoSalvar();
    } catch (e) { setErro((e as Error).message); }
    setSalvando(false);
  }

  const mostrarCaixa = !dados?.tem || trocando;
  return (
    <details className="card mt" open={!dados?.tem || !!erro || !!msg}>
      <summary style={{ cursor: "pointer" }}><b>Google Agenda: atualização automática</b> {dados?.tem ? <span className="selo feito">chave guardada</span> : <span className="selo alerta">falta a chave</span>}</summary>
      <div className="mt">
        {dados?.tem && <p className="mudo" style={{ marginTop: 0 }}>Conta de serviço: <b>{dados.email}</b>. As duas agendas precisam estar compartilhadas com esse e-mail, com a permissão <b>Ver todos os detalhes do evento</b>. O Hub lê o Google sozinho a cada poucos minutos.</p>}
        {mostrarCaixa ? (
          <>
            <p className="ajuda" style={{ marginTop: 0 }}>
              Abra o arquivo da chave (o .json que o Google baixou) no TextEdit ou no Bloco de Notas, aperte <b>⌘/Ctrl + A</b> e depois <b>⌘/Ctrl + C</b>, cole aqui e clique em Guardar.
              A chave vai direto para o banco do Hub; só a equipe usa. Depois de guardar, apague o arquivo do computador.
            </p>
            <textarea id="chave-google" rows={5} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder='Cole aqui o conteúdo do arquivo, que começa com { "type": "service_account"…' autoComplete="off" spellCheck={false} />
            <div className="linha mt">
              <button type="button" className="btn p" disabled={salvando || !texto.trim()} onClick={guardar}>{salvando ? "Conferindo com o Google…" : "Guardar a chave"}</button>
              {trocando && <button type="button" className="btn s" onClick={() => { setTrocando(false); setTexto(""); }}>Cancelar</button>}
            </div>
          </>
        ) : (
          <div className="linha"><button type="button" className="btn s peq" onClick={() => setTrocando(true)}>Trocar a chave</button></div>
        )}
        {erro && <div className="aviso mt">{erro}</div>}
        {msg && <div className="aviso ok mt">{msg}</div>}
      </div>
    </details>
  );
}
