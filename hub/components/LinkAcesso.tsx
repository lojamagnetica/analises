import { Copiar } from "@/components/Copiar";

/** Mostra o link de acesso recém-gerado, com botões para copiar e mandar pelo WhatsApp. */
export function LinkAcesso({ link, nome, whatsapp }: { link: string; nome: string; whatsapp: string | null }) {
  const mensagem = `Oi${nome ? `, ${nome.split(" ")[0]}` : ""}! O Hub da sua loja na Loja Magnética está pronto 🥂\n\nEntre por este link para criar a sua senha:\n${link}`;
  let numero = (whatsapp ?? "").replace(/\D/g, "");
  if (numero && numero.length <= 11) numero = "55" + numero;
  const wa = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
  return (
    <div className="card card-borda mb" style={{ ["--c" as string]: "var(--green)" }}>
      <h3>Link de acesso pronto</h3>
      <p className="mudo" style={{ fontSize: 14 }}>
        Mande para a mentorada. Ela clica, confirma e cria a senha. O link é de uso único e vence em pouco tempo; se vencer, gere outro em &quot;Quem acessa&quot;.
      </p>
      <input type="text" readOnly value={link} />
      <div className="linha mt">
        <a className="btn p peq" href={wa} target="_blank" rel="noopener">Enviar no WhatsApp</a>
        <Copiar texto={mensagem} rotulo="Copiar mensagem" />
      </div>
    </div>
  );
}
