import { Login } from "./Login";

export const metadata = { title: "Entrar" };

export default async function Pagina({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <div className="login">
      <div className="login-arte">
        <div className="linha">
          <div className="logo">LM</div>
          <b style={{ fontSize: 18 }}>Loja Magnética</b>
        </div>
        <div>
          <h1>Seu PORTAL DA MENTORIA em um lugar só.</h1>
          <p style={{ opacity: 0.8, maxWidth: 420 }}>
            Jornada, Plano de Ação, reuniões, scripts, planejamento e o Assistente Magnética.
          </p>
        </div>
        <small style={{ opacity: 0.6 }}>Método Loja Magnética · Camilla Ribeiro</small>
      </div>
      <div className="login-form">
        <Login erroInicial={erro === "link" ? "O link expirou ou já foi usado. Peça um novo abaixo." : undefined} />
      </div>
    </div>
  );
}
