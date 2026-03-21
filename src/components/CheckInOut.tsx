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
  gameCode,
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
    <div className="min-h-0 flex-1">
      <PlayerSetup
        onPlayersChange={onPlayersChange}
        onComplete={async (playerList, pairs) => {
          const success = await onPlayersUpdate(playerList, pairs);
          if (success && onNavigateToMatches) {
            onNavigateToMatches();
          }
        }}
        initialPlayers={players}
        initialTeammatePairs={teammatePairs}
        matches={matches}
        matchScores={matchScores}
        hasStartedMatches={hasStartedMatches}
        minimumPlayersRequired={minimumPlayersRequired}
      />
    </div>
  );
};
