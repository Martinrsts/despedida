import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getSocket } from "../lib/socket";
import { Category, GameState } from "../lib/types";
import { getCategoryEmoji } from "../lib/categoryEmoji";

const initialCustomCategory: Category = "fun";

export const HostPage = () => {
  const socket = useMemo(() => getSocket(), []);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState("");

  const [customQuestionText, setCustomQuestionText] = useState("");
  const [customCategory, setCustomCategory] = useState<Category>(
    initialCustomCategory,
  );

  const [selectedCorrectIds, setSelectedCorrectIds] = useState<string[]>([]);
  const [selectedFunnyIds, setSelectedFunnyIds] = useState<string[]>([]);
  const [revealStep, setRevealStep] = useState(0);
  const [leaderboardRevealCount, setLeaderboardRevealCount] = useState(0);
  const previousPhaseRef = useRef<GameState["phase"] | null>(null);

  useEffect(() => {
    const onState = (payload: GameState) => {
      setState(payload);
      setRoomCode(payload.roomCode);
      if (payload.phase !== "host_judging") {
        setSelectedCorrectIds([]);
        setSelectedFunnyIds([]);
      }
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
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [leaderboardRevealCount, state]);

  const joinAsHost = (code?: string) => {
    socket.emit(
      "join_room",
      {
        role: "host",
        roomCode: code || undefined,
      },
      (ack: { ok: boolean; error?: string; roomCode?: string }) => {
        if (!ack.ok) {
          setError(ack.error || "Could not join room.");
          return;
        }
        setError("");
        if (ack.roomCode) {
          setRoomCode(ack.roomCode);
        }
      },
    );
  };

  const submitCustomQuestion = (event: FormEvent) => {
    event.preventDefault();
    if (!roomCode) return;
    socket.emit(
      "add_custom_question",
      {
        roomCode,
        text: customQuestionText,
        category: customCategory,
      },
      (ack: { ok: boolean; error?: string }) => {
        if (!ack.ok) {
          setError(ack.error || "Could not add custom question.");
          return;
        }
        setError("");
        setCustomQuestionText("");
        setCustomCategory(initialCustomCategory);
      },
    );
  };

  const startGame = () => {
    if (!roomCode) return;
    socket.emit("start_game", { roomCode });
  };

  const selectQuestion = (questionId: string) => {
    socket.emit(
      "host_select_question",
      { roomCode, questionId },
      (ack: { ok: boolean; error?: string }) => {
        if (!ack.ok) {
          setError(ack.error || "Could not choose question.");
        }
      },
    );
  };

  const toggleCorrect = (playerId: string) => {
    setSelectedCorrectIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId],
    );
  };

  const toggleFunny = (playerId: string) => {
    setSelectedFunnyIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId],
    );
  };

  const confirmCorrect = () => {
    socket.emit(
      "host_select_answers",
      {
        roomCode,
        correctPlayerIds: selectedCorrectIds,
        funnyPlayerIds: selectedFunnyIds,
      },
      (ack: { ok: boolean; error?: string }) => {
        if (!ack.ok) {
          setError(ack.error || "Could not submit correct answers.");
        }
      },
    );
  };

  const continueFlow = () => {
    socket.emit("host_continue", { roomCode });
  };

  const revealAnswers = state?.revealedAnswers || [];
  const visibleRevealCount = Math.ceil(revealStep / 2);
  const statusRevealCount = Math.floor(revealStep / 2);
  const maxRevealSteps = revealAnswers.length * 2;
  const leaderboardEntries = state?.leaderboard || [];

  return (
    <div className="page host-page">
      <div className="card host-card">
        <div className="top-nav">
          <Link to="/">Back</Link>
        </div>

        <h1>Host Panel</h1>

        {!roomCode && (
          <div className="stack">
            <button className="btn" onClick={() => joinAsHost()}>
              Create Room
            </button>

            <div className="inline-input">
              <input
                placeholder="Join existing room"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              />
              <button className="btn" onClick={() => joinAsHost(roomCodeInput)}>
                Join
              </button>
            </div>
          </div>
        )}

        {roomCode && <p className="badge">Room code: {roomCode}</p>}

        {error && <p className="error">{error}</p>}

        {state && (
          <>
            <p>
              Round {state.roundNumber}/{state.totalRounds} - {state.phaseLabel}
            </p>

            {state.phase === "lobby" && (
              <div className="stack">
                <h2>Lobby</h2>
                <p>Players connected: {state.playerCount}</p>
                <ul>
                  {state.players.map((player) => (
                    <li key={player.id}>
                      {player.name} {player.connected ? "" : "(offline)"}
                    </li>
                  ))}
                </ul>

                <div className="section">
                  <h3>Custom questions</h3>
                  <p>
                    Add up to 20 questions from lobby or while picking a round
                    question.
                  </p>
                  <form className="stack" onSubmit={submitCustomQuestion}>
                    <textarea
                      value={customQuestionText}
                      onChange={(e) => setCustomQuestionText(e.target.value)}
                      placeholder="Add custom question"
                      maxLength={120}
                    />
                    <select
                      value={customCategory}
                      onChange={(e) =>
                        setCustomCategory(e.target.value as Category)
                      }
                    >
                      <option value="safe">🟢 safe</option>
                      <option value="fun">😄 fun</option>
                      <option value="spicy">🌶️ spicy</option>
                    </select>
                    <button className="btn" type="submit">
                      Add custom question
                    </button>
                  </form>
                </div>

                <button
                  className="btn"
                  onClick={startGame}
                  disabled={state.playerCount === 0}
                >
                  Start game
                </button>
              </div>
            )}

            {state.phase === "host_pick" && (
              <div className="stack">
                <h2>Select one question</h2>
                <div className="section">
                  <h3>Add a custom question for this round</h3>
                  <form className="stack" onSubmit={submitCustomQuestion}>
                    <textarea
                      value={customQuestionText}
                      onChange={(e) => setCustomQuestionText(e.target.value)}
                      placeholder="Add custom question"
                      maxLength={120}
                    />
                    <select
                      value={customCategory}
                      onChange={(e) =>
                        setCustomCategory(e.target.value as Category)
                      }
                    >
                      <option value="safe">🟢 safe</option>
                      <option value="fun">😄 fun</option>
                      <option value="spicy">🌶️ spicy</option>
                    </select>
                    <button className="btn" type="submit">
                      Add custom question
                    </button>
                  </form>
                </div>
                {state.questionOptions.map((question) => (
                  <button
                    className="btn ghost"
                    key={question.id}
                    onClick={() => selectQuestion(question.id)}
                  >
                    {getCategoryEmoji(question.category)} {question.text}
                  </button>
                ))}
              </div>
            )}

            {state.phase === "answering" && (
              <div className="stack">
                <h2>Players are answering...</h2>
                <p>{state.question?.text}</p>
              </div>
            )}

            {state.phase === "anon_answers" && (
              <div className="stack">
                <h2>Anonymous answers</h2>
                <p>Review all responses before choosing the correct ones.</p>
                <div className="anon-grid">
                  {state.anonymousAnswers.map((answer, idx) => (
                    <div className="anon-card" key={`${answer}-${idx}`}>
                      <p className="anon-text">{answer}</p>
                    </div>
                  ))}
                </div>
                <button className="btn" onClick={continueFlow}>
                  Judge answers
                </button>
              </div>
            )}

            {state.phase === "host_judging" && (
              <div className="stack">
                <div className="judging-header">
                  <h2>Select correct answers</h2>
                  <div className="judging-counters">
                    <span className="selection-counter">
                      {selectedCorrectIds.length} correct
                    </span>
                    <span className="funny-counter">
                      {selectedFunnyIds.length} funny 😂
                    </span>
                  </div>
                </div>
                <p style={{ margin: "0 0 16px 0", color: "#666" }}>
                  Tap each answer to mark it as correct, or press 😂 for a
                  funny-answer bonus.{" "}
                  {(selectedCorrectIds.length > 0 ||
                    selectedFunnyIds.length > 0) &&
                    "Click confirm when ready."}
                </p>
                <div className="answers-container">
                  {(state.judgingAnswers || []).map((entry) => (
                    <div
                      key={entry.playerId}
                      className={`answer-card ${
                        selectedCorrectIds.includes(entry.playerId)
                          ? "selected"
                          : ""
                      }`}
                      onClick={() => toggleCorrect(entry.playerId)}
                    >
                      <div className="answer-checkbox">
                        {selectedCorrectIds.includes(entry.playerId) && "✓"}
                      </div>
                      <span className="answer-text">{entry.answer}</span>
                      <button
                        className={`funny-toggle ${
                          selectedFunnyIds.includes(entry.playerId)
                            ? "selected"
                            : ""
                        }`}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleFunny(entry.playerId);
                        }}
                        title="Mark as funny answer bonus"
                        type="button"
                      >
                        😂
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  className="btn"
                  onClick={confirmCorrect}
                  disabled={
                    selectedCorrectIds.length === 0 &&
                    selectedFunnyIds.length === 0
                  }
                >
                  Confirm {selectedCorrectIds.length} correct answer
                  {selectedCorrectIds.length !== 1 ? "s" : ""}
                  {selectedFunnyIds.length > 0
                    ? ` + ${selectedFunnyIds.length} funny bonus`
                    : ""}
                </button>
              </div>
            )}

            {state.phase === "reveal" && (
              <div className="stack">
                <h2>Reveal</h2>
                <ul className="reveal-list">
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
                        <span className="reveal-answer">
                          {entry.playerName}: {entry.answer}
                        </span>
                        {idx < statusRevealCount && (
                          <span
                            className={`reveal-status ${entry.isCorrect ? "correct" : "incorrect"}`}
                          >
                            {entry.isCorrect ? "✓ Correct" : "✗ Incorrect"}
                          </span>
                        )}
                      </li>
                    ))}
                </ul>
                <button
                  className="btn"
                  onClick={continueFlow}
                  disabled={revealStep < maxRevealSteps}
                >
                  {revealStep < maxRevealSteps
                    ? `Showing ${statusRevealCount}/${revealAnswers.length}...`
                    : "Show leaderboard"}
                </button>
              </div>
            )}

            {state.phase === "leaderboard" && (
              <div className="stack">
                <h2>Leaderboard</h2>
                <ol className="leaderboard-grid">
                  {leaderboardEntries
                    .slice(0, leaderboardRevealCount)
                    .map((entry, idx) => (
                      <li
                        key={entry.id}
                        className={`leaderboard-card ${
                          idx === 0
                            ? "place-1"
                            : idx === 1
                              ? "place-2"
                              : idx === 2
                                ? "place-3"
                                : ""
                        }`}
                      >
                        <div className="leaderboard-main">
                          <span className="leaderboard-rank">#{idx + 1}</span>
                          <span className="leaderboard-name">{entry.name}</span>
                        </div>
                        <span className="leaderboard-score">
                          {entry.score} pts
                        </span>
                      </li>
                    ))}
                </ol>
                <button className="btn" onClick={continueFlow}>
                  {leaderboardRevealCount < leaderboardEntries.length
                    ? `Revealing ${leaderboardRevealCount}/${leaderboardEntries.length}...`
                    : "Next step"}
                </button>
              </div>
            )}

            {state.phase === "finished" && (
              <div className="stack">
                <h2>Final results</h2>
                <ol>
                  {(state.leaderboard || []).map((entry) => (
                    <li key={entry.id}>
                      {entry.name}: {entry.score}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
