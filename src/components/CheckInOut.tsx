import { PlayerSetup } from "@/components/PlayerSetup";
import { Match } from "@/lib/scheduler";

interface CheckInOutProps {
  gameCode: string;
  players: string[];
  onPlayersChange: (
    players: string[],
    teammatePairs?: {
      player1: string;
      player2: string;
    }[]
  ) => void;
  onPlayersUpdate: (
    players: string[],
    teammatePairs?: {
      player1: string;
      player2: string;
    }[]
  ) => Promise<boolean>;
  matches?: Match[];
  matchScores?: Map<string, { team1: number; team2: number }>;
  teammatePairs?: {
    player1: string;
    player2: string;
  }[];
  onNavigateToMatches?: () => void;
  hasStartedMatches?: boolean;
  minimumPlayersRequired?: number;
}

export const CheckInOut = ({
  players,
  onPlayersChange,
  onPlayersUpdate,
  matches = [],
  matchScores = new Map(),
  teammatePairs = [],
  onNavigateToMatches,
  hasStartedMatches = false,
  minimumPlayersRequired = 2,
}: CheckInOutProps) => {
  return (
    <PlayerSetup
      onPlayersChange={onPlayersChange}
      onComplete={async (playerList, pairs) => {
        const success = await onPlayersUpdate(playerList, pairs);
        if (success) onNavigateToMatches?.();
      }}
      initialPlayers={players}
      initialTeammatePairs={teammatePairs}
      matches={matches}
      matchScores={matchScores}
      hasStartedMatches={hasStartedMatches}
      minimumPlayersRequired={minimumPlayersRequired}
    />
  );
};
