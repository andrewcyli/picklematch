/**
 * ClassicLeaderboardView - Tournament standings
 */
import React from "react";
import { Leaderboard } from "@/components/Leaderboard";
import type { Match } from "@/core/types";

interface ClassicLeaderboardViewProps {
  players: string[];
  matches: Match[];
  matchScores: Map<string, { team1: number; team2: number }>;
}

export const ClassicLeaderboardView: React.FC<ClassicLeaderboardViewProps> = ({
  players,
  matches,
  matchScores,
}) => {
  if (matchScores.size === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No completed matches yet</p>
        <p className="text-sm text-muted-foreground mt-2">
          Complete some matches to see the leaderboard
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="text-center mb-3 flex-shrink-0">
        <h2 className="text-lg font-semibold">Tournament Standings</h2>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <Leaderboard
          players={players}
          matches={matches}
          matchScores={matchScores}
        />
      </div>
    </div>
  );
};

export default ClassicLeaderboardView;
