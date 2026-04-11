import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getSocket } from "../lib/socket";
import { Category, GameState } from "../lib/types";

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

  useEffect(() => {
    const onState = (payload: GameState) => {
      setState(payload);
      setRoomCode(payload.roomCode);
      if (payload.phase !== "host_judging") {
        setSelectedCorrectIds([]);
      }
    };

    socket.on("state_sync", onState);
    return () => {
      socket.off("state_sync", onState);
    };
  }, [socket]);

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

  const confirmCorrect = () => {
    socket.emit(
      "host_select_answers",
      {
        roomCode,
        correctPlayerIds: selectedCorrectIds,
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
                  <p>Add up to 20 questions before the game starts.</p>
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
                      <option value="safe">safe</option>
                      <option value="fun">fun</option>
                      <option value="spicy">spicy</option>
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
                {state.questionOptions.map((question) => (
                  <button
                    className="btn ghost"
                    key={question.id}
                    onClick={() => selectQuestion(question.id)}
                  >
                    [{question.category}] {question.text}
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
                <ul>
                  {state.anonymousAnswers.map((answer, idx) => (
                    <li key={`${answer}-${idx}`}>{answer}</li>
                  ))}
                </ul>
                <button className="btn" onClick={continueFlow}>
                  Judge answers
                </button>
              </div>
            )}

            {state.phase === "host_judging" && (
              <div className="stack">
                <h2>Select correct answers</h2>
                {(state.judgingAnswers || []).map((entry) => (
                  <label className="check" key={entry.playerId}>
                    <input
                      type="checkbox"
                      checked={selectedCorrectIds.includes(entry.playerId)}
                      onChange={() => toggleCorrect(entry.playerId)}
                    />
                    <span>{entry.answer}</span>
                  </label>
                ))}
                <button className="btn" onClick={confirmCorrect}>
                  Confirm selections
                </button>
              </div>
            )}

            {state.phase === "reveal" && (
              <div className="stack">
                <h2>Reveal</h2>
                <ul>
                  {state.revealedAnswers.map((entry) => (
                    <li key={entry.playerId}>
                      {entry.playerName}: {entry.answer}{" "}
                      {entry.isCorrect ? "(correct)" : ""}
                    </li>
                  ))}
                </ul>
                <button className="btn" onClick={continueFlow}>
                  Show leaderboard
                </button>
              </div>
            )}

            {state.phase === "leaderboard" && (
              <div className="stack">
                <h2>Leaderboard</h2>
                <ol>
                  {(state.leaderboard || []).map((entry) => (
                    <li key={entry.id}>
                      {entry.name}: {entry.score}
                    </li>
                  ))}
                </ol>
                <button className="btn" onClick={continueFlow}>
                  Next step
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
                {state.finalAwards && (
                  <div>
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
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
