import cors from "cors";
import express from "express";
import { createServer } from "http";
import { randomUUID } from "crypto";
import { Server, Socket } from "socket.io";
import { predefinedQuestions } from "./questions.js";
import {
  AddCustomQuestionPayload,
  HostSelectAnswersPayload,
  JoinRoomAck,
  JoinRoomPayload,
  Phase,
  Player,
  Question,
  Role,
  Room,
  SelectQuestionPayload,
  SubmitAnswerPayload,
} from "./types.js";

const PORT = Number(process.env.PORT || 4000);
const normalizeOrigin = (value: string): string => {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  const host = value.includes(".") ? value : `${value}.onrender.com`;
  return `https://${host}`;
};

const CLIENT_ORIGIN = normalizeOrigin(
  process.env.CLIENT_ORIGIN || "http://localhost:5173",
);

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
  },
});

const rooms = new Map<string, Room>();

const socketMeta = new Map<
  string,
  { role: Role; roomCode: string; playerId?: string }
>();

const PHASE_LABEL: Record<Phase, string> = {
  lobby: "Waiting for host to start",
  host_pick: "Host is choosing a question...",
  answering: "Players are answering",
  anon_answers: "Anonymous answers",
  host_judging: "Host is selecting correct answers",
  reveal: "Revealing authors",
  leaderboard: "Leaderboard",
  finished: "Game finished",
};

const clampText = (value: string, max = 140): string =>
  value.trim().slice(0, max);

const generateRoomCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  if (rooms.has(code)) {
    return generateRoomCode();
  }
  return code;
};

const createRoom = (hostSocketId: string): Room => {
  const room: Room = {
    code: generateRoomCode(),
    hostSocketId,
    displaySocketIds: new Set(),
    players: {},
    phase: "lobby",
    roundNumber: 0,
    totalRounds: 8,
    customQuestions: [],
    usedQuestionIds: new Set(),
  };
  rooms.set(room.code, room);
  return room;
};

const roomPlayers = (room: Room): Player[] => Object.values(room.players);

const leaderboard = (room: Room): Player[] =>
  roomPlayers(room)
    .slice()
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

const activePlayerCount = (room: Room): number =>
  roomPlayers(room).filter((p) => p.connected).length ||
  roomPlayers(room).length ||
  1;

const randomPickUnique = <T>(source: T[], amount: number): T[] => {
  const copy = source.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, amount);
};

const getQuestionPool = (room: Room): Question[] => {
  return [...predefinedQuestions, ...room.customQuestions].filter(
    (q) => !room.usedQuestionIds.has(q.id),
  );
};

const createQuestionOptions = (room: Room): Question[] => {
  const pool = getQuestionPool(room);
  if (pool.length < 5) {
    room.usedQuestionIds.clear();
  }
  const refreshedPool = getQuestionPool(room);
  return randomPickUnique(refreshedPool, Math.min(5, refreshedPool.length));
};

const clearAnswerTimer = (room: Room): void => {
  if (room.answerTimeout) {
    clearTimeout(room.answerTimeout);
    room.answerTimeout = undefined;
  }
  room.timerEndsAt = undefined;
};

const allExpectedPlayersAnswered = (room: Room): boolean => {
  if (!room.currentRound) return false;

  const expectedPlayerIds = room.currentRound.expectedAnswerPlayerIds;

  if (expectedPlayerIds.length === 0) {
    return false;
  }

  return expectedPlayerIds.every((playerId) =>
    Boolean(room.currentRound?.answers[playerId]),
  );
};

const buildAwards = (
  room: Room,
): { bestFriend: string; leastKnowledge: string; mostCreative: string } => {
  const ranking = leaderboard(room);
  const bestFriend = ranking[0]?.name || "No winner";
  const leastKnowledge = ranking[ranking.length - 1]?.name || "No player";

  const answerEntries = Object.entries(room.currentRound?.answers || {});
  const mostCreative = answerEntries
    .map(([playerId, answer]) => ({
      playerName: room.players[playerId]?.name || "Unknown",
      answer,
    }))
    .sort(
      (a, b) =>
        b.answer.length - a.answer.length ||
        a.playerName.localeCompare(b.playerName),
    )[0]?.playerName;

  return {
    bestFriend,
    leastKnowledge,
    mostCreative: mostCreative || bestFriend,
  };
};

