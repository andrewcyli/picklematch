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
      return <Badge className="bg-green-500">Playing Now</Badge>;
    }
    if (upNextCount > 0) {
      return <Badge className="bg-yellow-500">Resting</Badge>;
    }
    return <Badge variant="secondary">Done for Now</Badge>;
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
    <Card className="p-3 sm:p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div className="space-y-2 sm:space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm text-muted-foreground">Playing as</p>
            <h3 className="text-base sm:text-lg font-bold truncate">{playerName}</h3>
          </div>
          {getStatusBadge()}
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-2 border-t">
          <div className="space-y-0.5 sm:space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-3 w-3" />
              <span className="text-[10px] sm:text-xs">Matches</span>
            </div>
            <p className="text-sm sm:text-lg font-semibold">
              {matchesPlayed}/{totalMatches}
            </p>
          </div>

          <div className="space-y-0.5 sm:space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="text-[10px] sm:text-xs">Status</span>
            </div>
            <p className="text-[10px] sm:text-xs font-medium break-words">{getWaitMessage()}</p>
          </div>

          <div className="space-y-0.5 sm:space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span className="text-[10px] sm:text-xs">Queue</span>
            </div>
            <p className="text-sm sm:text-lg font-semibold">{upNextCount}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};
