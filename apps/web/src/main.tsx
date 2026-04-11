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
      <h1>Know The Groom</h1>
      <p>Choose your role to join the game room.</p>
      <div className="actions">
        <Link className="btn" to="/host">
          Host
        </Link>
        <Link className="btn" to="/player">
          Player
        </Link>
        <Link className="btn" to="/display">
          Display
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