const baseState = (room: Room) => {
  const round = room.currentRound;
  return {
    roomCode: room.code,
    phase: room.phase,
    phaseLabel: PHASE_LABEL[room.phase],
    roundNumber: room.roundNumber,
    totalRounds: room.totalRounds,
    timerEndsAt: room.timerEndsAt,
    playerCount: roomPlayers(room).length,
    players: roomPlayers(room).map((p) => ({
      id: p.id,
      name: p.name,
      connected: p.connected,
      score: p.score,
    })),
    question: round?.selectedQuestion,
    anonymousAnswers: Object.values(round?.answers || {}),
    revealedAnswers: Object.entries(round?.answers || {}).map(
      ([playerId, answer]) => ({
        playerId,
        playerName: room.players[playerId]?.name || "Unknown",
        answer,
        isCorrect: (round?.selectedCorrectPlayerIds || []).includes(playerId),
      }),
    ),
    questionOptions: round?.questionOptions || [],
    leaderboard: leaderboard(room).map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
    })),
    finalAwards: room.phase === "finished" ? buildAwards(room) : null,
  };
};

const emitState = (room: Room): void => {
  const common = baseState(room);

  if (room.hostSocketId) {
    io.to(room.hostSocketId).emit("state_sync", {
      role: "host",
      ...common,
      judgingAnswers: Object.entries(room.currentRound?.answers || {}).map(
        ([playerId, answer]) => ({
          playerId,
          answer,
        }),
      ),
    });
  }

  room.displaySocketIds.forEach((socketId) => {
    io.to(socketId).emit("state_sync", {
      role: "display",
      ...common,
    });
  });

  roomPlayers(room).forEach((player) => {
    if (!player.socketId) return;
    io.to(player.socketId).emit("state_sync", {
      role: "player",
      ...common,
      leaderboard: undefined,
      yourScore: player.score,
      hasSubmitted: Boolean(room.currentRound?.answers[player.id]),
    });
  });
};

const finishGame = (room: Room): void => {
  clearAnswerTimer(room);
  room.phase = "finished";
  const ranking = leaderboard(room).map((p) => ({
    name: p.name,
    score: p.score,
  }));
  const awards = buildAwards(room);

  io.to(room.code).emit("game_finished", {
    ranking,
    awards,
  });
  emitState(room);
};

const moveToPhase = (room: Room, phase: Phase): void => {
  room.phase = phase;
  emitState(room);
};

const beginNewRound = (room: Room): void => {
  clearAnswerTimer(room);
  const options = createQuestionOptions(room);
  room.currentRound = {
    number: room.roundNumber,
    questionOptions: options,
    answers: {},
    selectedCorrectPlayerIds: [],
    expectedAnswerPlayerIds: [],
  };
  room.phase = "host_pick";

  if (room.hostSocketId) {
    io.to(room.hostSocketId).emit("new_round", {
      roundNumber: room.roundNumber,
      options,
    });
  }
  emitState(room);
};

const startAnswering = (room: Room): void => {
  if (!room.currentRound?.selectedQuestion) return;

  room.currentRound.expectedAnswerPlayerIds = roomPlayers(room)
    .filter((player) => player.connected)
    .map((player) => player.id);

  room.phase = "answering";
  room.timerEndsAt = Date.now() + 25000;
  room.answerTimeout = setTimeout(() => {
    room.phase = "anon_answers";
    room.timerEndsAt = undefined;
    room.answerTimeout = undefined;
    emitState(room);
  }, 25000);

  io.to(room.code).emit("new_round", {
    roundNumber: room.roundNumber,
    question: room.currentRound.selectedQuestion,
    timerSeconds: 25,
  });

  emitState(room);
};

const applyScores = (room: Room): void => {
  if (!room.currentRound) return;
  const correctIds = room.currentRound.selectedCorrectPlayerIds;
  const ratio = correctIds.length / activePlayerCount(room);
  const bonus = ratio < 0.3 ? 100 : 0;

  correctIds.forEach((playerId) => {
    const player = room.players[playerId];
    if (!player) return;
    player.score += 100 + bonus;
  });

  io.to(room.code).emit("update_scores", {
    leaderboard: leaderboard(room).map((p) => ({
      name: p.name,
      score: p.score,
    })),
    bonusApplied: bonus === 100,
  });
};

