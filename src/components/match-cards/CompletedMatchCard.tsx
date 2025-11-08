import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";
import { Match } from "@/lib/scheduler";

interface CompletedMatchCardProps {
  match: Match;
  matchNumber: string;
  scores: { team1: number; team2: number };
  onEditScore: () => void;
}

export const CompletedMatchCard = ({ match, matchNumber, scores, onEditScore }: CompletedMatchCardProps) => {
  const winner = scores.team1 > scores.team2 ? 1 : scores.team2 > scores.team1 ? 2 : 0;
  
  return (
    <div className="bg-muted/30 rounded-lg p-2 opacity-70 hover:opacity-100 transition-opacity">
      <div className="flex items-center justify-between mb-1">
        <Badge variant="secondary" className="text-xs">
          {matchNumber} • Done
        </Badge>
        <Button onClick={onEditScore} variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Edit2 className="w-3 h-3" />
        </Button>
      </div>
      
      <div className="flex items-center justify-between text-xs">
        <div className={`flex-1 ${winner === 1 ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
          <div className="truncate">{match.team1.join(' & ')}</div>
        </div>
        <div className="px-2 font-bold">{scores.team1} - {scores.team2}</div>
        <div className={`flex-1 text-right ${winner === 2 ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
          <div className="truncate">{match.team2.join(' & ')}</div>
        </div>
      </div>
    </div>
  );
};
