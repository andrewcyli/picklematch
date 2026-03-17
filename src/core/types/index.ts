/**
 * Core Types for PickleMatch
 * Shared across all variants
 */

export interface CourtConfig {
  courtNumber: number;
  type: 'singles' | 'doubles';
}

export interface Match {
  id: string;
  court: number;
  startTime: number;
  endTime: number;
  team1: string[];
  team2: string[];
  score?: {
    team1: number;
    team2: number;
  };
  isBye?: boolean;
  round?: number;
  matchNumber?: number;
}

export type SchedulingType = 
  | 'round-robin' 
  | 'single-elimination' 
  | 'double-elimination' 
  | 'qualifier-tournament';

export type TournamentPlayStyle = 'singles' | 'doubles';

export interface GameConfig {
  gameDuration: number;
  totalTime: number;
  courts: number;
  teammatePairs?: TeammatePair[];
  courtConfigs?: CourtConfig[];
  schedulingType?: SchedulingType;
  tournamentPlayStyle?: TournamentPlayStyle;
}

export interface TeammatePair {
  player1: string;
  player2: string;
}

export interface GameState {
  id: string;
  gameCode: string;
  players: string[];
  matches: Match[];
  gameConfig: GameConfig;
  creatorId: string;
}

export type VariantType = 'classic' | 'tournament' | 'qualifier';

export interface PlayerIdentity {
  playerName: string | null;
  isPlayerView: boolean;
}

export type Section = 'setup' | 'players' | 'matches' | 'history' | 'leaderboard';

export type ViewportSize = 'mobile-portrait' | 'mobile-landscape' | 'tablet' | 'desktop';
