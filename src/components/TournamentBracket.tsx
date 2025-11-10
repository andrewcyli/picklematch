import { useState } from "react";
import { Match } from "@/lib/scheduler";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, Check } from "lucide-react";
import { validateMatchScore } from "@/lib/validation";
import { toast } from "sonner";

interface TournamentBracketProps {
  matches: Match[];
  matchScores: Map<string, { team1: number; team2: number }>;
  onScoreUpdate: (matchId: string, team1: number, team2: number) => void;
  courtElapsedTimes?: Map<number, number>;
  isPlayerView?: boolean;
  playerName?: string;
}

export const TournamentBracket = ({
  matches,
  matchScores,
  onScoreUpdate,
  courtElapsedTimes,
  isPlayerView = false,
  playerName
}: TournamentBracketProps) => {
  const [pendingScores, setPendingScores] = useState<Map<string, { team1: string; team2: string }>>(new Map());

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Group matches by bracket type and round
  const bracketGroups = matches.reduce((groups, match) => {
    if (!match.tournamentMetadata) return groups;
    
    const { bracketType, round } = match.tournamentMetadata;
    const key = `${bracketType}-${round}`;
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(match);
    return groups;
  }, {} as Record<string, Match[]>);

  // Determine match status
  const getMatchStatus = (match: Match) => {
    if (matchScores.has(match.id)) return 'completed';
    if (match.team1[0] === 'TBD' || match.team2[0] === 'TBD') return 'waiting';
    
    // Check if this is the current playable match
    const allCompleted = matches.filter(m => matchScores.has(m.id));
    const playableMatches = matches.filter(m => 
      !matchScores.has(m.id) && 
      m.team1[0] !== 'TBD' && 
      m.team2[0] !== 'TBD'
    );
    
    if (playableMatches[0]?.id === match.id) return 'current';
    
    return 'scheduled';
  };

  const updatePendingScore = (matchId: string, team: 'team1' | 'team2', value: string) => {
    if (value === '') {
      const current = pendingScores.get(matchId) || { team1: '', team2: '' };
      const newPending = new Map(pendingScores);
      newPending.set(matchId, { ...current, [team]: '' });
      setPendingScores(newPending);
      return;
    }

    const validation = validateMatchScore(value);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid score");
      return;
    }

    const current = pendingScores.get(matchId) || { team1: '', team2: '' };
    const newPending = new Map(pendingScores);
    newPending.set(matchId, { ...current, [team]: validation.value!.toString() });
    setPendingScores(newPending);
  };

  const confirmScore = (matchId: string) => {
    const pending = pendingScores.get(matchId);
    if (!pending || pending.team1 === '' || pending.team2 === '') {
      toast.error("Please enter both scores");
      return;
    }

    const team1Score = Number(pending.team1);
    const team2Score = Number(pending.team2);

    onScoreUpdate(matchId, team1Score, team2Score);

    const newPending = new Map(pendingScores);
    newPending.delete(matchId);
    setPendingScores(newPending);
  };

  const renderMatchCard = (match: Match) => {
    const status = getMatchStatus(match);
    const score = matchScores.get(match.id);
    const pending = pendingScores.get(match.id);
    const elapsedTime = courtElapsedTimes?.get(match.court);
    const metadata = match.tournamentMetadata!;

    // Filter for player view
    if (isPlayerView && playerName) {
      const hasPlayer = match.team1.some(p => p === playerName) || match.team2.some(p => p === playerName);
      if (!hasPlayer && status !== 'current') return null;
    }

    const getBorderColor = () => {
      if (status === 'completed') return 'border-primary/30 bg-primary/5';
      if (status === 'current') return 'border-accent bg-accent/10';
      if (status === 'waiting') return 'border-border/50 bg-muted/30';
      return 'border-border bg-card';
    };

    return (
      <Card key={match.id} className={`p-3 ${getBorderColor()} transition-all`}>
        {/* Match Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {metadata.roundName}
            </Badge>
            {metadata.seed1 && metadata.seed2 && (
              <span className="text-[10px] text-muted-foreground">
                #{metadata.seed1} vs #{metadata.seed2}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">Court {match.court}</span>
            {status === 'current' && elapsedTime !== undefined && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Clock className="w-2.5 h-2.5" />
                {formatTime(elapsedTime)}
              </Badge>
            )}
            {status === 'completed' && (
              <Check className="w-3.5 h-3.5 text-primary" />
            )}
          </div>
        </div>

        {/* Team 1 */}
        <div className={`flex items-center justify-between py-2 px-3 rounded-md mb-1 ${
          status === 'waiting' ? 'bg-muted/50' : 'bg-background/50'
        }`}>
          <span className={`text-sm font-medium ${
            match.team1[0] === 'TBD' ? 'text-muted-foreground italic' : 'text-foreground'
          } ${score && score.team1 > score.team2 ? 'font-bold text-primary' : ''}`}>
            {match.team1[0]}
            {match.team1.length > 1 && match.team1[1] !== 'TBD' && ` & ${match.team1[1]}`}
          </span>
          {status === 'current' && !score ? (
            <Input
              type="text"
              inputMode="numeric"
              className="w-14 h-7 text-center text-sm"
              placeholder="0"
              value={pending?.team1 || ''}
              onChange={(e) => updatePendingScore(match.id, 'team1', e.target.value)}
            />
          ) : (
            <span className={`text-sm font-bold ${
              score && score.team1 > score.team2 ? 'text-primary' : 'text-foreground'
            }`}>
              {score?.team1 ?? '-'}
            </span>
          )}
        </div>

        {/* Team 2 */}
        <div className={`flex items-center justify-between py-2 px-3 rounded-md mb-2 ${
          status === 'waiting' ? 'bg-muted/50' : 'bg-background/50'
        }`}>
          <span className={`text-sm font-medium ${
            match.team2[0] === 'TBD' ? 'text-muted-foreground italic' : 'text-foreground'
          } ${score && score.team2 > score.team1 ? 'font-bold text-primary' : ''}`}>
            {match.team2[0]}
            {match.team2.length > 1 && match.team2[1] !== 'TBD' && ` & ${match.team2[1]}`}
          </span>
          {status === 'current' && !score ? (
            <Input
              type="text"
              inputMode="numeric"
              className="w-14 h-7 text-center text-sm"
              placeholder="0"
              value={pending?.team2 || ''}
              onChange={(e) => updatePendingScore(match.id, 'team2', e.target.value)}
            />
          ) : (
            <span className={`text-sm font-bold ${
              score && score.team2 > score.team1 ? 'text-primary' : 'text-foreground'
            }`}>
              {score?.team2 ?? '-'}
            </span>
          )}
        </div>

        {/* Confirm Button */}
        {status === 'current' && !score && (
          <Button
            onClick={() => confirmScore(match.id)}
            size="sm"
            className="w-full h-8 text-xs"
          >
            Confirm Score
          </Button>
        )}

        {/* Status Badge */}
        {status === 'waiting' && (
          <div className="text-center text-[10px] text-muted-foreground italic">
            Waiting for previous matches
          </div>
        )}
      </Card>
    );
  };

  // Sort groups by bracket type and round
  const sortedGroupKeys = Object.keys(bracketGroups).sort((a, b) => {
    const [typeA, roundA] = a.split('-');
    const [typeB, roundB] = b.split('-');
    
    // Order: winners -> losers -> finals/grand-finals -> third-place
    const typeOrder = { winners: 0, losers: 1, finals: 2, 'grand-finals': 2, 'third-place': 3 };
    const typeOrderA = typeOrder[typeA as keyof typeof typeOrder] ?? 4;
    const typeOrderB = typeOrder[typeB as keyof typeof typeOrder] ?? 4;
    
    if (typeOrderA !== typeOrderB) return typeOrderA - typeOrderB;
    return Number(roundA) - Number(roundB);
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Trophy className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Tournament Bracket</h2>
            <p className="text-[10px] text-muted-foreground">Match progression</p>
          </div>
        </div>
      </div>

      {/* Bracket Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-24">
        <div className="space-y-6">
          {sortedGroupKeys.map(key => {
            const roundMatches = bracketGroups[key];
            const [bracketType, round] = key.split('-');
            const displayName = roundMatches[0]?.tournamentMetadata?.roundName || key;

            return (
              <div key={key} className="space-y-2">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
                  {displayName}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {roundMatches.map(match => renderMatchCard(match))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
