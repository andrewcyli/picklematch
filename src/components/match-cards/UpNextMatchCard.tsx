import { Badge } from "@/components/ui/badge";
import { Clock, Users } from "lucide-react";
import { Match } from "@/lib/scheduler";

interface UpNextMatchCardProps {
  match: Match;
  matchNumber: string;
}

export const UpNextMatchCard = ({ match, matchNumber }: UpNextMatchCardProps) => {
  return (
    <div className="border border-accent bg-accent/5 rounded-lg p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <Badge className="bg-accent text-accent-foreground text-xs">
          {matchNumber} • Up Next
        </Badge>
        <Badge variant="outline" className="text-xs">
          <Clock className="w-3 h-3 mr-1" />
          {match.clockStartTime || new Date(Date.now() + match.startTime * 60000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </Badge>
      </div>

      {/* Teams */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 p-1.5 rounded bg-secondary/30">
          <Users className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <div className="text-sm font-medium">
            <div className="truncate">{match.team1[0]}</div>
            {!match.isSingles && match.team1[1] && (
              <div className="text-muted-foreground text-xs truncate">{match.team1[1]}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 p-1.5 rounded bg-secondary/30">
          <Users className="w-3.5 h-3.5 text-accent flex-shrink-0" />
          <div className="text-sm font-medium">
            <div className="truncate">{match.team2[0]}</div>
            {!match.isSingles && match.team2[1] && (
              <div className="text-muted-foreground text-xs truncate">{match.team2[1]}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
