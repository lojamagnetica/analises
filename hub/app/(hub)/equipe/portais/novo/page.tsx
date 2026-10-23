import { Titulo } from "@/components/Titulo";
import { contextoEquipe } from "@/lib/contexto";
import { criarPortal } from "../../acoes";
import { CamposPortal } from "../CamposPortal";

export const metadata = { title: "Novo portal" };

export default async function NovoPortal() {
  await contextoEquipe();
  return (
    <>
      <Titulo voltar={{ href: "/equipe", rotulo: "Painel" }} titulo="Novo portal" sub="Cria o PORTAL DA MENTORIA com os 7 passos, o Plano de Ação do modelo, PLANEJE AQUI e Reuniões." />
      <form className="card" style={{ maxWidth: 760 }} action={criarPortal}>
        <CamposPortal />
        <p className="ajuda mt">Com o e-mail preenchido, o Hub cria o acesso da mentorada e te dá um link para mandar pelo WhatsApp.</p>
        <div className="linha mt"><button className="btn p" type="submit">Criar portal</button></div>
      </form>
    </>
  );
}
