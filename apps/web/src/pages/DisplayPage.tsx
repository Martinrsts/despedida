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
  const [leaderboardRevealCount, setLeaderboardRevealCount] = useState(0);
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
  const leaderboardEntries = state?.leaderboard || [];
  const leaderboardRevealStartIndex = Math.max(
    0,
    leaderboardEntries.length - leaderboardRevealCount,
  );
  const finalTopThree = leaderboardEntries.slice(0, 3);
  const latestStatusEntry =
    statusRevealCount > 0 ? revealAnswers[statusRevealCount - 1] : undefined;
  const showFunnyScreenBurst = Boolean(latestStatusEntry?.isFunny);

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
                <h2>Who wrote what?</h2>
                <ul className="big-list reveal-list">
                  {revealAnswers
                    .slice(0, visibleRevealCount)
                    .map((entry, idx) => (
                      <li
                        key={entry.playerId}
                        className={`reveal-item big-reveal ${
                          idx < statusRevealCount
                            ? entry.isCorrect
                              ? "correct"
                              : "incorrect"
                            : "pending"
                        }`}
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
                  <div className="ceremony-overlay" aria-hidden="true">
                    <span className="ceremony-confetti c1" />
                    <span className="ceremony-confetti c2" />
                    <span className="ceremony-confetti c3" />
                    <span className="ceremony-confetti c4" />
                    <span className="ceremony-confetti c5" />
                    <span className="ceremony-confetti c6" />
                    <span className="ceremony-confetti c7" />
                    <span className="ceremony-confetti c8" />
                  </div>

                  <h2 className="ceremony-title">Grand Final Podium</h2>

                  <div className="podium-stage">
                    {[1, 0, 2].map((index) => {
                      const entry = finalTopThree[index];
                      if (!entry) return null;

                      const rank = index + 1;
                      return (
                        <div
                          key={entry.id}
                          className={`podium-column rank-${rank}`}
                        >
                          <div className="podium-player">{entry.name}</div>
                          <div className="podium-score">{entry.score} pts</div>
                          <div className="podium-block">
                            <span className="podium-medal" aria-hidden="true">
                              {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
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
