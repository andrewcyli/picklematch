import { Badge } from "@/components/ui/badge";
import { Match } from "@/lib/scheduler";

interface FutureMatchCardProps {
  match: Match;
  matchNumber: string;
}

export const FutureMatchCard = ({ match, matchNumber }: FutureMatchCardProps) => {
  return (
    <div className="bg-card/50 rounded-lg p-2 opacity-60">
      <Badge variant="outline" className="text-xs mb-1">
        {matchNumber}
      </Badge>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="truncate flex-1">{match.team1.join(' & ')}</div>
        <div className="px-2">vs</div>
        <div className="truncate flex-1 text-right">{match.team2.join(' & ')}</div>
      </div>
    </div>
  );
};
