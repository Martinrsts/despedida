import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getSocket } from "../lib/socket";
import { GameState } from "../lib/types";

export const DisplayPage = () => {
  const socket = useMemo(() => getSocket(), []);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState<number>(25);

  useEffect(() => {
    const onState = (payload: GameState) => {
      setState(payload);
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
                <h2>{state.question?.text}</h2>
                <p className="timer large">{secondsLeft}s</p>
              </>
            )}

            {state.phase === "anon_answers" && (
              <>
                <h2>Anonymous answers</h2>
                <ul className="big-list">
                  {state.anonymousAnswers.map((answer, idx) => (
                    <li key={`${answer}-${idx}`}>{answer}</li>
                  ))}
                </ul>
              </>
            )}

            {state.phase === "host_judging" && (
              <h2>Host is selecting correct answers...</h2>
            )}

            {state.phase === "reveal" && (
              <>
                <h2>Who wrote what?</h2>
                <ul className="big-list">
                  {state.revealedAnswers.map((entry) => (
                    <li key={entry.playerId}>
                      <strong>{entry.playerName}</strong>: {entry.answer}{" "}
                      {entry.isCorrect ? "(correct)" : ""}
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
