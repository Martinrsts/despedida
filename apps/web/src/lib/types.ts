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

export interface DisplayAnswer {
  playerId: string;
  playerName: string;
  answer: string;
  score: number;
  pointsAwarded: number;
  isFunny: boolean;
  isBeer: boolean;
}

export interface GameState {
  role: "host" | "player" | "display";
  roomCode: string;
  phase: Phase;
  phaseLabel: string;
  roundNumber: number;
  totalRounds: number;
  timerEndsAt?: number;
  playerCount: number;
  players: Array<{
    id: string;
    name: string;
    connected: boolean;
    score: number;
  }>;
  question?: Question;
  anonymousAnswers: string[];
  revealedAnswers: DisplayAnswer[];
  questionOptions: Question[];
  leaderboard?: Array<{ id: string; name: string; score: number }>;
  yourScore?: number;
  hasSubmitted?: boolean;
  judgingAnswers?: Array<{
    playerId: string;
    answer: string;
    score?: number;
    isFunny: boolean;
    isBeer: boolean;
  }>;
}
