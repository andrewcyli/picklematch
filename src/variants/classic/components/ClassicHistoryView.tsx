/**
 * ClassicHistoryView - Match history
 */
import React from "react";
import { MatchHistory } from "@/components/MatchHistory";
import type { Match } from "@/core/types";

interface ClassicHistoryViewProps {
  matches: Match[];
  matchScores: Map<string, { team1: number; team2: number }>;
}

export const ClassicHistoryView: React.FC<ClassicHistoryViewProps> = ({
  matches,
  matchScores,
}) => {
  return (
    <div className="flex-1 min-h-0">
      <MatchHistory matches={matches} matchScores={matchScores} />
    </div>
  );
};

export default ClassicHistoryView;
