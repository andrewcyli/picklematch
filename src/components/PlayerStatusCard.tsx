import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Match } from "@/lib/scheduler";
import { Clock, TrendingUp, Users } from "lucide-react";

interface PlayerStatusCardProps {
  playerName: string;
  currentMatch: Match | null;
  upNextCount: number;
  matchesPlayed: number;
  totalMatches: number;
}

export const PlayerStatusCard = ({
  playerName,
  currentMatch,
  upNextCount,
  matchesPlayed,
  totalMatches,
}: PlayerStatusCardProps) => {
  const getStatusBadge = () => {
    if (currentMatch) {
      return <Badge className="bg-emerald-500 text-white border-0">Playing Now</Badge>;
    }
    if (upNextCount > 0) {
      return <Badge className="bg-amber-500 text-white border-0">Resting</Badge>;
    }
    return <Badge className="bg-white/10 text-white/70 border-0">Done for Now</Badge>;
  };

  const getWaitMessage = () => {
    if (currentMatch) {
      return `Court ${currentMatch.court}`;
    }
    if (upNextCount === 1) {
      return "You're on deck!";
    }
    if (upNextCount > 1) {
      return `${upNextCount} matches until yours`;
    }
    return "Check back later";
  };

  return (
    <Card className="p-3 sm:p-4 border-white/10 bg-[linear-gradient(135deg,rgba(16,86,74,0.3),rgba(9,18,31,0.6))]">
      <div className="space-y-2 sm:space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm text-white/50">Playing as</p>
            <h3 className="text-base sm:text-lg font-bold text-white truncate">{playerName}</h3>
          </div>
          {getStatusBadge()}
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-2 border-t border-white/10">
          <div className="space-y-0.5 sm:space-y-1">
            <div className="flex items-center gap-1 text-white/50">
              <Users className="h-3 w-3" />
              <span className="text-[10px] sm:text-xs">Matches</span>
            </div>
            <p className="text-sm sm:text-lg font-semibold text-white">
              {matchesPlayed}/{totalMatches}
            </p>
          </div>

          <div className="space-y-0.5 sm:space-y-1">
            <div className="flex items-center gap-1 text-white/50">
              <Clock className="h-3 w-3" />
              <span className="text-[10px] sm:text-xs">Status</span>
            </div>
            <p className="text-[10px] sm:text-xs font-medium text-white/80 break-words">{getWaitMessage()}</p>
          </div>

          <div className="space-y-0.5 sm:space-y-1">
            <div className="flex items-center gap-1 text-white/50">
              <TrendingUp className="h-3 w-3" />
              <span className="text-[10px] sm:text-xs">Queue</span>
            </div>
            <p className="text-sm sm:text-lg font-semibold text-white">{upNextCount}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};
