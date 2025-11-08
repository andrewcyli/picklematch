import { PlayerSetup } from "@/components/PlayerSetup";
import { Match } from "@/lib/scheduler";

interface CheckInOutProps {
  gameCode: string;
  players: string[];
  onPlayersUpdate: (players: string[], teammatePairs?: { player1: string; player2: string }[]) => void;
  matches?: Match[];
  matchScores?: Map<string, { team1: number; team2: number }>;
  teammatePairs?: { player1: string; player2: string }[];
  onNavigateToMatches?: () => void;
  hasStartedMatches?: boolean;
}

export const CheckInOut = ({ gameCode, players, onPlayersUpdate, matches = [], matchScores = new Map(), teammatePairs = [], onNavigateToMatches, hasStartedMatches = false }: CheckInOutProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Player Check In/Out</h2>
        <p className="text-muted-foreground">Add or remove players from the game</p>
      </div>

      <PlayerSetup
        onComplete={(playerList, pairs) => {
          onPlayersUpdate(playerList, pairs);
          if (onNavigateToMatches) {
            onNavigateToMatches();
          }
        }}
        initialPlayers={players}
        initialTeammatePairs={teammatePairs}
        matches={matches}
        matchScores={matchScores}
        hasStartedMatches={hasStartedMatches}
      />
    </div>
  );
};
