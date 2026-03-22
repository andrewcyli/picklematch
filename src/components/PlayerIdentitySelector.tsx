import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User } from "lucide-react";

interface PlayerIdentitySelectorProps {
  players: string[];
  onSelect: (playerName: string) => void;
  onCancel: () => void;
}

export const PlayerIdentitySelector = ({ players, onSelect, onCancel }: PlayerIdentitySelectorProps) => {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-md space-y-4 border border-white/10 bg-slate-900/95 p-6 text-white shadow-2xl shadow-cyan-950/20">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold text-white">Select Your Name</h2>
          <p className="text-white/60">
            Tap your name to switch to player view and get match notifications
          </p>
        </div>

        <div className="grid max-h-[400px] grid-cols-2 gap-3 overflow-y-auto pr-1">
          {players.map((player) => (
            <button
              key={player}
              onClick={() => setSelectedPlayer(player)}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                selectedPlayer === player
                  ? "border-lime-300/50 bg-lime-300/10 shadow-lg shadow-lime-500/10"
                  : "border-white/10 bg-white/5 hover:border-lime-300/30 hover:bg-white/10"
              }`}
            >
              <Avatar className="h-12 w-12 border border-white/10">
                <AvatarFallback className="bg-emerald-300/20 text-white">
                  {getInitials(player)}
                </AvatarFallback>
              </Avatar>
              <span className="w-full break-words text-center text-sm font-medium text-white">
                {player}
              </span>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
            Cancel
          </Button>
          <Button
            onClick={() => selectedPlayer && onSelect(selectedPlayer)}
            disabled={!selectedPlayer}
            className="flex-1 bg-lime-400 text-slate-950 hover:bg-lime-300 disabled:bg-white/10 disabled:text-white/40"
          >
            <User className="mr-2 h-4 w-4" />
            Continue as Player
          </Button>
        </div>
      </Card>
    </div>
  );
};
