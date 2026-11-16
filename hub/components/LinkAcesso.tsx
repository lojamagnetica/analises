import { Copiar } from "@/components/Copiar";
import { aulaPorId, guia, linkAula, linkGuia } from "@/lib/guias";
import type { Acesso } from "@/lib/acoes";

/** O acesso pronto (endereço fixo, e-mail e senha que não vencem), com a mensagem passo a passo para o WhatsApp. */
export function LinkAcesso({ acesso, nome, whatsapp, pessoaDoTime = false }: { acesso: Acesso; nome: string; whatsapp: string | null; pessoaDoTime?: boolean }) {
  const mensagem = `Oi${nome ? `, ${nome.split(" ")[0]}` : ""}! Aqui é da Loja Magnética. O Hub da sua loja está pronto 💛

É só seguir 3 passos:

1️⃣ Toque neste endereço (ele é sempre o mesmo, não vence):
${acesso.link}

2️⃣ O seu e-mail já aparece preenchido. Na senha, digite:
${acesso.senha}

3️⃣ Toque em Entrar. Pronto, você está dentro!

Dica: salve na tela inicial do celular para abrir sempre com um toque:
iPhone: ${linkGuia(guia("primeiro-acesso-iphone"))}
Android: ${linkGuia(guia("primeiro-acesso-android"))}${pessoaDoTime ? `\n\nComo fechar o caixa (vídeo de 3 minutos):\n${linkAula(aulaPorId("fechamento-caixa"))}` : ""}

Guarde esta mensagem: o e-mail é ${acesso.email} e a senha é a de cima.`;
  let numero = (whatsapp ?? "").replace(/\D/g, "");
  if (numero && numero.length <= 11) numero = "55" + numero;
  const wa = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
  return (
    <div className="card card-borda mb" style={{ ["--c" as string]: "var(--green)" }}>
      <h3>Acesso pronto</h3>
      <p className="mudo" style={{ fontSize: 14 }}>
        O endereço é sempre o mesmo e a senha não vence. Mande a mensagem abaixo pelo WhatsApp. Se a pessoa esquecer a senha, toque em &quot;Nova senha&quot; em &quot;Quem acessa&quot; e mande de novo.
      </p>
      <div className="grade g2" style={{ gap: 8 }}>
        <label className="ajuda">E-mail<input type="text" readOnly value={acesso.email} /></label>
        <label className="ajuda">Senha<input type="text" readOnly value={acesso.senha} /></label>
      </div>
      <label className="ajuda mt" style={{ display: "block" }}>Endereço de entrar<input type="text" readOnly value={acesso.link} /></label>
      <div className="linha mt">
        {numero ? <a className="btn p peq" href={wa} target="_blank" rel="noopener">Enviar no WhatsApp</a> : null}
        <Copiar texto={mensagem} rotulo="Copiar mensagem" />
      </div>
    </div>
  );
}
