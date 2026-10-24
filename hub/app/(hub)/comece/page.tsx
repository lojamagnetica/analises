"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, primeiroNome, useDados, usePortal } from "@/lib/hub";
import { buscarVideo, idYoutube, marcarVideoVisto, salvarVideo, type VideoBoasVindas } from "@/lib/entrada";

type YTPlayer = { destroy: () => void };
type YTWindow = Window & {
  YT?: { Player: new (el: string, o: object) => YTPlayer };
  onYouTubeIframeAPIReady?: () => void;
};

const PASSOS = [
  { n: 1, titulo: "Assistir a este vídeo", abre: "Dados da loja e Minha equipe" },
  { n: 2, titulo: "Preencher os Dados da loja", abre: "Painel da loja, Gestão estratégica e Vendas" },
  { n: 3, titulo: "Cadastrar a sua equipe", abre: "Gestão de pessoas" },
];

/** Vídeo do YouTube que avisa quando terminou. Se a API do YouTube não carregar, vale o tempo do vídeo. */
function Video({ v, aoTerminar }: { v: VideoBoasVindas; aoTerminar: () => void }) {
  const yt = idYoutube(v.url);
  const [restam, setRestam] = useState<number | null>(yt ? null : v.segundos);
  const fim = useRef(aoTerminar);
  fim.current = aoTerminar;

  useEffect(() => {
    if (!yt) return;
    const w = window as YTWindow;
    let player: YTPlayer | null = null;
    const criar = () => {
      player = new w.YT!.Player("video-boas-vindas", {
        videoId: yt,
        playerVars: { rel: 0, playsinline: 1, modestbranding: 1 },
        events: { onStateChange: (e: { data: number }) => { if (e.data === 0) fim.current(); } },
      });
    };
    if (w.YT?.Player) criar();
    else {
      w.onYouTubeIframeAPIReady = criar;
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const s = document.createElement("script");
        s.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(s);
      }
    }
    const reserva = setTimeout(() => { if (!w.YT?.Player) setRestam(v.segundos); }, 10000);
    return () => { clearTimeout(reserva); player?.destroy(); };
  }, [yt, v.segundos]);

  useEffect(() => {
    if (restam === null) return;
    if (restam <= 0) { fim.current(); return; }
    const t = setTimeout(() => setRestam(restam - 1), 1000);
    return () => clearTimeout(t);
  }, [restam]);

  return (
    <>
      <div style={{ position: "relative", width: "100%", maxWidth: "100%", aspectRatio: "16 / 9", borderRadius: 16, overflow: "hidden", background: "#000" }}>
        {yt && restam === null
          ? <div id="video-boas-vindas" style={{ width: "100%", height: "100%" }} />
          : <iframe src={yt ? `https://www.youtube.com/embed/${yt}?rel=0&playsinline=1` : v.url} title="Vídeo de boas-vindas" allow="autoplay; encrypted-media; fullscreen" allowFullScreen style={{ border: 0, width: "100%", height: "100%" }} />}
      </div>
      {restam !== null && restam > 0 && <p className="ajuda">O botão para seguir libera em {Math.floor(restam / 60)}:{String(restam % 60).padStart(2, "0")}.</p>}
    </>
  );
}

