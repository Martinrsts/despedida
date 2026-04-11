import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { HostPage } from "./pages/HostPage";
import { PlayerPage } from "./pages/PlayerPage";
import { DisplayPage } from "./pages/DisplayPage";
import "./styles.css";

const Home = () => (
  <div className="page home-page">
    <div className="card home-card">
      <h1>Despedida de Diego</h1>
      <p>Elige tu rol para unirte a la sala de juego.</p>
      <div className="actions">
        <Link className="btn" to="/host">
          Anfitrión (Diego)
        </Link>
        <Link className="btn" to="/player">
          Jugador
        </Link>
        <Link className="btn" to="/display">
          Pantalla compartida
        </Link>
      </div>
    </div>
  </div>
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host" element={<HostPage />} />
        <Route path="/player" element={<PlayerPage />} />
        <Route path="/display" element={<DisplayPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
