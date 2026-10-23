import { PrimeiroAcesso } from "./PrimeiroAcesso";

export const metadata = { title: "Primeiro acesso" };

// Usada uma única vez, para criar a conta da Camilla como equipe. Depois disso a função recusa.
export default function Pagina() {
  return (
    <div className="login">
      <div className="login-arte">
        <div className="linha">
          <div className="logo">LM</div>
          <b style={{ fontSize: 18 }}>Loja Magnética</b>
        </div>
        <div>
          <h1>Bem-vinda ao Hub da Loja Magnética.</h1>
          <p style={{ opacity: 0.8, maxWidth: 420 }}>Crie a sua conta de equipe. Depois é só entrar pela tela de login.</p>
        </div>
        <small style={{ opacity: 0.6 }}>Método Loja Magnética · Camilla Ribeiro</small>
      </div>
      <div className="login-form"><PrimeiroAcesso /></div>
    </div>
  );
}
