import { useState, useMemo, useEffect } from "react";
import { Match, regenerateScheduleFromSlot } from "@/lib/scheduler";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Clock, Users, Share2, Medal, UserPlus, X, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";

interface ScheduleViewProps {
  matches: Match[];
  onBack: () => void;
  gameConfig: {
    gameDuration: number;
    totalTime: number;
    courts: number;
    startTime: string;
    teammatePairs?: { player1: string; player2: string }[];
  };
  allPlayers: string[];
  onScheduleUpdate: (newMatches: Match[], newPlayers: string[]) => void;
}

export const ScheduleView = ({ matches, onBack, gameConfig, allPlayers, onScheduleUpdate }: ScheduleViewProps) => {
  const { toast } = useToast();
  const [matchScores, setMatchScores] = useState<Map<string, { team1: number; team2: number }>>(
    new Map()
  );
  const [newPlayerName, setNewPlayerName] = useState("");
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Update current time every minute
  useEffect(() => {
    const updateCurrentTime = () => {
      const now = new Date();
      const [startHours, startMinutes] = gameConfig.startTime.split(':').map(Number);
      const startTimeInMinutes = startHours * 60 + startMinutes;
      const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
      const elapsed = currentTimeInMinutes - startTimeInMinutes;
      setCurrentTime(Math.max(0, elapsed));
    };

    updateCurrentTime();
    const interval = setInterval(updateCurrentTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [gameConfig.startTime]);

  // Find current match based on time and scores
  const currentMatch = useMemo(() => {
    // First, find the first unscored match
    const unscoredMatch = matches.find(m => !matchScores.has(m.id));
    if (unscoredMatch) {
      return unscoredMatch.id;
    }
    return null;
  }, [matches, matchScores]);

  const updateScore = (matchId: string, team: "team1" | "team2", score: number) => {
    const current = matchScores.get(matchId) || { team1: 0, team2: 0 };
    const newScores = new Map(matchScores.set(matchId, { ...current, [team]: score }));
    setMatchScores(newScores);

    // Check if both scores are entered and this is the first complete score entry
    const bothScoresEntered = (team === "team1" && current.team2 > 0) || (team === "team2" && current.team1 > 0);
    
    if (bothScoresEntered && score > 0) {
      // Calculate actual end time
      const actualEndTime = currentTime;
      checkScheduleAdjustment(matchId, actualEndTime);
    }
  };

  const checkScheduleAdjustment = (completedMatchId: string, actualEndTime: number) => {
    const completedMatch = matches.find(m => m.id === completedMatchId);
    if (!completedMatch) return;

    const scheduledEndTime = completedMatch.endTime;
    const timeDifference = actualEndTime - scheduledEndTime;

    // If more than 5 minutes difference, adjust schedule
    if (Math.abs(timeDifference) > 5) {
      const matchIndex = matches.findIndex(m => m.id === completedMatchId);
      const playedMatches = matches.slice(0, matchIndex + 1).map(m => ({
        ...m,
        score: matchScores.get(m.id),
        actualEndTime: m.id === completedMatchId ? actualEndTime : m.endTime,
      }));

      // Determine if we need more or fewer matches
      const remainingTime = gameConfig.totalTime - actualEndTime;
      const potentialNewMatches = Math.floor(remainingTime / gameConfig.gameDuration) * gameConfig.courts;
      const currentFutureMatches = matches.length - (matchIndex + 1);

      if (potentialNewMatches !== currentFutureMatches) {
        // Regenerate schedule
        const newMatches = regenerateScheduleFromSlot(
          allPlayers,
          playedMatches,
          actualEndTime,
          gameConfig.gameDuration,
          gameConfig.totalTime,
          gameConfig.courts,
          gameConfig.startTime,
          gameConfig.teammatePairs
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

  const leaderboard = useMemo(() => {
    const playerScores = new Map<string, { wins: number; losses: number; points: number }>();
    
    matches.forEach((match) => {
      const scores = matchScores.get(match.id);
      if (!scores) return;
      
      const allMatchPlayers = [...match.team1, ...match.team2];
      allMatchPlayers.forEach((player) => {
        if (!playerScores.has(player)) {
          playerScores.set(player, { wins: 0, losses: 0, points: 0 });
        }
      });
      
      const [p1, p2] = match.team1;
      const [p3, p4] = match.team2;
      
      if (scores.team1 > scores.team2) {
        playerScores.get(p1)!.wins++;
        playerScores.get(p2)!.wins++;
        playerScores.get(p3)!.losses++;
        playerScores.get(p4)!.losses++;
      } else if (scores.team2 > scores.team1) {
        playerScores.get(p3)!.wins++;
        playerScores.get(p4)!.wins++;
        playerScores.get(p1)!.losses++;
        playerScores.get(p2)!.losses++;
      }
      
      playerScores.get(p1)!.points += scores.team1;
      playerScores.get(p2)!.points += scores.team1;
      playerScores.get(p3)!.points += scores.team2;
      playerScores.get(p4)!.points += scores.team2;
    });
    
    return Array.from(playerScores.entries())
      .map(([player, stats]) => ({ player, ...stats }))
      .sort((a, b) => b.wins - a.wins || b.points - a.points);
  }, [matches, matchScores]);

  const handleShare = async () => {
    const shareText = `🏆 Match Results 🏆\n\n` +
      `Leaderboard:\n` +
      leaderboard.map((entry, idx) => 
        `${idx + 1}. ${entry.player} - ${entry.wins}W/${entry.losses}L (${entry.points} pts)`
      ).join('\n') +
      `\n\n` +
      `Total Matches: ${matches.length}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
        toast({ title: "Shared successfully!" });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          copyToClipboard(shareText);
        }
      }
    } else {
      copyToClipboard(shareText);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!" });
  };

  const handleAddPlayer = () => {
    const trimmedName = newPlayerName.trim();
    if (!trimmedName) {
      toast({ title: "Please enter a player name", variant: "destructive" });
      return;
    }
    
    if (allPlayers.some(p => p.toLowerCase() === trimmedName.toLowerCase())) {
      toast({ title: "Player already exists", variant: "destructive" });
      return;
    }

    const firstUnplayedMatchIndex = matches.findIndex(m => !matchScores.has(m.id));
    
    if (firstUnplayedMatchIndex === -1) {
      toast({ title: "All matches completed", description: "Cannot add players after tournament ends", variant: "destructive" });
      return;
    }

    const firstUnplayedMatch = matches[firstUnplayedMatchIndex];
    const playedMatches = matches.slice(0, firstUnplayedMatchIndex);
    
    const matchesWithScores = playedMatches.map(m => ({
      ...m,
      score: matchScores.get(m.id)
    }));

    const updatedPlayers = [...allPlayers, trimmedName];
    const newMatches = regenerateScheduleFromSlot(
      updatedPlayers,
      matchesWithScores,
      firstUnplayedMatch.startTime,
      gameConfig.gameDuration,
      gameConfig.totalTime,
      gameConfig.courts,
      gameConfig.startTime,
      gameConfig.teammatePairs
    );

    onScheduleUpdate(newMatches, updatedPlayers);
    setNewPlayerName("");
    setIsAddPlayerOpen(false);
    toast({ title: "Player added!", description: "Schedule updated from next slot onwards" });
  };

  const handleDeletePlayer = (playerName: string) => {
    const firstUnplayedMatchIndex = matches.findIndex(m => !matchScores.has(m.id));
    
    if (firstUnplayedMatchIndex === -1) {
      toast({ title: "Cannot remove player", description: "All matches completed", variant: "destructive" });
      return;
    }

    const firstUnplayedMatch = matches[firstUnplayedMatchIndex];
    const playedMatches = matches.slice(0, firstUnplayedMatchIndex);
    
    const matchesWithScores = playedMatches.map(m => ({
      ...m,
      score: matchScores.get(m.id)
    }));

    const updatedPlayers = allPlayers.filter(p => p !== playerName);
    
    if (updatedPlayers.length < 4) {
      toast({ title: "Cannot remove player", description: "Need at least 4 players", variant: "destructive" });
      return;
    }

    // Remove player from teammate pairs if they're in one
    const updatedPairs = (gameConfig.teammatePairs || []).filter(
      pair => pair.player1 !== playerName && pair.player2 !== playerName
    );

    const newMatches = regenerateScheduleFromSlot(
      updatedPlayers,
      matchesWithScores,
      firstUnplayedMatch.startTime,
      gameConfig.gameDuration,
      gameConfig.totalTime,
      gameConfig.courts,
      gameConfig.startTime,
      updatedPairs
    );

    onScheduleUpdate(newMatches, updatedPlayers);
    setPlayerToDelete(null);
    toast({ title: "Player removed", description: "Schedule updated from next slot onwards" });
  };

  return (
    <div className="space-y-6">
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

        <Dialog open={isAddPlayerOpen} onOpenChange={setIsAddPlayerOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <UserPlus className="w-4 h-4" />
              Add Player
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Player</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="new-player">Player Name</Label>
                <Input
                  id="new-player"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
                  placeholder="Enter player name"
                  className="h-12 text-lg"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Schedule will be regenerated from the next unplayed match onwards.
              </p>
              <Button onClick={handleAddPlayer} className="w-full h-12">
                Add Player & Update Schedule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Player List with Delete Option */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Active Players</h3>
        <div className="flex flex-wrap gap-2">
          {allPlayers.map((player) => (
            <Badge key={player} variant="secondary" className="px-3 py-1 text-sm">
              {player}
              <button
                onClick={() => setPlayerToDelete(player)}
                className="ml-2 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </Card>

      <AlertDialog open={!!playerToDelete} onOpenChange={(open) => !open && setPlayerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Player</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {playerToDelete} from the game? The schedule will be regenerated from the next unplayed match.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => playerToDelete && handleDeletePlayer(playerToDelete)}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-8">
        {Object.entries(groupedMatches).map(([timeSlot, slotMatches]) => {
          const [start, end] = timeSlot.split("-").map(Number);
          return (
            <div key={timeSlot} className="space-y-4">
              <div className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur py-2 z-10">
                <Clock className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">
                  {slotMatches[0].clockStartTime ? (
                    `${slotMatches[0].clockStartTime} - ${slotMatches[0].clockEndTime}`
                  ) : (
                    `${start} - ${end} min`
                  )}
                </h3>
                <Badge variant="secondary" className="ml-2">
                  {slotMatches.length} {slotMatches.length === 1 ? "court" : "courts"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {slotMatches.map((match) => {
                  const scores = matchScores.get(match.id) || { team1: 0, team2: 0 };
                  const isCurrentMatch = match.id === currentMatch;
                  const isCompleted = matchScores.has(match.id) && scores.team1 > 0 && scores.team2 > 0;
                  
                  return (
                    <Card
                      key={match.id}
                      className={`p-5 hover:shadow-lg transition-all border-l-4 ${
                        isCurrentMatch 
                          ? "border-l-primary bg-primary/5 ring-2 ring-primary/20" 
                          : isCompleted
                          ? "border-l-muted opacity-60"
                          : "border-l-primary"
                      }`}
                      style={{ boxShadow: "var(--shadow-match)" }}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                            Court {match.court}
                          </Badge>
                          {isCurrentMatch && (
                            <Badge className="bg-accent/10 text-accent border-accent/20">
                              <Play className="w-3 h-3 mr-1" />
                              Current
                            </Badge>
                          )}
                          {isCompleted && (
                            <Badge variant="secondary">Completed</Badge>
                          )}
                        </div>

                        <div className="space-y-3">
                          {/* Team 1 */}
                          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                            <div className="flex items-center gap-2 flex-1">
                              <Users className="w-4 h-4 text-primary" />
                              <div className="font-medium text-sm">
                                <div>{match.team1[0]}</div>
                                <div className="text-muted-foreground">{match.team1[1]}</div>
                              </div>
                            </div>
                            <Input
                              type="number"
                              min="0"
                              value={scores.team1}
                              onChange={(e) => updateScore(match.id, "team1", Number(e.target.value))}
                              className="w-16 h-12 text-center text-xl font-bold"
                              disabled={isCompleted}
                            />
                          </div>

                          <div className="text-center text-sm font-semibold text-muted-foreground">
                            VS
                          </div>

                          {/* Team 2 */}
                          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                            <div className="flex items-center gap-2 flex-1">
                              <Users className="w-4 h-4 text-accent" />
                              <div className="font-medium text-sm">
                                <div>{match.team2[0]}</div>
                                <div className="text-muted-foreground">{match.team2[1]}</div>
                              </div>
                            </div>
                            <Input
                              type="number"
                              min="0"
                              value={scores.team2}
                              onChange={(e) => updateScore(match.id, "team2", Number(e.target.value))}
                              className="w-16 h-12 text-center text-xl font-bold"
                              disabled={isCompleted}
                            />
                          </div>
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

      {leaderboard.length > 0 && (
        <Card className="p-6 mt-8 bg-gradient-to-br from-primary/5 to-accent/5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Medal className="w-6 h-6 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Leaderboard</h2>
            </div>
            <Button onClick={handleShare} className="gap-2">
              <Share2 className="w-4 h-4" />
              Share Results
            </Button>
          </div>
          
          <div className="space-y-3">
            {leaderboard.map((entry, idx) => (
              <div
                key={entry.player}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  idx === 0
                    ? "bg-gradient-to-r from-primary/20 to-accent/20 border-2 border-primary"
                    : "bg-secondary/50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    idx === 0 ? "bg-primary text-primary-foreground text-lg" :
                    idx === 1 ? "bg-accent text-accent-foreground" :
                    idx === 2 ? "bg-muted text-muted-foreground" :
                    "bg-secondary text-secondary-foreground"
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{entry.player}</div>
                    <div className="text-sm text-muted-foreground">
                      {entry.wins}W / {entry.losses}L • {entry.points} pts
                    </div>
                  </div>
                </div>
                {idx === 0 && <Trophy className="w-8 h-8 text-primary" />}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};