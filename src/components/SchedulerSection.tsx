import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Match, CourtConfig, regenerateScheduleFromSlot } from "@/lib/scheduler";
import { GameConfig } from "./GameSetupSection";
import { Edit, Check, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface SchedulerSectionProps {
  matches: Match[];
  gameConfig: GameConfig;
  allPlayers: string[];
  onScheduleUpdate: (newMatches: Match[], players: string[]) => void;
}

export const SchedulerSection = ({ matches, gameConfig, allPlayers, onScheduleUpdate }: SchedulerSectionProps) => {
  const [pendingScores, setPendingScores] = useState<{[key: string]: {team1: string, team2: string}}>({});
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editedTeams, setEditedTeams] = useState<{team1: (string | string[])[], team2: (string | string[])[]} | null>(null);
  const [courtConfigs, setCourtConfigs] = useState<CourtConfig[]>(gameConfig.courtConfigs);
  const [showNextMatches, setShowNextMatches] = useState(false);

  const now = Date.now();
  const currentMatches = matches.filter(m => m.status !== 'completed' && m.startTime <= (now - new Date().setHours(0,0,0,0)));
  const nextMatches = matches.filter(m => m.status === 'scheduled' && !currentMatches.includes(m)).slice(0, gameConfig.courts * 2);

  const handleScoreChange = (matchId: string, team: 'team1' | 'team2', value: string) => {
    setPendingScores(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [team]: value
      }
    }));
  };

  const confirmScore = (match: Match) => {
    const scores = pendingScores[match.id];
    if (!scores || scores.team1 === undefined || scores.team2 === undefined) {
      toast.error("Please enter both scores");
      return;
    }

    const team1Score = parseInt(scores.team1) || 0;
    const team2Score = parseInt(scores.team2) || 0;

    const updatedMatches = matches.map(m => 
      m.id === match.id 
        ? { ...m, score: { team1: team1Score, team2: team2Score }, status: 'completed' as const, actualEndTime: Date.now() }
        : m
    );

    onScheduleUpdate(updatedMatches, allPlayers);
    
    // Clear pending scores
    setPendingScores(prev => {
      const newScores = { ...prev };
      delete newScores[match.id];
      return newScores;
    });

    toast.success("Score confirmed!");
  };

  const editScore = (match: Match) => {
    if (match.score) {
      setPendingScores(prev => ({
        ...prev,
        [match.id]: {
          team1: match.score!.team1.toString(),
          team2: match.score!.team2.toString()
        }
      }));
    }

    const updatedMatches = matches.map(m => 
      m.id === match.id 
        ? { ...m, status: 'in-progress' as const }
        : m
    );
    onScheduleUpdate(updatedMatches, allPlayers);
    toast.info("Score unlocked for editing");
  };

  const startEditMatch = (match: Match) => {
    setEditingMatch(match);
    setEditedTeams({
      team1: match.isSingles ? [match.team1[0]] : [match.team1[0], match.team1[1]],
      team2: match.isSingles ? [match.team2[0]] : [match.team2[0], match.team2[1]]
    });
  };

  const handlePlayerChange = (team: 'team1' | 'team2', index: number, newPlayer: string) => {
    if (!editedTeams) return;
    setEditedTeams({
      ...editedTeams,
      [team]: editedTeams[team].map((p, i) => i === index ? newPlayer : p)
    });
  };

  const confirmEditMatch = () => {
    if (!editingMatch || !editedTeams) return;

    const updatedMatch = {
      ...editingMatch,
      team1: editingMatch.isSingles ? [editedTeams.team1[0] as string] as [string] : [editedTeams.team1[0] as string, editedTeams.team1[1] as string] as [string, string],
      team2: editingMatch.isSingles ? [editedTeams.team2[0] as string] as [string] : [editedTeams.team2[0] as string, editedTeams.team2[1] as string] as [string, string],
    };

    const matchIndex = matches.findIndex(m => m.id === editingMatch.id);
    const updatedMatches = [...matches];
    updatedMatches[matchIndex] = updatedMatch;

    const newSchedule = regenerateScheduleFromSlot(
      allPlayers,
      updatedMatches.slice(0, matchIndex + 1),
      editingMatch.endTime,
      gameConfig.gameDuration,
      gameConfig.totalTime,
      gameConfig.courts,
      undefined,
      [],
      courtConfigs
    );

    onScheduleUpdate(newSchedule, allPlayers);
    setEditingMatch(null);
    setEditedTeams(null);
    toast.success("Match updated and schedule regenerated");
  };

  const toggleCourtType = (courtNumber: number) => {
    const newConfigs = courtConfigs.map(config => 
      config.courtNumber === courtNumber 
        ? { ...config, type: config.type === 'singles' ? 'doubles' as const : 'singles' as const }
        : config
    );
    setCourtConfigs(newConfigs);

    const firstScheduledMatch = matches.find(m => m.status === 'scheduled');
    if (firstScheduledMatch) {
      const newSchedule = regenerateScheduleFromSlot(
        allPlayers,
        matches.filter(m => m.status === 'completed'),
        firstScheduledMatch.startTime,
        gameConfig.gameDuration,
        gameConfig.totalTime,
        gameConfig.courts,
        undefined,
        [],
        newConfigs
      );
      onScheduleUpdate(newSchedule, allPlayers);
      toast.success("Court configuration updated");
    }
  };

  const renderTeam = (team: [string, string] | [string], isSingles?: boolean) => {
    if (isSingles) {
      return <div className="font-semibold text-lg">{team[0]}</div>;
    }
    return (
      <div className="space-y-1">
        <div className="font-semibold">{team[0]}</div>
        <div className="font-semibold">{team[1]}</div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Court Configuration */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Court Settings</h3>
        <div className="grid grid-cols-2 gap-2">
          {courtConfigs.map((config) => (
            <div key={config.courtNumber} className="flex items-center justify-between p-2 rounded bg-card border text-xs">
              <span>Court {config.courtNumber}</span>
              <div className="flex items-center gap-2">
                <span className={config.type === 'doubles' ? 'font-medium' : 'text-muted-foreground'}>D</span>
                <Switch
                  checked={config.type === 'singles'}
                  onCheckedChange={() => toggleCourtType(config.courtNumber)}
                  className="scale-75"
                />
                <span className={config.type === 'singles' ? 'font-medium' : 'text-muted-foreground'}>S</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current Matches */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-foreground">Current Matches</h3>
        {currentMatches.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No matches in progress</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {currentMatches.map((match) => (
              <Card key={match.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="secondary">Court {match.court}</Badge>
                  <Badge variant={match.isSingles ? "outline" : "default"}>
                    {match.isSingles ? "Singles" : "Doubles"}
                  </Badge>
                  {match.status !== 'completed' && (
                    <Button size="sm" variant="ghost" onClick={() => startEditMatch(match)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Override
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                  <div className="text-right">
                    {renderTeam(match.team1, match.isSingles)}
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    {match.status === 'completed' ? (
                      <>
                        <div className="text-3xl font-bold">
                          {match.score?.team1} - {match.score?.team2}
                        </div>
                        <Button size="sm" variant="outline" onClick={() => editScore(match)}>
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={pendingScores[match.id]?.team1 ?? ''}
                          onChange={(e) => handleScoreChange(match.id, 'team1', e.target.value)}
                          className="w-16 text-center text-lg"
                        />
                        <span className="text-2xl font-bold">-</span>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={pendingScores[match.id]?.team2 ?? ''}
                          onChange={(e) => handleScoreChange(match.id, 'team2', e.target.value)}
                          className="w-16 text-center text-lg"
                        />
                      </div>
                    )}
                  </div>

                  <div className="text-left">
                    {renderTeam(match.team2, match.isSingles)}
                  </div>
                </div>

                {match.status !== 'completed' && (
                  <Button 
                    className="w-full mt-4" 
                    onClick={() => confirmScore(match)}
                    disabled={!pendingScores[match.id]?.team1 || !pendingScores[match.id]?.team2}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Confirm Score & Next Match
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Next Matches */}
      {nextMatches.length > 0 && (
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowNextMatches(!showNextMatches)}
          >
            <span className="flex items-center gap-2">
              {showNextMatches ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Next Matches ({nextMatches.length})
            </span>
          </Button>

          {showNextMatches && (
            <div className="space-y-2">
              {nextMatches.map((match) => (
                <Card key={match.id} className="p-3">
                  <div className="flex items-center justify-between text-sm">
                    <Badge variant="outline" className="text-xs">Court {match.court}</Badge>
                    <div className="flex-1 mx-3 text-center">
                      <span className="font-medium">
                        {match.isSingles 
                          ? `${match.team1[0]} vs ${match.team2[0]}`
                          : `${match.team1[0]} & ${match.team1[1]} vs ${match.team2[0]} & ${match.team2[1]}`
                        }
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Match Dialog */}
      <Dialog open={!!editingMatch} onOpenChange={() => setEditingMatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Match Players</DialogTitle>
          </DialogHeader>
          {editingMatch && editedTeams && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Team 1</Label>
                {editedTeams.team1.map((player, idx) => (
                  <Select key={idx} value={player as string} onValueChange={(v) => handlePlayerChange('team1', idx, v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allPlayers.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ))}
              </div>
              <div className="space-y-2">
                <Label>Team 2</Label>
                {editedTeams.team2.map((player, idx) => (
                  <Select key={idx} value={player as string} onValueChange={(v) => handlePlayerChange('team2', idx, v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allPlayers.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMatch(null)}>Cancel</Button>
            <Button onClick={confirmEditMatch}>Confirm Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
