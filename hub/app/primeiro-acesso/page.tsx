import { PrimeiroAcesso } from "./PrimeiroAcesso";
import { Simbolo } from "@/components/Simbolo";

export const metadata = { title: "Primeiro acesso" };

// Usada uma única vez, para criar a conta da Camilla como equipe. Depois disso a função recusa.
export default function Pagina() {
  return (
    <div className="login">
      <div className="login-arte">
        <div className="linha">
          <div className="logo"><Simbolo /></div>
          <b className="marca-nome" style={{ fontSize: 24 }}>magnética<span>.hub</span></b>
        </div>
        <div>
          <h1>Boas-vindas ao magnética.hub.</h1>
          <p style={{ opacity: 0.8, maxWidth: 420 }}>Crie a sua conta de equipe. Depois é só entrar pela tela de login.</p>
        </div>
        <small style={{ opacity: 0.6 }}>Método Loja Magnética · um método magnética</small>
      </div>
      <div className="login-form"><PrimeiroAcesso /></div>
    </div>
  );
}
