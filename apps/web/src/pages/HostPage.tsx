import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getSocket } from "../lib/socket";
import { Category, GameState } from "../lib/types";
import { getCategoryEmoji } from "../lib/categoryEmoji";

const initialCustomCategory: Category = "fun";
const DEFAULT_TOTAL_ROUNDS = 8;
const REVIEW_SCORES = [-3, -2, -1, 0, 1, 2, 3];

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
  const [totalRounds, setTotalRounds] = useState<number>(DEFAULT_TOTAL_ROUNDS);

  const [answerScores, setAnswerScores] = useState<Record<string, number>>({});
  const [selectedFunnyIds, setSelectedFunnyIds] = useState<string[]>([]);
  const [selectedBeerIds, setSelectedBeerIds] = useState<string[]>([]);
  const [revealStep, setRevealStep] = useState(0);
  const [leaderboardRevealCount, setLeaderboardRevealCount] = useState(0);
  const previousPhaseRef = useRef<GameState["phase"] | null>(null);

  useEffect(() => {
    const onState = (payload: GameState) => {
      setState(payload);
      setRoomCode(payload.roomCode);
      if (payload.phase !== "host_judging") {
        setAnswerScores({});
        setSelectedFunnyIds([]);
        setSelectedBeerIds([]);
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
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [leaderboardRevealCount, state]);

  const joinAsHost = (code?: string) => {
    const normalizedCode = code?.trim().toUpperCase();
    socket.emit(
      "join_room",
      {
        role: "host",
        roomCode: normalizedCode || undefined,
        totalRounds: normalizedCode ? undefined : totalRounds,
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

  const confirmCorrect = () => {
    socket.emit(
      "host_select_answers",
      {
        roomCode,
        answerScores,
        funnyPlayerIds: selectedFunnyIds,
        beerPlayerIds: selectedBeerIds,
      },
      (ack: { ok: boolean; error?: string }) => {
        if (!ack.ok) {
          setError(ack.error || "Could not submit scores.");
        }
      },
    );
  };

  const continueFlow = () => {
    socket.emit("host_continue", { roomCode });
  };

  const setScore = (playerId: string, score: number) => {
    setAnswerScores((current) => ({
      ...current,
      [playerId]: score,
    }));
  };

  const toggleFunny = (playerId: string) => {
    setSelectedFunnyIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId],
    );
  };

  const toggleBeer = (playerId: string) => {
    setSelectedBeerIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId],
    );
  };

  const revealAnswers = state?.revealedAnswers || [];
  const visibleRevealCount = Math.ceil(revealStep / 2);
  const statusRevealCount = Math.floor(revealStep / 2);
  const maxRevealSteps = revealAnswers.length * 2;
  const leaderboardEntries = state?.leaderboard || [];
  const leaderboardRevealStartIndex = Math.max(
    0,
    leaderboardEntries.length - leaderboardRevealCount,
  );
  const judgingAnswers = state?.judgingAnswers || [];
  const allAnswersScored =
    judgingAnswers.length > 0 &&
    judgingAnswers.every((entry) => answerScores[entry.playerId] !== undefined);

  return (
    <div className="page host-page">
      <div className="card host-card">
        <div className="top-nav">
          <Link to="/">Atrás</Link>
        </div>

        <h1>Panel del Anfitrión</h1>

        {!roomCode && (
          <div className="stack">
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
              <button className="btn" onClick={() => joinAsHost()}>
                Crear nueva sala
              </button>
            </div>

            <div className="inline-input">
              <input
                placeholder="Unirse a sala existente"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              />
              <button className="btn" onClick={() => joinAsHost(roomCodeInput)}>
                Unirse
              </button>
            </div>
          </div>
        )}

        {roomCode && <p className="badge">Código de sala: {roomCode}</p>}

        {error && <p className="error">{error}</p>}

        {state && (
          <>
            <p>
              Ronda {state.roundNumber}/{state.totalRounds} - {state.phaseLabel}
            </p>

            {state.phase === "lobby" && (
              <div className="stack">
                <h2>Sala de espera</h2>
                <p>Jugadores conectados: {state.playerCount}</p>
                <ul>
                  {state.players.map((player) => (
                    <li key={player.id}>
                      {player.name} {player.connected ? "" : "(offline)"}
                    </li>
                  ))}
                </ul>

                <button
                  className="btn"
                  onClick={startGame}
                  disabled={state.playerCount === 0}
                >
                  Empezar el juego
                </button>
              </div>
            )}

            {state.phase === "host_pick" && (
              <div className="stack">
                <h2>Seleccionar una pregunta</h2>
                {state.questionOptions.map((question) => (
                  <button
                    className="btn ghost"
                    key={question.id}
                    onClick={() => selectQuestion(question.id)}
                  >
                    {getCategoryEmoji(question.category)} {question.text}
                  </button>
                ))}
                <div className="section">
                  <h3>Agregar una pregunta personalizada para esta ronda</h3>
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
                      Agregar pregunta a la lista
                    </button>
                  </form>
                </div>
              </div>
            )}

            {state.phase === "answering" && (
              <div className="stack">
                <h2>Jugadores respondiendo...</h2>
                <p>{state.question?.text}</p>
              </div>
            )}

            {state.phase === "anon_answers" && (
              <div className="stack">
                <h2>Respuestas anónimas</h2>
                <p>
                  Revisa todas las respuestas antes de elegir las correctas.
                </p>
                <div className="anon-grid">
                  {state.anonymousAnswers.map((answer, idx) => (
                    <div className="anon-card" key={`${answer}-${idx}`}>
                      <p className="anon-text">{answer}</p>
                    </div>
                  ))}
                </div>
                <button className="btn" onClick={continueFlow}>
                  Juzgar respuestas
                </button>
              </div>
            )}

            {state.phase === "host_judging" && (
              <div className="stack">
                <h2>Asignar puntajes</h2>
                <p style={{ margin: "0 0 16px 0", color: "#666" }}>
                  Asigna una nota de -3 a 3 a cada respuesta. Ese puntaje se
                  convertirá en 0 a 1500 puntos.
                </p>
                <div className="answers-container">
                  {judgingAnswers.map((entry) => (
                    <div
                      key={entry.playerId}
                      className="answer-card score-card"
                    >
                      <div className="answer-card-main">
                        <span className="answer-text">{entry.answer}</span>
                        <span className="score-current">
                          {answerScores[entry.playerId] === undefined
                            ? "Sin puntaje"
                            : `Puntaje ${answerScores[entry.playerId] > 0 ? "+" : ""}${answerScores[entry.playerId]}`}
                        </span>
                      </div>
                      <div
                        className="score-picker"
                        role="group"
                        aria-label="Asignar puntaje"
                      >
                        {REVIEW_SCORES.map((score) => (
                          <button
                            key={score}
                            className={`score-toggle ${
                              answerScores[entry.playerId] === score
                                ? "selected"
                                : ""
                            }`}
                            onClick={() => setScore(entry.playerId, score)}
                            type="button"
                          >
                            {score > 0 ? `+${score}` : `${score}`}
                          </button>
                        ))}
                      </div>
                      <div className="bonus-row">
                        <button
                          className={`funny-toggle ${
                            selectedFunnyIds.includes(entry.playerId)
                              ? "selected"
                              : ""
                          }`}
                          onClick={() => toggleFunny(entry.playerId)}
                          type="button"
                        >
                          😂
                        </button>
                        <button
                          className={`beer-toggle ${
                            selectedBeerIds.includes(entry.playerId)
                              ? "selected"
                              : ""
                          }`}
                          onClick={() => toggleBeer(entry.playerId)}
                          type="button"
                        >
                          🍺
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  className="btn"
                  onClick={confirmCorrect}
                  disabled={!allAnswersScored}
                >
                  Confirmar
                </button>
              </div>
            )}

            {state.phase === "reveal" && (
              <div className="stack">
                <h2>Mostrando resultados</h2>
                <ul className="reveal-list">
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
                        <span className="reveal-answer">
                          {entry.playerName}: {entry.answer}
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
                <button
                  className="btn"
                  onClick={continueFlow}
                  disabled={revealStep < maxRevealSteps}
                >
                  {revealStep < maxRevealSteps
                    ? `Revelando ${statusRevealCount}/${revealAnswers.length}...`
                    : "Mostrar clasificación"}
                </button>
              </div>
            )}

            {state.phase === "leaderboard" && (
              <div className="stack">
                <h2>Tabla de clasificación</h2>
                <ol className="leaderboard-grid">
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
                <button className="btn" onClick={continueFlow}>
                  {leaderboardRevealCount < leaderboardEntries.length
                    ? `Revelando ${leaderboardRevealCount}/${leaderboardEntries.length}...`
                    : "Siguiente etapa"}
                </button>
              </div>
            )}

            {state.phase === "finished" && (
              <div className="stack">
                <h2>Resultados finales</h2>
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
