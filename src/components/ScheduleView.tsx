import { useState, useMemo, useEffect, useRef } from "react";
import { Match, regenerateScheduleFromSlot, CourtConfig } from "@/lib/scheduler";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Clock, Users, Trophy, ChevronLeft, ChevronRight, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

interface ScheduleViewProps {
  matches: Match[];
  onBack: () => void;
  gameConfig: {
    gameDuration: number;
    totalTime: number;
    courts: number;
    teammatePairs?: { player1: string; player2: string }[];
    courtConfigs?: CourtConfig[];
  };
  allPlayers: string[];
  onScheduleUpdate: (newMatches: Match[], newPlayers: string[]) => void;
}

export const ScheduleView = ({ matches, onBack, gameConfig, allPlayers, onScheduleUpdate }: ScheduleViewProps) => {
  const { toast } = useToast();
  const [matchScores, setMatchScores] = useState<Map<string, { team1: number | string; team2: number | string }>>(
    new Map()
  );
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [pendingScores, setPendingScores] = useState<Map<string, { team1: number | string; team2: number | string }>>(new Map());
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [courtConfigs, setCourtConfigs] = useState<CourtConfig[]>(
    gameConfig.courtConfigs || Array.from({ length: gameConfig.courts }, (_, i) => ({ courtNumber: i + 1, type: 'doubles' as const }))
  );
  const [carouselApis, setCarouselApis] = useState<Map<number, CarouselApi>>(new Map());

  // Helper to normalize scores to numbers
  const normalizeScore = (score: { team1: number | string; team2: number | string } | undefined) => {
    if (!score) return undefined;
    return {
      team1: typeof score.team1 === 'number' ? score.team1 : Number(score.team1) || 0,
      team2: typeof score.team2 === 'number' ? score.team2 : Number(score.team2) || 0
    };
  };

  // Find current match based on scores
  const currentMatch = useMemo(() => {
    const unscoredMatch = matches.find(m => !matchScores.has(m.id));
    if (unscoredMatch) {
      return unscoredMatch.id;
    }
    return null;
  }, [matches, matchScores]);

  const updatePendingScore = (matchId: string, team: "team1" | "team2", value: string) => {
    const score = value === '' ? '' : Number(value);
    const current = pendingScores.get(matchId) || matchScores.get(matchId) || { team1: '', team2: '' };
    const newPending = new Map(pendingScores);
    newPending.set(matchId, { ...current, [team]: score });
    setPendingScores(newPending);
  };

  const confirmScore = (matchId: string) => {
    const pending = pendingScores.get(matchId);
    if (!pending || pending.team1 === '' || pending.team2 === '' || pending.team1 === undefined || pending.team2 === undefined) {
      toast({ title: "Please enter both scores", variant: "destructive" });
      return;
    }

    const team1Score = typeof pending.team1 === 'number' ? pending.team1 : Number(pending.team1);
    const team2Score = typeof pending.team2 === 'number' ? pending.team2 : Number(pending.team2);

    const newScores = new Map(matchScores);
    newScores.set(matchId, { team1: team1Score, team2: team2Score });
    setMatchScores(newScores);
    
    const newPending = new Map(pendingScores);
    newPending.delete(matchId);
    setPendingScores(newPending);

    const actualEndTime = currentTime;
    checkScheduleAdjustment(matchId, actualEndTime);
    
    toast({ title: "Score confirmed" });
  };

  const editScore = (matchId: string) => {
    const current = matchScores.get(matchId);
    if (current) {
      const newPending = new Map(pendingScores);
      newPending.set(matchId, current);
      setPendingScores(newPending);
      
      const newScores = new Map(matchScores);
      newScores.delete(matchId);
      setMatchScores(newScores);
    }
  };

  const checkScheduleAdjustment = (completedMatchId: string, actualEndTime: number) => {
    const completedMatch = matches.find(m => m.id === completedMatchId);
    if (!completedMatch) return;

    const scheduledEndTime = completedMatch.endTime;
    const timeDifference = actualEndTime - scheduledEndTime;

    if (Math.abs(timeDifference) > 5) {
      const matchIndex = matches.findIndex(m => m.id === completedMatchId);
      const playedMatches = matches.slice(0, matchIndex + 1).map(m => ({
        ...m,
        score: normalizeScore(matchScores.get(m.id)),
        actualEndTime: m.id === completedMatchId ? actualEndTime : m.endTime,
      }));

      const remainingTime = gameConfig.totalTime - actualEndTime;
      const potentialNewMatches = Math.floor(remainingTime / gameConfig.gameDuration) * gameConfig.courts;
      const currentFutureMatches = matches.length - (matchIndex + 1);

      if (potentialNewMatches !== currentFutureMatches) {
        const newMatches = regenerateScheduleFromSlot(
          allPlayers,
          playedMatches,
          actualEndTime,
          gameConfig.gameDuration,
          gameConfig.totalTime,
          gameConfig.courts,
          undefined,
          gameConfig.teammatePairs,
          courtConfigs
        );

        onScheduleUpdate(newMatches, allPlayers);
        
        const matchDiff = newMatches.length - matches.length;
        if (matchDiff > 0) {
          toast({ title: "Schedule adjusted", description: `Added ${matchDiff} match(es) due to faster pace` });
        } else if (matchDiff < 0) {
          toast({ title: "Schedule adjusted", description: `Removed ${Math.abs(matchDiff)} match(es) due to slower pace` });
        }
      }
    }
  };

  const groupedMatches = matches.reduce((acc, match) => {
    const timeSlot = `${match.startTime}-${match.endTime}`;
    if (!acc[timeSlot]) acc[timeSlot] = [];
    acc[timeSlot].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  const toggleCourtType = (courtNumber: number) => {
    const updatedConfigs = courtConfigs.map(config => 
      config.courtNumber === courtNumber 
        ? { ...config, type: config.type === 'singles' ? 'doubles' as const : 'singles' as const }
        : config
    );
    setCourtConfigs(updatedConfigs);

    const firstUnplayedMatchIndex = matches.findIndex(m => !matchScores.has(m.id));
    if (firstUnplayedMatchIndex === -1) return;

    const firstUnplayedMatch = matches[firstUnplayedMatchIndex];
    const playedMatches = matches.slice(0, firstUnplayedMatchIndex).map(m => ({
      ...m,
      score: normalizeScore(matchScores.get(m.id))
    }));

    const newMatches = regenerateScheduleFromSlot(
      allPlayers,
      playedMatches,
      firstUnplayedMatch.startTime,
      gameConfig.gameDuration,
      gameConfig.totalTime,
      gameConfig.courts,
      undefined,
      gameConfig.teammatePairs,
      updatedConfigs
    );

    onScheduleUpdate(newMatches, allPlayers);
    toast({ title: "Court type updated", description: "Schedule regenerated" });
  };

  const scrollToCurrentMatch = (courtNumber: number) => {
    const api = carouselApis.get(courtNumber);
    if (!api) return;

    const courtMatches = matches.filter(m => m.court === courtNumber);
    const currentMatchIndex = courtMatches.findIndex(m => !matchScores.has(m.id));
    
    if (currentMatchIndex >= 0) {
      api.scrollTo(currentMatchIndex);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Match Schedule</h2>
              <p className="text-sm text-muted-foreground">{matches.length} matches • {allPlayers.length} players</p>
            </div>
          </div>
        </div>
      </div>

      {/* Carousel-based Match View */}
      <div className="space-y-8">
        {courtConfigs.map((courtConfig) => {
          const courtMatches = matches.filter(m => m.court === courtConfig.courtNumber);
          const currentMatchIndex = courtMatches.findIndex(m => !matchScores.has(m.id));

          return (
            <div key={courtConfig.courtNumber} className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/20 text-primary text-base px-3 py-1">
                    Court {courtConfig.courtNumber}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 p-2 rounded-lg border bg-card">
                    <span className={`text-xs ${courtConfig.type === 'singles' ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                      Doubles
                    </span>
                    <Switch
                      checked={courtConfig.type === 'singles'}
                      onCheckedChange={() => toggleCourtType(courtConfig.courtNumber)}
                      disabled={matchScores.size > 0}
                    />
                    <span className={`text-xs ${courtConfig.type === 'singles' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      Singles
                    </span>
                  </div>
                  
                  {currentMatchIndex >= 0 && (
                    <Button
                      onClick={() => scrollToCurrentMatch(courtConfig.courtNumber)}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Target className="w-4 h-4" />
                      Current Match
                    </Button>
                  )}
                </div>
              </div>

              {matchScores.size > 0 && (
                <p className="text-xs text-muted-foreground">
                  Court configuration can only be changed before any matches are scored
                </p>
              )}

              <Carousel
                opts={{ align: "center", loop: false }}
                className="w-full"
                setApi={(api) => {
                  if (api) {
                    setCarouselApis(prev => new Map(prev).set(courtConfig.courtNumber, api));
                  }
                }}
              >
                <CarouselContent>
                  {courtMatches.map((match, idx) => {
                    const isCurrentMatch = idx === currentMatchIndex;
                    const isPreviousMatch = idx < currentMatchIndex;
                    const isNextMatch = idx > currentMatchIndex;
                    const confirmedScores = matchScores.get(match.id);
                    const pendingForMatch = pendingScores.get(match.id);
                    const scores = pendingForMatch || confirmedScores || { team1: '', team2: '' };
                    const isCompleted = matchScores.has(match.id);
                    const hasPending = pendingScores.has(match.id);

                    return (
                      <CarouselItem key={match.id}>
                        <div className="p-1">
                          <Card className={`p-5 transition-all ${
                            isCurrentMatch 
                              ? 'border-2 border-accent bg-accent/5 shadow-lg scale-100' 
                              : isPreviousMatch
                              ? 'bg-muted/50 border-muted opacity-60'
                              : 'bg-muted/30 border-dashed opacity-70'
                          }`}>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <Badge className={
                                  isCurrentMatch 
                                    ? 'bg-accent text-accent-foreground'
                                    : isPreviousMatch
                                    ? 'bg-secondary text-secondary-foreground'
                                    : 'bg-muted text-muted-foreground'
                                }>
                                  {isCurrentMatch ? 'Current Match' : isPreviousMatch ? 'Previous' : 'Up Next'}
                                </Badge>
                                <Badge variant="outline">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {match.clockStartTime || `${match.startTime} min`}
                                </Badge>
                              </div>

                              <div className="space-y-3">
                                {/* Team 1 */}
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <Users className="w-5 h-5 text-primary flex-shrink-0" />
                                    <div className="font-semibold text-sm min-w-0">
                                      <div className="truncate">{match.team1[0]}</div>
                                      {!match.isSingles && match.team1[1] && (
                                        <div className="text-muted-foreground text-xs truncate">{match.team1[1]}</div>
                                      )}
                                    </div>
                                  </div>
                                  {isCurrentMatch ? (
                                    <Input
                                      type="number"
                                      min="0"
                                      value={scores.team1}
                                      onChange={(e) => updatePendingScore(match.id, "team1", e.target.value)}
                                      placeholder="0"
                                      className="w-16 h-12 text-center text-xl font-bold flex-shrink-0"
                                      disabled={isCompleted && !hasPending}
                                    />
                                  ) : (
                                    <span className="w-16 h-12 flex items-center justify-center text-xl font-bold">
                                      {confirmedScores ? confirmedScores.team1 : '-'}
                                    </span>
                                  )}
                                </div>

                                <div className="text-center text-sm font-bold text-muted-foreground">VS</div>

                                {/* Team 2 */}
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <Users className="w-5 h-5 text-accent flex-shrink-0" />
                                    <div className="font-semibold text-sm min-w-0">
                                      <div className="truncate">{match.team2[0]}</div>
                                      {!match.isSingles && match.team2[1] && (
                                        <div className="text-muted-foreground text-xs truncate">{match.team2[1]}</div>
                                      )}
                                    </div>
                                  </div>
                                  {isCurrentMatch ? (
                                    <Input
                                      type="number"
                                      min="0"
                                      value={scores.team2}
                                      onChange={(e) => updatePendingScore(match.id, "team2", e.target.value)}
                                      placeholder="0"
                                      className="w-16 h-12 text-center text-xl font-bold flex-shrink-0"
                                      disabled={isCompleted && !hasPending}
                                    />
                                  ) : (
                                    <span className="w-16 h-12 flex items-center justify-center text-xl font-bold">
                                      {confirmedScores ? confirmedScores.team2 : '-'}
                                    </span>
                                  )}
                                </div>

                                {isCurrentMatch && !isCompleted && (
                                  <Button 
                                    onClick={() => confirmScore(match.id)}
                                    className="w-full h-11"
                                    disabled={!hasPending}
                                  >
                                    Confirm Score & Next
                                  </Button>
                                )}
                                
                                {isCurrentMatch && isCompleted && !hasPending && (
                                  <Button 
                                    onClick={() => editScore(match.id)}
                                    variant="outline"
                                    className="w-full"
                                  >
                                    Edit Score
                                  </Button>
                                )}
                              </div>
                            </div>
                          </Card>
                        </div>
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </Carousel>
            </div>
          );
        })}
      </div>

      {/* All Matches - Expandable */}
      {showAllMatches ? (
        <div className="space-y-6 pt-8 border-t">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">All Matches</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowAllMatches(false)}>
              Hide
            </Button>
          </div>
          {Object.entries(groupedMatches).map(([timeSlot, slotMatches]) => {
            const [start, end] = timeSlot.split("-").map(Number);
            return (
              <div key={timeSlot} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold text-foreground">
                    {slotMatches[0].clockStartTime ? (
                      `${slotMatches[0].clockStartTime} - ${slotMatches[0].clockEndTime}`
                    ) : (
                      `${start} - ${end} min`
                    )}
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {slotMatches.map((match) => {
                    const scores = matchScores.get(match.id);
                    const isCompleted = matchScores.has(match.id);
                    
                    return (
                      <Card key={match.id} className={`p-3 ${isCompleted ? 'opacity-60' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="text-xs">Court {match.court}</Badge>
                          {isCompleted && <Badge variant="secondary" className="text-xs">Done</Badge>}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="font-medium">{match.team1[0]}</span>
                              {!match.isSingles && match.team1[1] && (
                                <span className="text-muted-foreground text-xs">& {match.team1[1]}</span>
                              )}
                            </div>
                            {scores && <span className="font-bold">{scores.team1}</span>}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="font-medium">{match.team2[0]}</span>
                              {!match.isSingles && match.team2[1] && (
                                <span className="text-muted-foreground text-xs">& {match.team2[1]}</span>
                              )}
                            </div>
                            {scores && <span className="font-bold">{scores.team2}</span>}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="pt-6 border-t">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => setShowAllMatches(true)}
          >
            Show All Matches ({matches.length})
          </Button>
        </div>
      )}
    </div>
  );
};
