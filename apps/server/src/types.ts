export type Role = "host" | "player" | "display";

export type Category = "safe" | "fun" | "spicy";

export type Phase =
  | "lobby"
  | "host_pick"
  | "answering"
  | "anon_answers"
  | "host_judging"
  | "reveal"
  | "leaderboard"
  | "finished";

export interface Question {
  id: string;
  text: string;
  category: Category;
  source: "predefined" | "custom";
}

export interface Player {
  id: string;
  token: string;
  name: string;
  score: number;
  connected: boolean;
  socketId?: string;
}

export interface RoundState {
  number: number;
  questionOptions: Question[];
  selectedQuestion?: Question;
  answers: Record<string, string>;
  selectedCorrectPlayerIds: string[];
  selectedFunnyPlayerIds: string[];
  selectedBeerPlayerIds: string[];
  expectedAnswerPlayerIds: string[];
}

export interface Room {
  code: string;
  hostSocketId?: string;
  displaySocketIds: Set<string>;
  players: Record<string, Player>;
  phase: Phase;
  roundNumber: number;
  totalRounds: number;
  customQuestions: Question[];
  usedQuestionIds: Set<string>;
  currentRound?: RoundState;
  timerEndsAt?: number;
  answerTimeout?: NodeJS.Timeout;
}

export interface JoinRoomPayload {
  role: Role;
  roomCode?: string;
  name?: string;
  playerToken?: string;
}

export interface JoinRoomAck {
  ok: boolean;
  error?: string;
  roomCode?: string;
  playerId?: string;
  playerToken?: string;
}

export interface AddCustomQuestionPayload {
  roomCode: string;
  text: string;
  category?: Category;
}

export interface SubmitAnswerPayload {
  roomCode: string;
  answer: string;
}

export interface SelectQuestionPayload {
  roomCode: string;
  questionId: string;
}

export interface HostSelectAnswersPayload {
  roomCode: string;
  correctPlayerIds: string[];
  funnyPlayerIds?: string[];
  beerPlayerIds?: string[];
}
