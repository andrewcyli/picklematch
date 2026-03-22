import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Match } from "@/lib/scheduler";
import { PlayerMatchGroups } from "@/hooks/use-player-matches";
import { Clock, MapPin, Users, ChevronDown, ChevronUp, UserCircle } from "lucide-react";
import { useState } from "react";
import { PlayerStatusCard } from "./PlayerStatusCard";

interface MyMatchesViewProps {
  playerName: string;
  matchGroups: PlayerMatchGroups;
  matchScores: Map<string, { team1: number; team2: number }>;
  currentTime: Date;
  allMatches: Match[];
  onReleaseIdentity?: () => void;
  onSkipMatch?: (matchId: string) => void;
}

export const MyMatchesView = ({
  playerName,
  matchGroups,
  matchScores,
  currentTime,
  allMatches,
  onReleaseIdentity,
  onSkipMatch,
}: MyMatchesViewProps) => {
  const [showLater, setShowLater] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const renderMatch = (match: Match, status: "current" | "upnext" | "later" | "completed", matchIndex: number) => {
    const team1HasPlayer = match.team1.includes(playerName);
    const score = matchScores.get(match.id);
    const isWinner = score && 
      ((team1HasPlayer && score.team1 > score.team2) || 
       (!team1HasPlayer && score.team2 > score.team1));

    const courtLetter = String.fromCharCode(64 + (match.court || 1));
    const perCourtIndex = allMatches.filter(m => m.court === match.court && m.endTime <= match.endTime).length;
    const matchLabel = `${courtLetter}${perCourtIndex}`;

    return (
      <Card
        key={match.id}
        className={`p-3 transition-all border-white/10 ${
          status === "current"
            ? "border-emerald-500/40 bg-emerald-500/10 animate-pulse"
            : status === "upnext"
            ? "border-amber-500/30 bg-amber-500/10"
            : status === "completed" && isWinner
            ? "border-emerald-500/20 bg-emerald-500/5"
            : "bg-white/5"
        }`}
      >
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono border-white/20 text-white/80 text-xs">
                {matchLabel}
              </Badge>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-white/50" />
                <span className="text-sm font-semibold text-white">Court {courtLetter}</span>
              </div>
            </div>
            {status === "current" && (
              <Badge className="bg-emerald-500 text-white border-0">Playing Now</Badge>
            )}
            {status === "upnext" && (
              <Badge className="bg-amber-500 text-white border-0">Up Next</Badge>
            )}
            {status === "completed" && score && (
              <Badge className={`border-0 ${isWinner ? "bg-emerald-500 text-white" : "bg-white/10 text-white/70"}`}>
                {isWinner ? "Won" : "Lost"}
              </Badge>
            )}
          </div>

          {/* Match Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`space-y-0.5 ${team1HasPlayer ? "font-bold" : ""}`}>
              <p className="text-xs text-white/50">Team 1</p>
              {match.team1.map((p) => (
                <p key={p} className={`text-sm ${p === playerName ? "text-lime-300 font-bold" : "text-white/80"}`}>
                  {p === playerName ? "You" : p}
                </p>
              ))}
              {score && (
                <p className="text-xl font-bold text-white">{score.team1}</p>
              )}
            </div>

            <div className={`space-y-0.5 ${!team1HasPlayer ? "font-bold" : ""}`}>
              <p className="text-xs text-white/50">Team 2</p>
              {match.team2.map((p) => (
                <p key={p} className={`text-sm ${p === playerName ? "text-lime-300 font-bold" : "text-white/80"}`}>
                  {p === playerName ? "You" : p}
                </p>
              ))}
              {score && (
                <p className="text-xl font-bold text-white">{score.team2}</p>
              )}
            </div>
          </div>

          {(status === "current" || status === "upnext") && onSkipMatch && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSkipMatch(match.id)}
              className="text-xs border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              Skip Match
            </Button>
          )}
        </div>
      </Card>
    );
  };

  const totalMatches = matchGroups.current
    ? 1 + matchGroups.upNext.length + matchGroups.later.length + matchGroups.completed.length
    : matchGroups.upNext.length + matchGroups.later.length + matchGroups.completed.length;

  return (
    <div className="space-y-3">
      {/* Header with Organizer View Button */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <UserCircle className="h-4 w-4 text-lime-400" />
          <span className="text-sm font-medium text-white/70">
            Playing as: <span className="text-lime-300 font-bold">{playerName}</span>
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onReleaseIdentity}
          className="gap-2 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
        >
          <Users className="h-4 w-4" />
          Organizer View
        </Button>
      </div>

      {/* Status Card */}
      <PlayerStatusCard
        playerName={playerName}
        currentMatch={matchGroups.current}
        upNextCount={matchGroups.upNext.length}
        matchesPlayed={matchGroups.completed.length}
        totalMatches={totalMatches}
      />

      {/* Current Match */}
      {matchGroups.current && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-400" />
            Playing Now
          </h2>
          {renderMatch(matchGroups.current, "current", 0)}
        </div>
      )}

      {/* Up Next */}
      {matchGroups.upNext.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-400" />
            Up Next
          </h2>
          {matchGroups.upNext.map((match, idx) => renderMatch(match, "upnext", idx + 1))}
        </div>
      )}

      {/* Later Matches */}
      {matchGroups.later.length > 0 && (
        <div className="space-y-2">
          <Button
            variant="ghost"
            onClick={() => setShowLater(!showLater)}
            className="w-full justify-between p-2 text-white hover:bg-white/10 hover:text-white"
          >
            <span className="text-sm font-bold text-white">
              Later ({matchGroups.later.length})
            </span>
            {showLater ? <ChevronUp className="h-4 w-4 text-white/60" /> : <ChevronDown className="h-4 w-4 text-white/60" />}
          </Button>
          {showLater && (
            <div className="space-y-2">
              {matchGroups.later.map((match, idx) => 
                renderMatch(match, "later", matchGroups.upNext.length + idx + 1)
              )}
            </div>
          )}
        </div>
      )}

      {/* Completed Matches */}
      {matchGroups.completed.length > 0 && (
        <div className="space-y-2">
          <Button
            variant="ghost"
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full justify-between p-2 text-white hover:bg-white/10 hover:text-white"
          >
            <span className="text-sm font-bold text-white">
              Completed ({matchGroups.completed.length})
            </span>
            {showCompleted ? <ChevronUp className="h-4 w-4 text-white/60" /> : <ChevronDown className="h-4 w-4 text-white/60" />}
          </Button>
          {showCompleted && (
            <div className="space-y-2">
              {matchGroups.completed.map((match, idx) => 
                renderMatch(match, "completed", totalMatches - matchGroups.completed.length + idx)
              )}
            </div>
          )}
        </div>
      )}

      {/* No matches */}
      {!matchGroups.current && matchGroups.upNext.length === 0 && matchGroups.later.length === 0 && (
        <Card className="p-6 text-center border-white/10 bg-white/5">
          <p className="text-sm text-white/50">No upcoming matches. Check back later!</p>
        </Card>
      )}
    </div>
  );
};
