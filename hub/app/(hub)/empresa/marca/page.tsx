"use client";

import { Copiar } from "@/components/Copiar";
import { GeradorCracha } from "@/components/GeradorCracha";
import { Titulo } from "@/components/Titulo";
import { BASE } from "@/lib/config";
import { useEquipe } from "@/lib/hub";

type Arquivo = { arq: string; rotulo: string; fundo?: string; alto?: boolean };

const LOGOS: Arquivo[] = [
  { arq: "logo-horizontal-azul-noite.png", rotulo: "Logo horizontal · azul-noite", fundo: "#F5F0EA" },
  { arq: "logo-horizontal-off-white.png", rotulo: "Logo horizontal · off-white", fundo: "#0B1A3A" },
  { arq: "logo-magnetica-hub-azul-noite.png", rotulo: "magnética.hub · azul-noite", fundo: "#F5F0EA" },
  { arq: "logo-magnetica-hub-off-white.png", rotulo: "magnética.hub · off-white", fundo: "#0B1A3A" },
  { arq: "logo-simbolo-azul-noite.png", rotulo: "Símbolo · azul-noite", fundo: "#F5F0EA" },
  { arq: "logo-simbolo-off-white.png", rotulo: "Símbolo · off-white", fundo: "#0B1A3A" },
];

const INSTAGRAM: Arquivo[] = [
  { arq: "foto-perfil-nome-claro.png", rotulo: "Foto de perfil · clara" },
  { arq: "foto-perfil-nome-escuro.png", rotulo: "Foto de perfil · escura" },
  { arq: "foto-perfil-simbolo.png", rotulo: "Foto de perfil · símbolo" },
  { arq: "previa-perfil.png", rotulo: "Prévia do perfil" },
  { arq: "destaque-01-comece-aqui.png", rotulo: "Destaque · Comece aqui", alto: true },
  { arq: "destaque-02-metodo.png", rotulo: "Destaque · Método", alto: true },
  { arq: "destaque-03-mentoria.png", rotulo: "Destaque · Mentoria", alto: true },
  { arq: "destaque-04-resultados.png", rotulo: "Destaque · Resultados", alto: true },
  { arq: "destaque-05-socios.png", rotulo: "Destaque · Quem somos", alto: true },
  { arq: "destaque-06-eventos.png", rotulo: "Destaque · Eventos", alto: true },
  { arq: "cracha-premium.png", rotulo: "Boas-vindas · Premium", alto: true },
  { arq: "cracha-gold.png", rotulo: "Boas-vindas · Gold", alto: true },
  { arq: "cracha-start.png", rotulo: "Boas-vindas · Start", alto: true },
  { arq: "cracha-consultoria.png", rotulo: "Boas-vindas · Consultoria", alto: true },
  { arq: "simulacao-feed-magnetica-hub.png", rotulo: "Simulação do feed", alto: true },
];

const CORES = [
  { nome: "Azul-noite", hex: "#0B1A3A", papel: "Marca-mãe, fundos fortes, texto", texto: "#F5F0EA" },
  { nome: "Ferrugem", hex: "#BC4914", papel: "Método Loja Magnética, destaques", texto: "#FFFFFF" },
  { nome: "Âmbar", hex: "#E08A3C", papel: "Energia; texto escuro em cima", texto: "#0B1A3A" },
  { nome: "Off-white", hex: "#F5F0EA", papel: "Fundo principal", texto: "#0B1A3A" },
  { nome: "Areia", hex: "#E6DCD0", papel: "Apoio, fundos de foto", texto: "#0B1A3A" },
  { nome: "Grafite", hex: "#1C1412", papel: "Texto de contraste", texto: "#F5F0EA" },
];

const BIO = "Magnética · Varejo de Moda\nEducação e estratégia para lojistas de moda\nCasa do Método Loja Magnética · Mentoria · Cursos · Eventos\n↓ Entre na lista";

function Grade({ itens }: { itens: Arquivo[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
      {itens.map((i) => (
        <div key={i.arq} className="card" style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
          <div style={{ background: i.fundo ?? "var(--soft)", borderRadius: 10, aspectRatio: i.alto ? "9 / 16" : "1", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${BASE}/marca/${i.arq}`} alt={i.rotulo} loading="lazy" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, overflowWrap: "anywhere" }}>{i.rotulo}</span>
          <a className="btn s peq" href={`${BASE}/marca/${i.arq}`} download={i.arq}>Baixar</a>
        </div>
      ))}
    </div>
  );
}

export default function Marca() {
  useEquipe();
  return (
    <>
      <Titulo titulo="Marca" sub="Identidade da magnética (@magnetica.hub): o crachá de boas-vindas, os logos e as imagens prontas para usar." />

      <div className="card mb">
        <h2>Crachá de boas-vindas</h2>
        <p className="mudo" style={{ fontSize: 14 }}>Para cada cliente nova: escolha o plano (Premium, Gold, Start ou Consultoria), coloque o nome, a turma ou a loja e a foto, e baixe o story pronto para postar e mandar no WhatsApp.</p>
        <GeradorCracha />
      </div>

      <div className="card mb">
        <h2>Logos</h2>
        <p className="mudo" style={{ fontSize: 14 }}>Arquivos com fundo transparente. Use o azul-noite sobre fundo claro e o off-white sobre fundo escuro. O símbolo é sempre de uma cor só.</p>
        <Grade itens={LOGOS} />
      </div>

      <div className="card mb">
        <h2>Instagram</h2>
        <p className="mudo" style={{ fontSize: 14 }}>Foto de perfil (1080×1080) e capas dos destaques (1080×1920). O nome embaixo de cada destaque é digitado no próprio Instagram.</p>
        <Grade itens={INSTAGRAM} />
        <label className="rotulo" htmlFor="bio" style={{ marginTop: 16 }}>Bio do @magnetica.hub</label>
        <textarea id="bio" readOnly rows={4} value={BIO} />
        <div className="linha mt"><Copiar texto={BIO} rotulo="Copiar bio" /></div>
      </div>

      <div className="grade g2">
        <div className="card">
          <h2>Cores</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
            {CORES.map((c) => (
              <div key={c.hex} style={{ background: c.hex, color: c.texto, borderRadius: 12, padding: 12, border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 4 }}>
                <strong>{c.nome}</strong>
                <span style={{ fontSize: 13 }}>{c.hex}</span>
                <span style={{ fontSize: 12, opacity: 0.85 }}>{c.papel}</span>
              </div>
            ))}
          </div>
          <p className="ajuda" style={{ marginTop: 10 }}>Letras: Outfit no nome escrito (logo) e Archivo nos títulos e textos, misturando palavra bem grossa com palavra fina.</p>
        </div>
        <div className="card">
          <h2>Regras rápidas</h2>
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
            <li>A marca é <strong>magnética</strong>, em minúsculas. O @ é <strong>@magnetica.hub</strong>.</li>
            <li>Mostre a casa: sócios, educadores, turma e bastidores, cada um com o crachá.</li>
            <li>O neutro domina o feed; azul-noite e ferrugem marcam presença.</li>
            <li>Lema do método: <strong>ATRAIR. VENDER. REPETIR.</strong></li>
            <li>Nunca: símbolo colorido de duas cores, laranja vivo, vermelho carmim ou a palavra &quot;Group&quot;.</li>
          </ul>
        </div>
      </div>
    </>
  );
}