/** Equipe: o link do vídeo de boas-vindas, que vale para todas as lojas. */
function ConfigVideo({ v, aoSalvar }: { v: VideoBoasVindas | null; aoSalvar: () => void }) {
  const [ok, setOk] = useState("");
  return (
    <form className="card mb" action={async (f) => {
      setOk("");
      try { await salvarVideo(String(f.get("url") ?? ""), Number(f.get("segundos"))); setOk("Vídeo salvo para todas as lojas."); aoSalvar(); } catch (e) { setOk((e as Error).message); }
    }}>
      <h3 style={{ marginTop: 0 }}>Vídeo de boas-vindas (só a equipe vê esta caixa)</h3>
      <div className="grade g2" style={{ gap: 12 }}>
        <div><label className="rotulo" htmlFor="url">Link do vídeo</label><input id="url" name="url" type="url" defaultValue={v?.url ?? ""} placeholder="https://youtu.be/…" /></div>
        <div><label className="rotulo" htmlFor="segundos">Duração (segundos)</label><input id="segundos" name="segundos" type="number" defaultValue={v?.segundos ?? 120} /></div>
      </div>
      <p className="ajuda">Use YouTube (pode ser "não listado"): o Hub sabe quando o vídeo terminou e só então libera o botão. Com outro link, o botão libera depois da duração informada.</p>
      {ok && <div className="aviso ok mt">{ok}</div>}
      <button className="btn p peq mt" type="submit">Salvar vídeo</button>
    </form>
  );
}

export default function Comece() {
  const router = useRouter();
  const hub = usePortal();
  const { portal, entrada, equipe, comoLoja, pers, nome } = hub;
  const [terminou, setTerminou] = useState(false);
  const [indo, setIndo] = useState(false);
  const { dados, recarregar } = useDados(async () => ({ v: await buscarVideo() }), []);
  if (!dados) return <Carregando />;
  const v = dados.v;
  const visto = !!entrada?.video;
  const pode = visto || terminou || !v;
  const quem = (typeof pers.get(2)?.respostas?.seu_nome === "string" && (pers.get(2)?.respostas?.seu_nome as string)) || (comoLoja ? portal.responsavel : null) || primeiroNome(nome);

  const comecar = async () => {
    setIndo(true);
    if (!visto) await marcarVideoVisto(portal.id, comoLoja);
    await hub.recarregar();
    router.push("/personalizacao");
  };

  return (
    <>
      <Titulo titulo="Comece aqui" sub={`O primeiro passo no Hub da ${portal.loja}.`} />
      {equipe && <ConfigVideo v={v} aoSalvar={recarregar} />}
      <div className="grade g2" style={{ alignItems: "start" }}>
        <div className="card" style={{ minWidth: 0 }}>
          <h2 style={{ marginTop: 0 }}>Que bom ter você aqui{quem ? `, ${quem}` : ""}! 🥂</h2>
          {v ? <Video v={v} aoTerminar={() => setTerminou(true)} /> : (
            <p>Este é o Hub da sua loja: tudo da sua jornada em um lugar só. Antes de qualquer coisa, entenda a ordem. Cada etapa prepara a próxima, e o Hub só funciona bem quando conhece a sua loja de verdade.</p>
          )}
          <p className="mudo"><b>Não pule etapas.</b> Você já consegue ver tudo o que existe no menu, mas cada área abre quando a etapa anterior estiver feita. É assim que o Plano, os scripts e os números ficam certos para a sua loja.</p>
          <button className="btn p mt" type="button" disabled={!pode || indo} onClick={comecar}>
            {indo ? "Abrindo…" : visto ? "Ir para os Dados da loja" : pode ? "Assisti, quero começar" : "Assista até o fim para seguir"}
          </button>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>A sua entrada, em 3 passos</h3>
          {PASSOS.map((p) => {
            const feito = p.n === 1 ? visto : p.n === 2 ? !!entrada?.loja : !!entrada?.equipe;
            return (
              <div key={p.n} className="marcar" style={{ cursor: "default", alignItems: "flex-start", gap: 12 }}>
                <span className={`selo ${feito ? "feito" : "espera"}`}>{feito ? "✓" : p.n}</span>
                <div><b>{p.titulo}</b><div className="mudo" style={{ fontSize: 13 }}>Abre: {p.abre}</div></div>
              </div>
            );
          })}
          <p className="ajuda">Sempre abertos: Início, Reuniões, Cursos, Dúvidas e o Assistente.</p>
          {visto && <Link className="btn s peq" href="/inicio">Ir para o Início</Link>}
        </div>
      </div>
    </>
  );
}