const bindSocketMeta = (
  socket: Socket,
  role: Role,
  roomCode: string,
  playerId?: string,
): void => {
  socketMeta.set(socket.id, { role, roomCode, playerId });
};

const findPlayerByToken = (room: Room, token: string): Player | undefined => {
  return roomPlayers(room).find((player) => player.token === token);
};

io.on("connection", (socket) => {
  socket.on(
    "join_room",
    (payload: JoinRoomPayload, cb?: (ack: JoinRoomAck) => void) => {
      const role = payload.role;
      let room: Room | undefined;

      if (role === "host" && !payload.roomCode) {
        room = createRoom(socket.id);
      } else if (payload.roomCode) {
        room = rooms.get(payload.roomCode.toUpperCase());
      }

      if (!room) {
        cb?.({ ok: false, error: "Room not found." });
        return;
      }

      socket.join(room.code);

      if (role === "host") {
        room.hostSocketId = socket.id;
        bindSocketMeta(socket, role, room.code);
        cb?.({ ok: true, roomCode: room.code });
      }

      if (role === "display") {
        room.displaySocketIds.add(socket.id);
        bindSocketMeta(socket, role, room.code);
        cb?.({ ok: true, roomCode: room.code });
      }

      if (role === "player") {
        const cleanedName = clampText(payload.name || "Player", 24) || "Player";
        const incomingToken = payload.playerToken?.trim();
        const existing = incomingToken
          ? findPlayerByToken(room, incomingToken)
          : undefined;

        if (existing) {
          existing.connected = true;
          existing.socketId = socket.id;
          existing.name = cleanedName || existing.name;
          bindSocketMeta(socket, role, room.code, existing.id);

          cb?.({
            ok: true,
            roomCode: room.code,
            playerId: existing.id,
            playerToken: existing.token,
          });
        } else {
          const id = randomUUID();
          const token = randomUUID();
          room.players[id] = {
            id,
            token,
            name: cleanedName,
            score: 0,
            connected: true,
            socketId: socket.id,
          };

          bindSocketMeta(socket, role, room.code, id);

          cb?.({
            ok: true,
            roomCode: room.code,
            playerId: id,
            playerToken: token,
          });
        }
      }

      emitState(room);
    },
  );

  socket.on("start_game", ({ roomCode }: { roomCode: string }) => {
    const room = rooms.get(roomCode?.toUpperCase());
    if (!room || room.hostSocketId !== socket.id) return;
    if (room.phase !== "lobby") return;

    room.roundNumber = 1;
    beginNewRound(room);
  });

  socket.on(
    "add_custom_question",
    (payload: AddCustomQuestionPayload, cb?: (ack: JoinRoomAck) => void) => {
      const room = rooms.get(payload.roomCode?.toUpperCase());
      if (!room || room.hostSocketId !== socket.id) {
        cb?.({ ok: false, error: "Unauthorized." });
        return;
      }

      if (room.phase !== "lobby") {
        cb?.({
          ok: false,
          error: "Custom questions can be added only before game starts.",
        });
        return;
      }

      if (room.customQuestions.length >= 20) {
        cb?.({ ok: false, error: "Limit reached (20)." });
        return;
      }

      const text = clampText(payload.text, 120);
      if (!text) {
        cb?.({ ok: false, error: "Question text is required." });
        return;
      }

      const category = payload.category || "fun";
      const question: Question = {
        id: `c-${randomUUID()}`,
        text,
        category,
        source: "custom",
      };

      room.customQuestions.push(question);
      emitState(room);
      cb?.({ ok: true });
    },
  );

  socket.on(
    "host_select_question",
    (payload: SelectQuestionPayload, cb?: (ack: JoinRoomAck) => void) => {
      const room = rooms.get(payload.roomCode?.toUpperCase());
      if (
        !room ||
        room.hostSocketId !== socket.id ||
        room.phase !== "host_pick" ||
        !room.currentRound
      ) {
        cb?.({ ok: false, error: "Cannot select question now." });
        return;
      }

      const selected = room.currentRound.questionOptions.find(
        (q) => q.id === payload.questionId,
      );
      if (!selected) {
        cb?.({ ok: false, error: "Invalid question." });
        return;
      }

      room.currentRound.selectedQuestion = selected;
      room.usedQuestionIds.add(selected.id);
      room.currentRound.answers = {};
      room.currentRound.selectedCorrectPlayerIds = [];

      startAnswering(room);
      cb?.({ ok: true });
    },
  );

  socket.on(
    "submit_answer",
    (payload: SubmitAnswerPayload, cb?: (ack: JoinRoomAck) => void) => {
      const meta = socketMeta.get(socket.id);
      if (!meta || meta.role !== "player" || !meta.playerId) {
        cb?.({ ok: false, error: "Unauthorized." });
        return;
      }

      const room = rooms.get(payload.roomCode?.toUpperCase());
      if (!room || room.phase !== "answering" || !room.currentRound) {
        cb?.({ ok: false, error: "Cannot submit now." });
        return;
      }

      if (room.currentRound.answers[meta.playerId]) {
        cb?.({ ok: false, error: "You already submitted this round." });
        return;
      }

      const text = clampText(payload.answer, 120);
      if (!text) {
        cb?.({ ok: false, error: "Answer cannot be empty." });
        return;
      }

      room.currentRound.answers[meta.playerId] = text;
      cb?.({ ok: true });

      if (allExpectedPlayersAnswered(room)) {
        clearAnswerTimer(room);
        room.phase = "anon_answers";
      }

      emitState(room);
    },
  );

  socket.on("host_continue", ({ roomCode }: { roomCode: string }) => {
    const room = rooms.get(roomCode?.toUpperCase());
    if (!room || room.hostSocketId !== socket.id) return;

    if (room.phase === "anon_answers") {
      moveToPhase(room, "host_judging");
      return;
    }

    if (room.phase === "reveal") {
      moveToPhase(room, "leaderboard");
      return;
    }

    if (room.phase === "leaderboard") {
      if (room.roundNumber >= room.totalRounds) {
        finishGame(room);
      } else {
        room.roundNumber += 1;
        beginNewRound(room);
      }
    }
  });

  socket.on(
    "host_select_answers",
    (payload: HostSelectAnswersPayload, cb?: (ack: JoinRoomAck) => void) => {
      const room = rooms.get(payload.roomCode?.toUpperCase());
      if (
        !room ||
        room.hostSocketId !== socket.id ||
        room.phase !== "host_judging" ||
        !room.currentRound
      ) {
        cb?.({ ok: false, error: "Cannot judge answers now." });
        return;
      }

      const answerPlayerIds = Object.keys(room.currentRound.answers);
      room.currentRound.selectedCorrectPlayerIds =
        payload.correctPlayerIds.filter((id) => answerPlayerIds.includes(id));

      applyScores(room);
      room.phase = "reveal";

      emitState(room);
      cb?.({ ok: true });
    },
  );

  socket.on("new_round", ({ roomCode }: { roomCode: string }) => {
    const room = rooms.get(roomCode?.toUpperCase());
    if (!room || room.hostSocketId !== socket.id) return;
    if (room.phase !== "leaderboard") return;

    if (room.roundNumber >= room.totalRounds) {
      finishGame(room);
      return;
    }

    room.roundNumber += 1;
    beginNewRound(room);
  });

  socket.on("disconnect", () => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;

    const room = rooms.get(meta.roomCode);
    if (!room) {
      socketMeta.delete(socket.id);
      return;
    }

    if (meta.role === "host" && room.hostSocketId === socket.id) {
      room.hostSocketId = undefined;
    }

    if (meta.role === "display") {
      room.displaySocketIds.delete(socket.id);
    }

    if (
      meta.role === "player" &&
      meta.playerId &&
      room.players[meta.playerId]
    ) {
      room.players[meta.playerId].connected = false;
      room.players[meta.playerId].socketId = undefined;
    }

    socketMeta.delete(socket.id);
    emitState(room);
  });
});

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${PORT}`);
});
