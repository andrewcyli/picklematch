import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Clock, Users, Timer, Edit2, Check, X } from "lucide-react";
import { Match } from "@/lib/scheduler";

interface CurrentMatchCardProps {
  match: Match;
  matchNumber: string;
  scores: { team1: number | string; team2: number | string };
  formattedTime: string;
  isEditing: boolean;
  editedTeams: { team1: string[]; team2: string[] };
  allPlayers: string[];
  onUpdateScore: (team: "team1" | "team2", value: string) => void;
  onConfirmScore: () => void;
  onStartEdit: () => void;
  onUpdatePlayer: (team: 'team1' | 'team2', index: number, value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

export const CurrentMatchCard = ({
  match,
  matchNumber,
  scores,
  formattedTime,
  isEditing,
  editedTeams,
  allPlayers,
  onUpdateScore,
  onConfirmScore,
  onStartEdit,
  onUpdatePlayer,
  onSaveEdit,
  onCancelEdit,
}: CurrentMatchCardProps) => {
  return (
    <div className="border-2 border-primary bg-primary/5 rounded-lg p-3 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <Badge className="bg-primary text-primary-foreground">
          {matchNumber} • Current
        </Badge>
        <Badge variant="outline" className="text-xs">
          <Clock className="w-3 h-3 mr-1" />
          {match.clockStartTime || new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </Badge>
      </div>

      {/* Stopwatch */}
      <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20 mb-3">
        <Timer className="w-4 h-4 text-primary animate-pulse" />
        <span className="text-lg font-bold text-primary">{formattedTime}</span>
      </div>

      {/* Teams and Scores */}
      <div className="space-y-2">
        {/* Team 1 */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <Users className="w-4 h-4 text-primary flex-shrink-0" />
            {isEditing ? (
              <div className="flex-1 space-y-1">
                <Select value={editedTeams.team1[0] || ""} onValueChange={(v) => onUpdatePlayer('team1', 0, v)}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Player 1" />
                  </SelectTrigger>
                  <SelectContent>
                    {allPlayers.filter((p) => p !== editedTeams.team1[1]).map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!match.isSingles && (
                  <Select value={editedTeams.team1[1] || ""} onValueChange={(v) => onUpdatePlayer('team1', 1, v)}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Player 2" />
                    </SelectTrigger>
                    <SelectContent>
                      {allPlayers.filter((p) => p !== editedTeams.team1[0]).map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : (
              <div className="font-semibold text-sm">
                <div className="truncate">{match.team1[0]}</div>
                {!match.isSingles && match.team1[1] && (
                  <div className="text-muted-foreground text-xs truncate">{match.team1[1]}</div>
                )}
              </div>
            )}
          </div>
          <Input
            type="number"
            min="0"
            value={scores.team1}
            onChange={(e) => onUpdateScore("team1", e.target.value)}
            placeholder="0"
            className="w-14 h-10 text-center text-xl font-bold"
          />
        </div>

        {/* Team 2 */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <Users className="w-4 h-4 text-accent flex-shrink-0" />
            {isEditing ? (
              <div className="flex-1 space-y-1">
                <Select value={editedTeams.team2[0] || ""} onValueChange={(v) => onUpdatePlayer('team2', 0, v)}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Player 1" />
                  </SelectTrigger>
                  <SelectContent>
                    {allPlayers.filter((p) => p !== editedTeams.team2[1]).map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!match.isSingles && (
                  <Select value={editedTeams.team2[1] || ""} onValueChange={(v) => onUpdatePlayer('team2', 1, v)}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Player 2" />
                    </SelectTrigger>
                    <SelectContent>
                      {allPlayers.filter((p) => p !== editedTeams.team2[0]).map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : (
              <div className="font-semibold text-sm">
                <div className="truncate">{match.team2[0]}</div>
                {!match.isSingles && match.team2[1] && (
                  <div className="text-muted-foreground text-xs truncate">{match.team2[1]}</div>
                )}
              </div>
            )}
          </div>
          <Input
            type="number"
            min="0"
            value={scores.team2}
            onChange={(e) => onUpdateScore("team2", e.target.value)}
            placeholder="0"
            className="w-14 h-10 text-center text-xl font-bold"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-3">
        {isEditing ? (
          <>
            <Button onClick={onSaveEdit} size="sm" className="flex-1 h-8">
              <Check className="w-3 h-3 mr-1" /> Save
            </Button>
            <Button onClick={onCancelEdit} variant="outline" size="sm" className="flex-1 h-8">
              <X className="w-3 h-3 mr-1" /> Cancel
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onConfirmScore} size="sm" className="flex-1 h-8">
              <Check className="w-3 h-3 mr-1" /> Confirm Score
            </Button>
            <Button onClick={onStartEdit} variant="outline" size="sm" className="h-8">
              <Edit2 className="w-3 h-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
