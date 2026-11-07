"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Titulo } from "@/components/Titulo";
import { Copiar } from "@/components/Copiar";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { BASE } from "@/lib/config";
import { buscarJornada, marcarCheck } from "@/lib/jornada";

// Post de entrada: o crachá de boas-vindas do plano com o nome, a turma e a foto da cliente.
// Tudo é montado no navegador; a foto não fica guardada no Hub.
const CRACHA: Record<string, string> = { premium: "premium", gold: "gold", start: "start", consultoria: "consultoria" };
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

// Posições no crachá (1080 x 1920). O cartão é levemente inclinado.
const GIRO = -0.045;
const NOME = { x: 318, y: 1185 };
const FOTO = { x: 418, y: 948, r: 106 };

function carregarImagem(src: string) {
  return new Promise<HTMLImageElement>((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => falha(new Error("Não deu para abrir a imagem.")); i.src = src; });
}

/** Quebra o nome em até duas linhas que caibam na largura. */
function linhasDoNome(ctx: CanvasRenderingContext2D, nome: string, largura: number) {
  for (let tam = 64; tam >= 40; tam -= 4) {
    ctx.font = `800 ${tam}px Archivo, sans-serif`;
    const palavras = nome.split(/\s+/).filter(Boolean);
    const linhas: string[] = [];
    let atual = "";
    for (const p of palavras) {
      const teste = atual ? `${atual} ${p}` : p;
      if (ctx.measureText(teste).width <= largura || !atual) atual = teste; else { linhas.push(atual); atual = p; }
    }
    if (atual) linhas.push(atual);
    if (linhas.length <= 2 && linhas.every((l) => ctx.measureText(l).width <= largura)) return { tam, linhas };
  }
  return { tam: 40, linhas: [nome] };
}

async function desenhar(canvas: HTMLCanvasElement, plano: string, nome: string, turma: string, foto: HTMLImageElement | null) {
  const ctx = canvas.getContext("2d")!;
  const base = await carregarImagem(`${BASE}/marca/cracha-${plano}.png`);
  await Promise.all([document.fonts.load("800 64px Archivo"), document.fonts.load("400 28px Archivo")]).catch(() => undefined);
  canvas.width = base.width; canvas.height = base.height;
  ctx.drawImage(base, 0, 0);

  // A cor do cartão sai da própria imagem; o texto é claro no cartão escuro e escuro no claro.
  const [r, g, b] = ctx.getImageData(720, 1010, 1, 1).data;
  const fundo = `rgb(${r}, ${g}, ${b})`;
  const claro = 0.299 * r + 0.587 * g + 0.114 * b > 150;
  const texto = claro ? "#141210" : "#F7F1EA";

  if (foto) {
    ctx.save();
    ctx.beginPath(); ctx.arc(FOTO.x, FOTO.y, FOTO.r, 0, Math.PI * 2); ctx.clip();
    const lado = Math.min(foto.width, foto.height);
    ctx.drawImage(foto, (foto.width - lado) / 2, (foto.height - lado) / 2, lado, lado, FOTO.x - FOTO.r, FOTO.y - FOTO.r, FOTO.r * 2, FOTO.r * 2);
    ctx.restore();
  }

  ctx.save();
  ctx.translate(NOME.x, NOME.y);
  ctx.rotate(GIRO);
  // Cobre o "Nome da Mentorada" e o "Turma [mês] · 2026" do modelo.
  ctx.fillStyle = fundo;
  ctx.fillRect(-14, -60, 500, 140);
  ctx.fillRect(-14, 132, 360, 42);
  ctx.fillStyle = texto;
  ctx.textBaseline = "alphabetic";
  const { tam, linhas } = linhasDoNome(ctx, nome.trim() || "Nome da Mentorada", 470);
  ctx.font = `800 ${tam}px Archivo, sans-serif`;
  const passo = tam * 0.96;
  linhas.forEach((l, i) => ctx.fillText(l, 0, (linhas.length === 1 ? passo / 2 : 0) + i * passo));
  ctx.globalAlpha = 0.85;
  ctx.font = "400 28px Archivo, sans-serif";
  ctx.fillText(turma, 0, 162);
  ctx.restore();
}

