// Links de convite e de acesso chegam aqui. O link só é usado quando a pessoa clica no botão:
// assim a prévia do WhatsApp (ou o antivírus do e-mail) não gasta o link antes dela.
export const metadata = { title: "Entrar" };

export default async function Confirmar({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const convite = sp.type === "invite" || sp.type === "recovery";
  return (
    <div className="login-form" style={{ minHeight: "100vh" }}>
      <form className="card" method="post" action="/auth/confirmar" style={{ textAlign: "center" }}>
        <div className="logo" style={{ margin: "0 auto 14px" }}>LM</div>
        <h1>{convite ? "Seu PORTAL DA MENTORIA está pronto 🥂" : "Entrar no Hub"}</h1>
        <p className="mudo">{convite ? "Clique abaixo e crie a sua senha." : "Clique abaixo para entrar."}</p>
        {["token_hash", "type", "code", "next"].map((k) => sp[k] && <input key={k} type="hidden" name={k} value={sp[k]} />)}
        <button className="btn p" type="submit" style={{ width: "100%" }}>{convite ? "Criar minha senha" : "Entrar"}</button>
      </form>
    </div>
  );
}
