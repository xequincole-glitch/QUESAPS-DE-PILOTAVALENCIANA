export interface Question {
  id: number;
  category: string;
  text: string;
  options: string[];
  correctAnswer: number; // Index 0, 1, 2
  explanation: string;
}

export type Team = 'Roig' | 'Blau';
export type PlayerRole = 'Punter' | 'Mitger' | 'Rest';

export interface GameState {
  globalScore: { Roig: number; Blau: number }; // Games won (0, 5, 10, 15, 20, 25)
  currentJocScore: { Roig: number; Blau: number }; // Internal points (0, 1, 2, 3) where 0=Net, 1=15, 2=30, 3=Val
  turnTeam: Team;
  turnPlayerIndex: { Roig: number; Blau: number }; // 0 to 2
  questionIndex: number;
  phase: 'welcome' | 'playing' | 'feedback' | 'game_won' | 'match_won';
  feedbackMessage?: string;
  lastAnswerCorrect?: boolean;
  lastGameWinner?: Team;
}