function Post() {
  const id = useSearchParams().get("id") ?? "";
  const { nome: quem } = useEquipe();
  const { dados } = useDados(async () => (await buscarJornada(id))[0] ?? null, [id]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [nome, setNome] = useState<string | null>(null);
  const [turma, setTurma] = useState<string | null>(null);
  const [foto, setFoto] = useState<HTMLImageElement | null>(null);
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");

  const c = dados;
  const plano = c?.plano && CRACHA[c.plano] ? CRACHA[c.plano] : c?.tipo === "Consultoria" ? "consultoria" : "start";
  const base = c?.passagem?.pagamento_em ?? c?.base ?? new Date().toISOString().slice(0, 10);
  const turmaPadrao = `Turma ${MESES[Number(base.slice(5, 7)) - 1]} · ${base.slice(0, 4)}`;
  const nomeFinal = nome ?? c?.responsavel ?? "";
  const turmaFinal = turma ?? turmaPadrao;

  useEffect(() => {
    if (!c || !canvas.current) return;
    desenhar(canvas.current, plano, nomeFinal, turmaFinal, foto).catch((e) => setErro((e as Error).message));
  }, [c, plano, nomeFinal, turmaFinal, foto]);

  if (!dados) return <Carregando />;
  if (!c) return <div className="card">Cliente não encontrada.</div>;
  const primeiro = (c.responsavel ?? "").trim().split(/\s+/)[0] || "[NOME]";
  const mensagem = `${primeiro}, preparamos o seu crachá de boas-vindas à magnética! 🧡\n\nPosta nos seus stories e marca o @magnetica.hub: é o primeiro passo da ${c.loja} dentro do Método Loja Magnética.`;
  const whats = c.whatsapp ? c.whatsapp.replace(/\D/g, "").replace(/^(?!55)/, "55") : "";

  const baixar = () => canvas.current?.toBlob((b) => {
    if (!b) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `boas-vindas-${c.loja.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }, "image/png");

  return (
    <>
      <Titulo voltar={{ href: `/equipe/central/cliente?id=${c.id}`, rotulo: c.loja }} titulo="Post de entrada" sub="O crachá de boas-vindas do plano com o nome e a foto da cliente. Confira, baixe e mande no grupo dela." />
      {erro && <div className="aviso mb">{erro}</div>}
      {msg && <div className="aviso ok mb">{msg}</div>}
      <div className="grade g2" style={{ gap: 16, alignItems: "start" }}>
        <div className="card">
          <label className="rotulo">Nome no crachá</label>
          <input value={nomeFinal} onChange={(e) => setNome(e.target.value)} placeholder="Nome da cliente" />
          <label className="rotulo">Turma</label>
          <input value={turmaFinal} onChange={(e) => setTurma(e.target.value)} />
          <label className="rotulo">Foto da cliente (rosto, de preferência quadrada)</label>
          <input type="file" accept="image/*" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setErro("");
            try { setFoto(await carregarImagem(URL.createObjectURL(f))); } catch (x) { setErro((x as Error).message); }
          }} />
          <p className="ajuda">Dica: a foto do perfil do Instagram dela funciona bem. A foto não fica guardada no Hub.</p>
          {foto && <button type="button" className="btn s peq" onClick={() => setFoto(null)}>Tirar a foto</button>}

          <div className="secao">Mensagem para mandar junto</div>
          <p style={{ whiteSpace: "pre-wrap", background: "var(--soft)", borderRadius: 10, padding: 10 }}>{mensagem}</p>
          <div className="linha" style={{ gap: 8 }}>
            <button type="button" className="btn p" onClick={baixar}>Baixar o post</button>
            <Copiar texto={mensagem} rotulo="Copiar a mensagem" />
            {whats && <a className="btn s peq" target="_blank" rel="noopener" href={`https://wa.me/${whats}?text=${encodeURIComponent(mensagem)}`}>Abrir o WhatsApp</a>}
          </div>
          <button type="button" className="btn s peq mt" onClick={async () => {
            setErro("");
            try { await marcarCheck(c.id, "post_entrada", { feito: true }, quem); setMsg("Marcado como enviado no checklist da Central."); } catch (x) { setErro((x as Error).message); }
          }}>Já mandei: marcar como feito</button>
        </div>
        <div className="card" style={{ padding: 10, display: "flex", justifyContent: "center" }}>
          <canvas ref={canvas} style={{ width: "100%", maxWidth: 380, height: "auto", borderRadius: 10 }} aria-label="Prévia do post de entrada" />
        </div>
      </div>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Post /></Suspense>;
}
