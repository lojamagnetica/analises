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
        <label className="marcar mt"><input type="checkbox" name="convidar" defaultChecked /><span>Enviar convite de acesso para o e-mail acima</span></label>
        <div className="linha mt"><button className="btn p" type="submit">Criar portal</button></div>
      </form>
    </>
  );
}
