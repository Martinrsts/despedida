import { CSSProperties, FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getSocket } from "../lib/socket";
import { GameState } from "../lib/types";

const ANSWER_DURATION_MS = 25000;

export const PlayerPage = () => {
  const socket = useMemo(() => getSocket(), []);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState("");
  const [state, setState] = useState<GameState | null>(null);
  const [timerProgress, setTimerProgress] = useState<number>(1);

  useEffect(() => {
    const onState = (payload: GameState) => {
      setState(payload);
      setRoomCode(payload.roomCode);
    };

    socket.on("state_sync", onState);
    return () => {
      socket.off("state_sync", onState);
    };
  }, [socket]);

  useEffect(() => {
    if (!state?.timerEndsAt || state.phase !== "answering") {
      setTimerProgress(1);
      return;
    }

    const id = window.setInterval(() => {
      const remainingMs = Math.max(0, state.timerEndsAt! - Date.now());
      setTimerProgress(Math.min(1, remainingMs / ANSWER_DURATION_MS));
    }, 100);

    return () => window.clearInterval(id);
  }, [state?.timerEndsAt, state?.phase]);

  const timerStyle = {
    "--progress": timerProgress,
  } as CSSProperties;

  const joinRoom = (event: FormEvent) => {
    event.preventDefault();
    const tokenKey = `groom-game-token-${roomCodeInput.toUpperCase()}`;
    const storedToken = localStorage.getItem(tokenKey) || undefined;

    socket.emit(
      "join_room",
      {
        role: "player",
        roomCode: roomCodeInput.toUpperCase(),
        name,
        playerToken: storedToken,
      },
      (ack: {
        ok: boolean;
        error?: string;
        playerToken?: string;
        roomCode?: string;
      }) => {
        if (!ack.ok) {
          setError(ack.error || "Could not join.");
          return;
        }
        setError("");
        if (ack.playerToken && ack.roomCode) {
          localStorage.setItem(
            `groom-game-token-${ack.roomCode}`,
            ack.playerToken,
          );
        }
      },
    );
  };

  const submitAnswer = (event: FormEvent) => {
    event.preventDefault();
    socket.emit(
      "submit_answer",
      { roomCode, answer },
      (ack: { ok: boolean; error?: string }) => {
        if (!ack.ok) {
          setError(ack.error || "Could not submit answer.");
          return;
        }
        setError("");
      },
    );
  };

  return (
    <div className="page player-page">
      <div className="card player-card">
        <div className="top-nav">
          <Link to="/">Back</Link>
        </div>
        <h1>Jugador</h1>

        {!state && (
          <form className="stack" onSubmit={joinRoom}>
            <input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              required
            />
            <input
              placeholder="Room code"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              maxLength={6}
              required
            />
            <button className="btn" type="submit">
              Unirse a la partida
            </button>
          </form>
        )}

        {error && <p className="error">{error}</p>}

        {state && (
          <>
            <p className="badge">Room: {state.roomCode}</p>
            <p>
              Ronda {state.roundNumber}/{state.totalRounds}
            </p>

            {(state.phase === "lobby" || state.phase === "host_pick") && (
              <p>Esperando a que el anfitrión inicie la próxima pregunta...</p>
            )}

            {state.phase === "answering" && (
              <form className="stack" onSubmit={submitAnswer}>
                <h2>{state.question?.text}</h2>
                <div
                  className="timer-clock"
                  style={timerStyle}
                  role="img"
                  aria-label="Remaining time"
                >
                  <span className="timer-icon" aria-hidden="true">
                    ⏱️
                  </span>
                </div>
                <textarea
                  placeholder="Type your answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  disabled={state.hasSubmitted}
                  maxLength={120}
                  required
                />
                <button
                  className="btn"
                  type="submit"
                  disabled={state.hasSubmitted}
                >
                  {state.hasSubmitted ? "Submitted" : "Submit"}
                </button>
              </form>
            )}

            {(state.phase === "anon_answers" ||
              state.phase === "host_judging" ||
              state.phase === "reveal" ||
              state.phase === "leaderboard") && (
              <div className="stack">
                <p>Esperando resultados...</p>
                <div
                  className="display-loading-cue"
                  role="status"
                  aria-live="polite"
                >
                  <span className="display-loading-emoji" aria-hidden="true">
                    🖥️
                  </span>
                  <span className="display-loading-text">
                    Revisa la pantalla para ver los resultados
                    <span className="loading-dots" aria-hidden="true">
                      <span>.</span>
                      <span>.</span>
                      <span>.</span>
                    </span>
                  </span>
                </div>
                <p>Tu puntaje: {state.yourScore || 0}</p>
              </div>
            )}

            {state.phase === "finished" && (
              <div className="stack">
                <h2>Se acabo el juego</h2>
                <p>Puntaje final: {state.yourScore || 0}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
