/**
 * ClassicSetupView - Round-robin game configuration
 */
import React from "react";
import { GameSetup, type GameConfig } from "@/components/GameSetup";

interface ClassicSetupViewProps {
  gameCode?: string;
  onComplete: (config: GameConfig) => void;
  onNewSession?: () => void;
}

export const ClassicSetupView: React.FC<ClassicSetupViewProps> = ({
  gameCode,
  onComplete,
  onNewSession,
}) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <GameSetup
          onComplete={onComplete}
          gameCode={gameCode}
          onNewSession={onNewSession}
        />
      </div>
    </div>
  );
};

export default ClassicSetupView;
