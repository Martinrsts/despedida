import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getSocket } from "../lib/socket";
import { GameState } from "../lib/types";
import { getCategoryEmoji } from "../lib/categoryEmoji";

export const DisplayPage = () => {
  const socket = useMemo(() => getSocket(), []);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState<number>(25);
  const [revealStep, setRevealStep] = useState(0);
  const previousPhaseRef = useRef<GameState["phase"] | null>(null);

  useEffect(() => {
    const onState = (payload: GameState) => {
      setState(payload);
      if (payload.phase === "reveal" && previousPhaseRef.current !== "reveal") {
        setRevealStep(0);
      }
      previousPhaseRef.current = payload.phase;
    };

    socket.on("state_sync", onState);
    return () => {
      socket.off("state_sync", onState);
    };
  }, [socket]);

  useEffect(() => {
    if (!state || state.phase !== "reveal") return;

    const maxSteps = (state.revealedAnswers?.length || 0) * 2;
    if (revealStep < maxSteps) {
      const timer = setTimeout(() => {
        setRevealStep((prev) => prev + 1);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [revealStep, state]);

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

  const joinDisplay = (event: FormEvent) => {
    event.preventDefault();
    socket.emit(
      "join_room",
      {
        role: "display",
        roomCode: roomCodeInput.toUpperCase(),
      },
      (ack: { ok: boolean; error?: string }) => {
        if (!ack.ok) {
          setError(ack.error || "Could not join display.");
          return;
        }
        setError("");
      },
    );
  };

  const revealAnswers = state?.revealedAnswers || [];
  const visibleRevealCount = Math.ceil(revealStep / 2);
  const statusRevealCount = Math.floor(revealStep / 2);

  return (
    <div className="page display-page">
      <div className="card display-card">
        <div className="top-nav">
          <Link to="/">Back</Link>
        </div>

        {!state && (
          <form className="stack" onSubmit={joinDisplay}>
            <h1>Display screen</h1>
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
            {error && <p className="error">{error}</p>}
          </form>
        )}

        {state && (
          <div className="stack display-stack">
            <p className="badge">Room {state.roomCode}</p>
            <h1>
              Round {state.roundNumber}/{state.totalRounds}
            </h1>

            {state.phase === "lobby" && (
              <>
                <h2>Waiting for host to start</h2>
                <h3>Players</h3>
                <ul className="big-list">
                  {state.players.map((player) => (
                    <li key={player.id}>{player.name}</li>
                  ))}
                </ul>
              </>
            )}

            {state.phase === "host_pick" && (
              <h2>Host is choosing question...</h2>
            )}

            {state.phase === "answering" && (
              <>
                <h2>
                  {state.question && getCategoryEmoji(state.question.category)}{" "}
                  {state.question?.text}
                </h2>
                <p className="timer large">{secondsLeft}s</p>
              </>
            )}

            {state.phase === "anon_answers" && (
              <>
                <h2>Anonymous answers</h2>
                <div className="anon-grid anon-grid-display">
                  {state.anonymousAnswers.map((answer, idx) => (
                    <div
                      className="anon-card anon-card-display"
                      key={`${answer}-${idx}`}
                    >
                      <span className="anon-index">#{idx + 1}</span>
                      <p className="anon-text anon-text-display">{answer}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {state.phase === "host_judging" && (
              <h2>Host is selecting correct answers...</h2>
            )}

            {state.phase === "reveal" && (
              <>
                <h2>Who wrote what?</h2>
                <ul className="big-list reveal-list">
                  {revealAnswers
                    .slice(0, visibleRevealCount)
                    .map((entry, idx) => (
                      <li
                        key={entry.playerId}
                        className="reveal-item big-reveal"
                        style={{
                          animationDelay: `${idx * 0.1}s`,
                        }}
                      >
                        <span className="reveal-answer-big">
                          <strong>{entry.playerName}</strong>: {entry.answer}
                        </span>
                        {idx < statusRevealCount && (
                          <span
                            className={`reveal-status ${entry.isCorrect ? "correct" : "incorrect"}`}
                          >
                            {entry.isCorrect ? "✓ CORRECT" : "✗ INCORRECT"}
                          </span>
                        )}
                      </li>
                    ))}
                </ul>
              </>
            )}

            {state.phase === "leaderboard" && (
              <>
                <h2>Leaderboard</h2>
                <ol className="big-list">
                  {(state.leaderboard || []).map((entry) => (
                    <li key={entry.id}>
                      {entry.name} - {entry.score}
                    </li>
                  ))}
                </ol>
              </>
            )}

            {state.phase === "finished" && (
              <>
                <h2>Final Podium</h2>
                <ol className="big-list">
                  {(state.leaderboard || []).slice(0, 3).map((entry) => (
                    <li key={entry.id}>
                      {entry.name} - {entry.score}
                    </li>
                  ))}
                </ol>

                {state.finalAwards && (
                  <div className="awards">
                    <h3>Fun Awards</h3>
                    <p>Best friend: {state.finalAwards.bestFriend}</p>
                    <p>
                      Does not know the groom:{" "}
                      {state.finalAwards.leastKnowledge}
                    </p>
                    <p>
                      Most creative answer: {state.finalAwards.mostCreative}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
