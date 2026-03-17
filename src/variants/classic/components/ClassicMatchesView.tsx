/**
 * ClassicMatchesView - Match scheduling and scoring
 */
import React from "react";
import { ScheduleView } from "@/components/ScheduleView";
import type { Match, GameConfig } from "@/core/types";

interface ClassicMatchesViewProps {
  matches: Match[];
  gameConfig: GameConfig;
  players: string[];
  matchScores: Map<string, { team1: number; team2: number }>;
  onMatchScoresUpdate: (scores: Map<string, { team1: number; team2: number }>) => void;
  isPlayerView: boolean;
  playerName: string | null;
  onShowPlayerSelector: () => void;
}

export const ClassicMatchesView: React.FC<ClassicMatchesViewProps> = ({
  matches,
  gameConfig,
  players,
  matchScores,
  onMatchScoresUpdate,
  isPlayerView,
  playerName,
  onShowPlayerSelector,
}) => {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <ScheduleView
          matches={matches}
          onBack={() => {}}
          gameConfig={gameConfig}
          allPlayers={players}
          onScheduleUpdate={() => {}}
          matchScores={matchScores}
          onMatchScoresUpdate={onMatchScoresUpdate}
          onCourtConfigUpdate={() => {}}
          isPlayerView={isPlayerView}
          playerName={playerName}
          onReleaseIdentity={() => {}}
          onShowPlayerSelector={onShowPlayerSelector}
        />
      </div>
    </div>
  );
};

export default ClassicMatchesView;
