import { Badge } from "@/components/ui/badge";
import { Clock, Users } from "lucide-react";
import { Match } from "@/lib/scheduler";

interface UpNextMatchCardProps {
  match: Match;
  matchNumber: string;
  compact?: boolean;
}

export const UpNextMatchCard = ({ match, matchNumber, compact = false }: UpNextMatchCardProps) => {
  return (
    <div className={`border border-accent/50 bg-accent/5 rounded-lg ${compact ? 'p-2' : 'p-3'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between ${compact ? 'mb-1.5' : 'mb-2'}`}>
        <Badge className="bg-accent/80 text-accent-foreground text-xs">
          {matchNumber} • Up Next
        </Badge>
        {!compact && (
          <Badge variant="outline" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            {match.clockStartTime || new Date(Date.now() + match.startTime * 60000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </Badge>
        )}
      </div>

      {/* Teams */}
      <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
        <div className={`flex items-center gap-1.5 rounded bg-secondary/30 ${compact ? 'p-1' : 'p-1.5'}`}>
          <Users className="w-3 h-3 text-primary flex-shrink-0" />
          <div className={`font-medium ${compact ? 'text-xs' : 'text-sm'}`}>
            <div className="truncate">{match.team1[0]}</div>
            {!match.isSingles && match.team1[1] && (
              <div className="text-muted-foreground text-[10px] truncate">{match.team1[1]}</div>
            )}
          </div>
        </div>
        <div className={`flex items-center gap-1.5 rounded bg-secondary/30 ${compact ? 'p-1' : 'p-1.5'}`}>
          <Users className="w-3 h-3 text-accent flex-shrink-0" />
          <div className={`font-medium ${compact ? 'text-xs' : 'text-sm'}`}>
            <div className="truncate">{match.team2[0]}</div>
            {!match.isSingles && match.team2[1] && (
              <div className="text-muted-foreground text-[10px] truncate">{match.team2[1]}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
