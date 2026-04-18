import {
  CSSProperties,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { getSocket } from "../lib/socket";
import { GameState } from "../lib/types";
import { getCategoryEmoji } from "../lib/categoryEmoji";

const DEFAULT_TOTAL_ROUNDS = 8;
const ANSWER_DURATION_MS = 45000;

export const DisplayPage = () => {
  const socket = useMemo(() => getSocket(), []);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState("");
  const [totalRounds, setTotalRounds] = useState<number>(DEFAULT_TOTAL_ROUNDS);
  const [timerProgress, setTimerProgress] = useState<number>(1);
  const [revealStep, setRevealStep] = useState(0);
  const [leaderboardRevealCount, setLeaderboardRevealCount] = useState(0);
  const [finishedPodiumStep, setFinishedPodiumStep] = useState(0);
  const previousPhaseRef = useRef<GameState["phase"] | null>(null);

  useEffect(() => {
    const onState = (payload: GameState) => {
      setState(payload);
      if (payload.phase === "reveal" && previousPhaseRef.current !== "reveal") {
        setRevealStep(0);
      }
      if (
        payload.phase === "leaderboard" &&
        previousPhaseRef.current !== "leaderboard"
      ) {
        setLeaderboardRevealCount(0);
      }
      if (
        payload.phase === "finished" &&
        previousPhaseRef.current !== "finished"
      ) {
        setFinishedPodiumStep(0);
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
      }, 950);
      return () => clearTimeout(timer);
    }
  }, [revealStep, state]);

  useEffect(() => {
    if (!state || state.phase !== "leaderboard") return;

    const total = state.leaderboard?.length || 0;
    if (leaderboardRevealCount < total) {
      const timer = setTimeout(() => {
        setLeaderboardRevealCount((prev) => prev + 1);
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [leaderboardRevealCount, state]);

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

  useEffect(() => {
    if (!state || state.phase !== "finished") return;
    if (finishedPodiumStep >= 3) return;

    const delay = finishedPodiumStep === 0 ? 1400 : 1200;
    const timer = setTimeout(() => {
      setFinishedPodiumStep((prev) => Math.min(3, prev + 1));
    }, delay);

    return () => clearTimeout(timer);
  }, [finishedPodiumStep, state]);

  const timerStyle = {
    "--progress": timerProgress,
  } as CSSProperties;

  const joinDisplay = (roomCode?: string) => {
    const normalizedCode = roomCode?.trim().toUpperCase();
    socket.emit(
      "join_room",
      {
        role: "display",
        roomCode: normalizedCode || undefined,
        totalRounds: normalizedCode ? undefined : totalRounds,
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
  const leaderboardEntries = state?.leaderboard || [];
  const leaderboardRevealStartIndex = Math.max(
    0,
    leaderboardEntries.length - leaderboardRevealCount,
  );
  const finalTopThree = leaderboardEntries.slice(0, 3);
  const nonPodiumEntries = leaderboardEntries.slice(3);
  const latestStatusEntry =
    statusRevealCount > 0 ? revealAnswers[statusRevealCount - 1] : undefined;
  const showFunnyScreenBurst = Boolean(latestStatusEntry?.isFunny);
  const showBeerScreenBurst = Boolean(latestStatusEntry?.isBeer);
  const showWinnerConfetti = finishedPodiumStep >= 3;

  const isPodiumRankRevealed = (rank: number): boolean => {
    if (rank === 3) return finishedPodiumStep >= 1;
    if (rank === 2) return finishedPodiumStep >= 2;
    if (rank === 1) return finishedPodiumStep >= 3;
    return false;
  };

  return (
    <div className="page display-page">
      <div className="card display-card">
        <div className="top-nav">
          <Link to="/">Atrás</Link>
        </div>

        {!state && (
          <form
            className="stack"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              joinDisplay(roomCodeInput);
            }}
          >
            <h1>Presentación</h1>
            <div className="inline-input">
              <select
                value={totalRounds}
                onChange={(e) => setTotalRounds(Number(e.target.value))}
              >
                {Array.from({ length: 20 }, (_, idx) => idx + 1).map(
                  (rounds) => (
                    <option key={rounds} value={rounds}>
                      {rounds} ronda{rounds === 1 ? "" : "s"}
                    </option>
                  ),
                )}
              </select>
              <button
                className="btn"
                type="button"
                onClick={() => joinDisplay()}
              >
                Crear nueva sala
              </button>
            </div>
            <input
              placeholder="Room code"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              maxLength={6}
              required
            />
            <button className="btn" type="submit">
              Unirse a la sala
            </button>
            {error && <p className="error">{error}</p>}
          </form>
        )}

        {state && (
          <div className="stack display-stack">
            <p
              className={`badge ${state.phase === "lobby" ? "display-lobby-code" : ""}`}
            >
              Sala {state.roomCode}
            </p>
            <h1>
              Ronda {state.roundNumber}/{state.totalRounds}
            </h1>

            {state.phase === "lobby" && (
              <>
                <h2>Esperando a que el anfitrión inicie</h2>
                <h3>Jugadores</h3>
                <ul className="big-list">
                  {state.players.map((player) => (
                    <li key={player.id}>{player.name}</li>
                  ))}
                </ul>
              </>
            )}

            {state.phase === "host_pick" && (
              <h2>Anfitrión está eligiendo la pregunta...</h2>
            )}

            {state.phase === "answering" && (
              <>
                <h2>
                  {state.question && getCategoryEmoji(state.question.category)}{" "}
                  {state.question?.text}
                </h2>
                <div
                  className="timer-clock large"
                  style={timerStyle}
                  role="img"
                  aria-label="Remaining time"
                >
                  <span className="timer-icon" aria-hidden="true">
                    ⏱️
                  </span>
                </div>
              </>
            )}

            {state.phase === "anon_answers" && (
              <>
                <h2>Respuestas</h2>
                <div className="anon-grid anon-grid-display">
                  {state.anonymousAnswers.map((answer, idx) => (
                    <div
                      className="anon-card anon-card-display"
                      key={`${answer}-${idx}`}
                    >
                      <p className="anon-text anon-text-display">{answer}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {state.phase === "host_judging" && (
              <>
                <h2>Respuestas</h2>
                <p>Anfitrión está asignando puntajes...</p>
                <div className="anon-grid anon-grid-display">
                  {state.anonymousAnswers.map((answer, idx) => (
                    <div
                      className="anon-card anon-card-display"
                      key={`${answer}-${idx}`}
                    >
                      <p className="anon-text anon-text-display">{answer}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {state.phase === "reveal" && (
              <>
                {showFunnyScreenBurst && (
                  <div
                    className="funny-screen-burst"
                    key={`funny-burst-${statusRevealCount}`}
                    aria-hidden="true"
                  >
                    <span className="funny-screen-confetti f1" />
                    <span className="funny-screen-confetti f2" />
                    <span className="funny-screen-confetti f3" />
                    <span className="funny-screen-confetti f4" />
                    <span className="funny-screen-confetti f5" />
                    <span className="funny-screen-confetti f6" />
                    <span className="funny-screen-confetti f7" />
                    <span className="funny-screen-confetti f8" />
                    <span className="funny-screen-confetti f9" />
                    <span className="funny-screen-confetti f10" />
                    <span className="funny-screen-confetti f11" />
                    <span className="funny-screen-confetti f12" />
                    <span className="funny-screen-confetti f13" />
                    <span className="funny-screen-confetti f14" />
                    <span className="funny-screen-emoji e1">😂</span>
                    <span className="funny-screen-emoji e2">🤣</span>
                    <span className="funny-screen-emoji e3">😆</span>
                    <span className="funny-screen-emoji e4">😂</span>
                    <span className="funny-screen-emoji e5">🤣</span>
                    <span className="funny-screen-emoji e6">😂</span>
                    <span className="funny-screen-emoji e7">😆</span>
                    <span className="funny-screen-emoji e8">🤣</span>
                    <span className="funny-screen-emoji e9">😂</span>
                    <span className="funny-screen-emoji e10">😆</span>
                  </div>
                )}
                {showBeerScreenBurst && (
                  <div
                    className="beer-screen-burst"
                    key={`beer-burst-${statusRevealCount}`}
                    aria-live="polite"
                  >
                    <span className="beer-screen-glow" aria-hidden="true" />
                    <span className="beer-screen-emoji b1" aria-hidden="true">
                      🍺
                    </span>
                    <span className="beer-screen-emoji b2" aria-hidden="true">
                      🍻
                    </span>
                    <span className="beer-screen-emoji b3" aria-hidden="true">
                      🍺
                    </span>
                    <span className="beer-screen-emoji b4" aria-hidden="true">
                      🍻
                    </span>
                    <span className="beer-screen-emoji b5" aria-hidden="true">
                      🍺
                    </span>
                    <div className="beer-screen-banner">
                      <strong>{latestStatusEntry?.playerName}</strong> paga una
                      cerveza 🍺
                    </div>
                  </div>
                )}
                <h2>Resultados</h2>
                <ul className="big-list reveal-list">
                  {revealAnswers
                    .slice(0, visibleRevealCount)
                    .map((entry, idx) => (
                      <li
                        key={entry.playerId}
                        className={`reveal-item big-reveal ${idx < statusRevealCount ? "revealed" : "pending"}`}
                        style={{
                          animationDelay: `${idx * 0.1}s`,
                        }}
                      >
                        <span className="reveal-answer-big">
                          <strong>{entry.playerName}</strong>: {entry.answer}
                        </span>
                        {idx < statusRevealCount && (
                          <span className="score-reveal-badge">
                            {entry.score > 0 ? "+" : ""}
                            {entry.score} → {entry.pointsAwarded} pts
                          </span>
                        )}
                      </li>
                    ))}
                </ul>
              </>
            )}

            {state.phase === "leaderboard" && (
              <>
                <h2>Clasificación</h2>
                <ol className="leaderboard-grid leaderboard-grid-display">
                  {leaderboardEntries.map((entry, idx) => {
                    const revealed = idx >= leaderboardRevealStartIndex;
                    const rank = idx + 1;
                    return (
                      <li
                        key={entry.id}
                        className={`leaderboard-card ${revealed ? "revealed" : "hidden"} ${
                          rank === 1
                            ? "place-1"
                            : rank === 2
                              ? "place-2"
                              : rank === 3
                                ? "place-3"
                                : ""
                        }`}
                      >
                        <div className="leaderboard-main">
                          <span className="leaderboard-rank">#{rank}</span>
                          <span className="leaderboard-name">{entry.name}</span>
                        </div>
                        <span className="leaderboard-score">
                          {entry.score} pts
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </>
            )}

            {state.phase === "finished" && (
              <>
                <div className="final-ceremony">
                  {showWinnerConfetti && (
                    <div
                      className="ceremony-overlay"
                      aria-hidden="true"
                      key="winner-confetti"
                    >
                      <span className="ceremony-confetti c1" />
                      <span className="ceremony-confetti c2" />
                      <span className="ceremony-confetti c3" />
                      <span className="ceremony-confetti c4" />
                      <span className="ceremony-confetti c5" />
                      <span className="ceremony-confetti c6" />
                      <span className="ceremony-confetti c7" />
                      <span className="ceremony-confetti c8" />
                    </div>
                  )}

                  <h2 className="ceremony-title">Ceremonia Final</h2>

                  <div className="final-non-podium">
                    <h3>GG, bien jugado, pero perdieron</h3>
                    {nonPodiumEntries.length > 0 ? (
                      <ol className="non-podium-list">
                        {nonPodiumEntries.map((entry, idx) => (
                          <li key={entry.id} className="non-podium-item">
                            <span className="non-podium-rank">#{idx + 4}</span>
                            <span className="non-podium-name">
                              {entry.name}
                            </span>
                            <span className="non-podium-score">
                              {entry.score} pts
                            </span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="non-podium-empty">
                        Solo hubieron ganadores.
                      </p>
                    )}
                  </div>

                  <div className="podium-stage">
                    {[1, 0, 2].map((index) => {
                      const entry = finalTopThree[index];
                      if (!entry) return null;

                      const rank = index + 1;
                      const revealed = isPodiumRankRevealed(rank);
                      return (
                        <div
                          key={entry.id}
                          className={`podium-column rank-${rank} ${revealed ? "revealed" : "hidden"}`}
                        >
                          <div className="podium-player">
                            {revealed ? entry.name : "???"}
                          </div>
                          <div className="podium-score">
                            {revealed ? `${entry.score} pts` : "--"}
                          </div>
                          <div className="podium-block">
                            <span className="podium-medal" aria-hidden="true">
                              {revealed
                                ? rank === 1
                                  ? "🥇"
                                  : rank === 2
                                    ? "🥈"
                                    : "🥉"
                                : "❔"}
                            </span>
                            <span className="podium-rank">#{rank}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
