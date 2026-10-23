"use client";

import { Icone } from "@/components/Icone";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { dataCurta } from "@/lib/formato";

function embedYoutube(url: string) {
  const id = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)?.[1];
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

export default function Cursos() {
  const { portal } = usePortal();
  const { dados } = useDados(async () => {
    const sb = supabaseBrowser();
    const [{ data: aulas }, { data: gravacoes }] = await Promise.all([
      sb.from("aulas").select("*").order("ordem"),
      sb.from("reunioes").select("id, titulo, data, gravacao_url").eq("portal_id", portal.id).not("gravacao_url", "is", null).order("data", { ascending: false }),
    ]);
    return { aulas: aulas ?? [], gravacoes: gravacoes ?? [] };
  }, [portal.id]);
  if (!dados) return <Carregando />;
  const { aulas, gravacoes } = dados;
  const modulos = [...new Set((aulas ?? []).map((a) => a.modulo))];

  return (
    <>
      <Titulo titulo="Cursos e gravações" sub="O portal do curso da metodologia completo e as gravações dos seus encontros." />
      {(gravacoes ?? []).length > 0 && (
        <>
          <div className="secao">Gravações das suas reuniões</div>
          <div className="grade g3">
            {gravacoes!.map((g) => (
              <a key={g.id} className="card card-borda" style={{ ["--c" as string]: "var(--purple)", textDecoration: "none", color: "inherit" }} href={g.gravacao_url!} target="_blank" rel="noopener">
                <b>{g.titulo}</b><div className="mudo">{dataCurta(g.data)} · ▶ assistir</div>
              </a>
            ))}
          </div>
        </>
      )}
      {modulos.map((m) => (
        <div key={m}>
          <div className="secao">{m}</div>
          <div className="grade g3">
            {(aulas ?? []).filter((a) => a.modulo === m).map((a) => {
              const embed = a.video_url ? embedYoutube(a.video_url) : null;
              return (
                <div key={a.id} className="card">
                  {embed ? (
                    <iframe src={embed} title={a.titulo} style={{ width: "100%", aspectRatio: "16/9", border: 0, borderRadius: 12, marginBottom: 12 }} allowFullScreen />
                  ) : (
                    <div style={{ aspectRatio: "16/9", borderRadius: 12, background: "var(--grad)", display: "grid", placeItems: "center", color: "#fff", marginBottom: 12 }}>
                      <Icone nome="play" tamanho={36} />
                    </div>
                  )}
                  <h3>{a.titulo}</h3>
                  {a.descricao && <p className="mudo">{a.descricao}</p>}
                  {a.video_url && !embed && <a href={a.video_url} target="_blank" rel="noopener">Abrir aula →</a>}
                  {!a.video_url && <span className="selo espera">em breve</span>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
