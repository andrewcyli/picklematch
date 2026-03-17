/**
 * ClassicMyMatchesView - Player-focused match view
 */
import React from "react";
import { MyMatchesView } from "@/components/MyMatchesView";
import type { Match } from "@/core/types";

interface ClassicMyMatchesViewProps {
  playerName: string;
  matchGroups: any[];
  matchScores: Map<string, { team1: number; team2: number }>;
  currentTime: Date;
  allMatches: Match[];
  onReleaseIdentity: () => void;
  onSkipMatch: (matchId: string) => void;
}

export const ClassicMyMatchesView: React.FC<ClassicMyMatchesViewProps> = (props) => {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <MyMatchesView {...props} />
    </div>
  );
};

export default ClassicMyMatchesView;
