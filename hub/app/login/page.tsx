import { Login } from "./Login";
import { Simbolo } from "@/components/Simbolo";

export const metadata = { title: "Entrar" };

export default function Pagina() {
  return (
    <div className="login">
      <div className="login-arte">
        <div className="linha">
          <div className="logo"><Simbolo /></div>
          <b className="marca-nome" style={{ fontSize: 24 }}>magnética<span>.hub</span></b>
        </div>
        <div>
          <h1>Tudo da sua loja em um lugar só.</h1>
          <p style={{ opacity: 0.8, maxWidth: 420 }}>
            Jornada, Plano de Ação, reuniões, scripts, planejamento e o Fale com a Camilla.
          </p>
        </div>
        <small style={{ opacity: 0.6 }}>Método Loja Magnética · um método magnética</small>
      </div>
      <div className="login-form">
        <Login />
      </div>
    </div>
  );
}
