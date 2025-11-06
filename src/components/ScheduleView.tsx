import { useState, useMemo } from "react";
import { Match } from "@/lib/scheduler";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Clock, Users, Share2, Medal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScheduleViewProps {
  matches: Match[];
  onBack: () => void;
}

export const ScheduleView = ({ matches, onBack }: ScheduleViewProps) => {
  const { toast } = useToast();
  const [matchScores, setMatchScores] = useState<Map<string, { team1: number; team2: number }>>(
    new Map()
  );

  const updateScore = (matchId: string, team: "team1" | "team2", score: number) => {
    const current = matchScores.get(matchId) || { team1: 0, team2: 0 };
    setMatchScores(new Map(matchScores.set(matchId, { ...current, [team]: score })));
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
      
      const allPlayers = [...match.team1, ...match.team2];
      allPlayers.forEach((player) => {
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

  return (
    <div className="space-y-6">
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
            <p className="text-sm text-muted-foreground">{matches.length} matches generated</p>
          </div>
        </div>
      </div>

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
                  return (
                    <Card
                      key={match.id}
                      className="p-5 hover:shadow-lg transition-all border-l-4 border-l-primary"
                      style={{ boxShadow: "var(--shadow-match)" }}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                            Court {match.court}
                          </Badge>
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
