"use client";

import { useEffect, useRef, useState } from "react";
import { Icone } from "@/components/Icone";
import { linkAudio, type Envio } from "@/lib/assistente";

type Reconhecimento = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
  start: () => void; stop: () => void;
};

function novoReconhecimento(): Reconhecimento | null {
  const w = window as unknown as { SpeechRecognition?: new () => Reconhecimento; webkitSpeechRecognition?: new () => Reconhecimento };
  const R = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!R) return null;
  const r = new R();
  r.lang = "pt-BR"; r.continuous = true; r.interimResults = true;
  return r;
}

const relogio = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const MAX_SEGUNDOS = 5 * 60;

/** Caixa de mensagem com texto e áudio. O áudio é gravado no navegador e, quando o navegador permite, já sai escrito. */
export function Escrever(props: { rotulo: string; placeholder: string; enviar: (e: Envio) => Promise<void>; antes?: React.ReactNode }) {
  const [texto, setTexto] = useState("");
  const [audio, setAudio] = useState<Blob | null>(null);
  const [transcricao, setTranscricao] = useState("");
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const rec = useRef<MediaRecorder | null>(null);
  const fala = useRef<Reconhecimento | null>(null);
  const finais = useRef("");
  const relogioRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const urlPrevia = useRef<string | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);

  useEffect(() => () => { parar(); if (urlPrevia.current) URL.revokeObjectURL(urlPrevia.current); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (gravando && segundos >= MAX_SEGUNDOS) parar(); }, [gravando, segundos]); // eslint-disable-line react-hooks/exhaustive-deps

  function parar() {
    if (relogioRef.current) clearInterval(relogioRef.current);
    relogioRef.current = null;
    if (rec.current?.state === "recording") rec.current.stop();
    try { fala.current?.stop(); } catch { /* já parado */ }
    setGravando(false);
  }

  async function gravar() {
    setErro("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setErro("Este navegador não grava áudio. Escreva a mensagem ou abra pelo Chrome.");
      return;
    }
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { setErro("Libere o microfone para o Hub no navegador e tente de novo."); return; }
    const pedacos: Blob[] = [];
    const m = new MediaRecorder(stream);
    m.ondataavailable = (e) => { if (e.data.size) pedacos.push(e.data); };
    m.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const b = new Blob(pedacos, { type: m.mimeType || "audio/webm" });
      setAudio(b);
      if (urlPrevia.current) URL.revokeObjectURL(urlPrevia.current);
      urlPrevia.current = URL.createObjectURL(b);
      setPrevia(urlPrevia.current);
    };
    rec.current = m;
    m.start();
    finais.current = "";
    setTranscricao("");
    const r = novoReconhecimento();
    if (r) {
      r.onresult = (e) => {
        let parcial = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) finais.current += t + " ";
          else parcial += t;
        }
        setTranscricao((finais.current + parcial).trim());
      };
      r.onerror = () => { /* segue só com o áudio */ };
      try { r.start(); fala.current = r; } catch { fala.current = null; }
    }
    setSegundos(0);
    setGravando(true);
    relogioRef.current = setInterval(() => setSegundos((s) => s + 1), 1000);
  }

  function descartar() {
    setAudio(null); setTranscricao(""); setPrevia(null);
    if (urlPrevia.current) URL.revokeObjectURL(urlPrevia.current);
    urlPrevia.current = null;
  }

  async function enviar() {
    setErro(""); setEnviando(true);
    try {
      await props.enviar({ texto, audio, transcricao });
      setTexto(""); descartar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não deu para enviar. Tente de novo.");
    }
    setEnviando(false);
  }

  return (
    <div className="escrever">
      {props.antes}
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={props.placeholder} rows={3} />
      {gravando && (
        <div className="gravando mt">
          <span className="ponto-rec" /> Gravando {relogio(segundos)}
          {transcricao && <small className="mudo" style={{ display: "block", marginTop: 4 }}>{transcricao}</small>}
        </div>
      )}
      {!gravando && previa && (
        <div className="mt">
          <audio controls src={previa} style={{ width: "100%", maxWidth: 420 }} />
          {transcricao && <p className="ajuda" style={{ margin: "4px 0 0" }}>Escrito do áudio: {transcricao}</p>}
        </div>
      )}
      {erro && <div className="aviso mt">{erro}</div>}
      <div className="linha mt" style={{ gap: 8, flexWrap: "wrap" }}>
        {gravando
          ? <button type="button" className="btn s peq" onClick={parar}><Icone nome="stop" /> Parar</button>
          : previa
            ? <button type="button" className="btn s peq" onClick={descartar}><Icone nome="trash" /> Apagar áudio</button>
            : <button type="button" className="btn s peq" onClick={gravar}><Icone nome="mic" /> Gravar áudio</button>}
        <button type="button" className="btn p peq" disabled={enviando || gravando || (!texto.trim() && !audio)} onClick={enviar}>
          <Icone nome="send" /> {enviando ? "Enviando…" : props.rotulo}
        </button>
      </div>
    </div>
  );
}

/** Toca um áudio guardado no Hub (o link é gerado na hora e vale por uma hora). */
export function Ouvir({ caminho, transcricao }: { caminho: string; transcricao?: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const [falhou, setFalhou] = useState(false);
  useEffect(() => {
    let vivo = true;
    linkAudio(caminho).then((u) => { if (!vivo) return; if (u) setUrl(u); else setFalhou(true); });
    return () => { vivo = false; };
  }, [caminho]);
  return (
    <div style={{ marginTop: 6 }}>
      {url ? <audio controls preload="metadata" src={url} style={{ width: "100%", maxWidth: 420 }} />
        : <small className="mudo">{falhou ? "Áudio indisponível." : "Carregando o áudio…"}</small>}
      {transcricao && <p className="ajuda" style={{ margin: "4px 0 0" }}>“{transcricao}”</p>}
    </div>
  );
}
