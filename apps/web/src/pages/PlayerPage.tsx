import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getSocket } from "../lib/socket";
import { GameState } from "../lib/types";

export const PlayerPage = () => {
  const socket = useMemo(() => getSocket(), []);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState("");
  const [state, setState] = useState<GameState | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(25);

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
      setSecondsLeft(25);
      return;
    }

    const id = window.setInterval(() => {
      const left = Math.max(
        0,
        Math.ceil((state.timerEndsAt! - Date.now()) / 1000),
      );
      setSecondsLeft(left);
    }, 250);

    return () => window.clearInterval(id);
  }, [state?.timerEndsAt, state?.phase]);

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
    <div className="page">
      <div className="card">
        <div className="top-nav">
          <Link to="/">Back</Link>
        </div>
        <h1>Player</h1>

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
              Join room
            </button>
          </form>
        )}

        {error && <p className="error">{error}</p>}

        {state && (
          <>
            <p className="badge">Room: {state.roomCode}</p>
            <p>
              Round {state.roundNumber}/{state.totalRounds}
            </p>

            {(state.phase === "lobby" || state.phase === "host_pick") && (
              <p>Waiting for host to start the next question...</p>
            )}

            {state.phase === "answering" && (
              <form className="stack" onSubmit={submitAnswer}>
                <h2>{state.question?.text}</h2>
                <p className="timer">{secondsLeft}s</p>
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
                <p>Waiting for results...</p>
                <p>Check the main screen.</p>
                <p>Your score: {state.yourScore || 0}</p>
              </div>
            )}

            {state.phase === "finished" && (
              <div className="stack">
                <h2>Game finished</h2>
                <p>Final score: {state.yourScore || 0}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
