import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Match, CourtConfig, regenerateScheduleFromSlot } from "@/lib/scheduler";
import { validateMatchScore } from "@/lib/validation";
import { Clock3, Edit3, PlayCircle, Target, Timer, Trophy, Users } from "lucide-react";
import { toast } from "sonner";

interface ScheduleViewProps {
  matches: Match[];
  onBack: () => void;
  gameConfig: {
    gameDuration: number;
    totalTime: number;
    courts: number;
    teammatePairs?: {
      player1: string;
      player2: string;
    }[];
    courtConfigs?: CourtConfig[];
    schedulingType?: "round-robin" | "single-elimination" | "double-elimination" | "qualifier-tournament";
    tournamentPlayStyle?: "singles" | "doubles";
  };
  allPlayers: string[];
  onScheduleUpdate: (newMatches: Match[], newPlayers: string[]) => void;
  matchScores: Map<string, { team1: number; team2: number }>;
  onMatchScoresUpdate: (scores: Map<string, { team1: number; team2: number }>) => void;
  onCourtConfigUpdate?: (configs: CourtConfig[]) => void;
  isPlayerView?: boolean;
  playerName?: string | null;
  onReleaseIdentity?: () => void;
  onShowPlayerSelector?: () => void;
}

type ScoreDraft = { team1: number | string; team2: number | string };

const formatClock = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const getMatchLabel = (matches: Match[], match: Match) => {
  const courtMatches = matches.filter((entry) => entry.court === match.court);
  const index = courtMatches.findIndex((entry) => entry.id === match.id) + 1;
  return `Court ${match.court} · M${index}`;
};

export const ScheduleView = ({
  matches,
  gameConfig,
  allPlayers,
  onScheduleUpdate,
  matchScores,
  onMatchScoresUpdate,
  onCourtConfigUpdate,
  isPlayerView = false,
  playerName,
  onReleaseIdentity,
  onShowPlayerSelector,
}: ScheduleViewProps) => {
  const [pendingScores, setPendingScores] = useState<Map<string, ScoreDraft>>(new Map());
  const [courtConfigs, setCourtConfigs] = useState<CourtConfig[]>(
    gameConfig.courtConfigs || Array.from({ length: gameConfig.courts }, (_, index) => ({ courtNumber: index + 1, type: "doubles" as const }))
  );
  const [selectedCourt, setSelectedCourt] = useState(1);
  const [elapsed, setElapsed] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    setCourtConfigs(
      gameConfig.courtConfigs || Array.from({ length: gameConfig.courts }, (_, index) => ({ courtNumber: index + 1, type: "doubles" as const }))
    );
  }, [gameConfig.courtConfigs, gameConfig.courts]);

  const unscoredMatches = useMemo(() => matches.filter((match) => !matchScores.has(match.id)), [matches, matchScores]);

  const currentByCourt = useMemo(() => {
    const map = new Map<number, Match>();
    for (const match of unscoredMatches) {
      if (!map.has(match.court)) map.set(match.court, match);
    }
    return map;
  }, [unscoredMatches]);

  const nextByCourt = useMemo(() => {
    const map = new Map<number, Match>();
    for (let court = 1; court <= gameConfig.courts; court += 1) {
      const queue = unscoredMatches.filter((match) => match.court === court);
      if (queue[1]) map.set(court, queue[1]);
    }
    return map;
  }, [gameConfig.courts, unscoredMatches]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const next = new Map<number, number>();
      currentByCourt.forEach((match, court) => {
        const startBasis = match.timerStartTime ? match.timerStartTime : Date.now();
        next.set(court, Math.max(0, Math.floor((Date.now() - startBasis) / 1000)));
      });
      setElapsed(next);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [currentByCourt]);

  const waitingPlayers = useMemo(() => {
    const occupied = new Set<string>();
    currentByCourt.forEach((match) => [...match.team1, ...match.team2].forEach((player) => occupied.add(player)));
    nextByCourt.forEach((match) => [...match.team1, ...match.team2].forEach((player) => occupied.add(player)));
    return allPlayers.filter((player) => !occupied.has(player));
  }, [allPlayers, currentByCourt, nextByCourt]);

  const selectedCourtMatches = useMemo(() => matches.filter((match) => match.court === selectedCourt), [matches, selectedCourt]);

  const updatePendingScore = (matchId: string, team: "team1" | "team2", value: string) => {
    if (value === "") {
      const next = new Map(pendingScores);
      next.set(matchId, { ...(next.get(matchId) || matchScores.get(matchId) || { team1: "", team2: "" }), [team]: "" });
      setPendingScores(next);
      return;
    }

    const validation = validateMatchScore(value);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid score");
      return;
    }

    const next = new Map(pendingScores);
    next.set(matchId, { ...(next.get(matchId) || matchScores.get(matchId) || { team1: "", team2: "" }), [team]: validation.value! });
    setPendingScores(next);
  };

  const confirmScore = (match: Match) => {
    const pending = pendingScores.get(match.id) || matchScores.get(match.id);
    if (!pending || pending.team1 === "" || pending.team2 === "") {
      toast.error("Enter both scores first");
      return;
    }

    const team1 = Number(pending.team1);
    const team2 = Number(pending.team2);
    const newScores = new Map(matchScores);
    newScores.set(match.id, { team1, team2 });
    onMatchScoresUpdate(newScores);

    const updatedMatches = matches.map((entry) =>
      entry.id === match.id
        ? {
            ...entry,
            score: { team1, team2 },
            status: "completed" as const,
            actualEndTime: match.endTime,
            clockStartTime: formatClock(elapsed.get(match.court) || 0),
          }
        : newScores.has(entry.id)
          ? { ...entry, score: newScores.get(entry.id) }
          : entry
    );

    onScheduleUpdate(updatedMatches, allPlayers);

    const next = new Map(pendingScores);
    next.delete(match.id);
    setPendingScores(next);
    toast.success(matchScores.has(match.id) ? "Score updated" : "Score confirmed");
  };

  const toggleCourtType = (courtNumber: number) => {
    const updated = courtConfigs.map((config) =>
      config.courtNumber === courtNumber
        ? { ...config, type: config.type === "singles" ? ("doubles" as const) : ("singles" as const) }
        : config
    );

    setCourtConfigs(updated);
    onCourtConfigUpdate?.(updated);

    const firstUnplayedMatchIndex = matches.findIndex((match) => !matchScores.has(match.id));
    if (firstUnplayedMatchIndex < 0) return;

    const anchorMatch = matches[firstUnplayedMatchIndex];
    const playedMatches = matches.slice(0, firstUnplayedMatchIndex).map((match) => ({
      ...match,
      score: matchScores.get(match.id) || match.score,
    }));

    const regenerated = regenerateScheduleFromSlot(
      allPlayers,
      playedMatches,
      anchorMatch.startTime,
      gameConfig.gameDuration,
      gameConfig.totalTime,
      gameConfig.courts,
      undefined,
      gameConfig.teammatePairs,
      updated,
      matches
    );

    onScheduleUpdate(regenerated, allPlayers);
    toast.success(`Court ${courtNumber} switched to ${updated.find((config) => config.courtNumber === courtNumber)?.type}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-0 bg-emerald-100 text-emerald-800">Courts board</Badge>
            <Badge className="border-0 bg-slate-100 text-slate-700">Round robin live</Badge>
          </div>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Run the night from one board.</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Current match, next match, score entry, completed edits, and per-court navigation all stay visible without dropping into an old admin-style scheduler.
          </p>
        </div>

        <Button
          variant={isPlayerView ? "outline" : "default"}
          onClick={() => (isPlayerView ? onReleaseIdentity?.() : onShowPlayerSelector?.())}
          className={isPlayerView ? "rounded-full" : "rounded-full bg-emerald-500 text-white hover:bg-emerald-400"}
        >
          <Users className="mr-2 h-4 w-4" />
          {isPlayerView ? `Back to host${playerName ? ` · ${playerName}` : ""}` : "Player view"}
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-4 md:grid-cols-2">
          {courtConfigs.map((config) => {
            const live = currentByCourt.get(config.courtNumber);
            const next = nextByCourt.get(config.courtNumber);
            const doneCount = matches.filter((match) => match.court === config.courtNumber && matchScores.has(match.id)).length;

            return (
              <Card
                key={config.courtNumber}
                className="overflow-hidden rounded-[1.75rem] border-white/10 bg-[linear-gradient(145deg,rgba(9,18,31,0.97),rgba(16,86,74,0.9),rgba(8,14,27,0.98))] p-5 text-white shadow-2xl shadow-emerald-950/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-white/50">Court {config.courtNumber}</div>
                    <div className="mt-2 text-xl font-semibold">{live ? "Playing now" : "Waiting for next match"}</div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white/80">{doneCount} done</div>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm">
                  <span className="text-white/70">Format</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${config.type === "singles" ? "text-white/50" : "font-medium text-white"}`}>Doubles</span>
                    <Switch checked={config.type === "singles"} onCheckedChange={() => toggleCourtType(config.courtNumber)} />
                    <span className={`text-xs ${config.type === "singles" ? "font-medium text-white" : "text-white/50"}`}>Singles</span>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-[1.35rem] border border-emerald-300/20 bg-emerald-300/10 p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-emerald-100/85">
                      <PlayCircle className="h-3.5 w-3.5" />
                      Current
                    </div>
                    <div className="mt-2 text-sm leading-6 text-white/90">
                      {live ? `${live.team1.join(" · ")} vs ${live.team2.join(" · ")}` : "No live match yet."}
                    </div>
                    {live ? (
                      <div className="mt-3 flex items-center gap-2 text-xs text-white/70">
                        <Timer className="h-3.5 w-3.5" />
                        {formatClock(elapsed.get(config.courtNumber) || 0)}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/55">
                      <Target className="h-3.5 w-3.5" />
                      Next up
                    </div>
                    <div className="mt-2 text-sm leading-6 text-white/85">
                      {next ? `${next.team1.join(" · ")} vs ${next.team2.join(" · ")}` : "No queued follow-up yet."}
                    </div>
                  </div>

                  <Button variant="outline" onClick={() => setSelectedCourt(config.courtNumber)} className="w-full rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                    Open court {config.courtNumber} queue
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="space-y-4">
          <Card className="rounded-[1.75rem] border-white/10 bg-white/95 p-5 shadow-xl shadow-slate-950/5">
            <div className="flex items-center gap-2 text-slate-900">
              <Users className="h-4 w-4 text-emerald-600" />
              <h4 className="font-semibold">Waiting / bench</h4>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {waitingPlayers.length > 0 ? (
                waitingPlayers.map((player) => (
                  <Badge key={player} variant="secondary" className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">
                    {player}
                  </Badge>
                ))
              ) : (
                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">Everyone is either playing now or queued next.</div>
              )}
            </div>
          </Card>

          <Card className="rounded-[1.75rem] border-white/10 bg-white/95 p-5 shadow-xl shadow-slate-950/5">
            <div className="flex items-center gap-2 text-slate-900">
              <Trophy className="h-4 w-4 text-violet-600" />
              <h4 className="font-semibold">Quick status</h4>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.25rem] bg-slate-100 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Completed</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{matchScores.size}</div>
              </div>
              <div className="rounded-[1.25rem] bg-slate-100 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Unplayed</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{unscoredMatches.length}</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="rounded-[1.9rem] border-white/10 bg-white/95 p-4 shadow-2xl shadow-slate-950/5 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Court queue</div>
            <h4 className="mt-1 text-xl font-semibold text-slate-900">Court {selectedCourt} match navigation</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {courtConfigs.map((config) => (
              <Button
                key={config.courtNumber}
                variant={selectedCourt === config.courtNumber ? "default" : "outline"}
                onClick={() => setSelectedCourt(config.courtNumber)}
                className={selectedCourt === config.courtNumber ? "rounded-full bg-emerald-500 text-white hover:bg-emerald-400" : "rounded-full"}
              >
                Court {config.courtNumber}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {selectedCourtMatches.map((match, index) => {
            const confirmed = matchScores.get(match.id);
            const pending = pendingScores.get(match.id);
            const score = pending || confirmed || { team1: "", team2: "" };
            const isCurrent = currentByCourt.get(selectedCourt)?.id === match.id;
            const isNext = nextByCourt.get(selectedCourt)?.id === match.id;
            const isDone = Boolean(confirmed);

            return (
              <Card
                key={match.id}
                className={`rounded-[1.5rem] border p-4 shadow-lg shadow-slate-950/5 ${
                  isCurrent
                    ? "border-emerald-300 bg-emerald-50"
                    : isNext
                      ? "border-amber-200 bg-amber-50"
                      : isDone
                        ? "border-slate-200 bg-slate-50"
                        : "border-white/10 bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge className="border-0 bg-slate-900 text-white">{getMatchLabel(matches, match)}</Badge>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" />
                    {match.startTime}m
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {isCurrent ? <Badge className="border-0 bg-emerald-500 text-white">Live</Badge> : null}
                  {isNext ? <Badge className="border-0 bg-amber-500 text-white">Next</Badge> : null}
                  {isDone ? <Badge className="border-0 bg-slate-700 text-white">Completed</Badge> : null}
                  {!isCurrent && !isNext && !isDone ? <Badge variant="secondary">Queued</Badge> : null}
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-[1.1rem] bg-white/80 p-3 ring-1 ring-slate-200">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Team 1</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{match.team1.join(" · ")}</div>
                  </div>
                  <div className="rounded-[1.1rem] bg-white/80 p-3 ring-1 ring-slate-200">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Team 2</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{match.team2.join(" · ")}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">Score</div>
                    <Input
                      type="number"
                      min="0"
                      value={score.team1}
                      onChange={(event) => updatePendingScore(match.id, "team1", event.target.value)}
                      className="h-11 rounded-2xl border-2 border-slate-300 bg-white text-center text-lg font-semibold text-slate-900 placeholder:text-slate-400"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">Score</div>
                    <Input
                      type="number"
                      min="0"
                      value={score.team2}
                      onChange={(event) => updatePendingScore(match.id, "team2", event.target.value)}
                      className="h-11 rounded-2xl border-2 border-slate-300 bg-white text-center text-lg font-semibold text-slate-900 placeholder:text-slate-400"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button onClick={() => confirmScore(match)} className="flex-1 rounded-full bg-emerald-500 text-white hover:bg-emerald-400">
                    {isDone ? <Edit3 className="mr-2 h-4 w-4" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                    {isDone ? "Save edit" : isCurrent ? "Confirm & next" : "Save score"}
                  </Button>
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  {index === 0 ? "First match in this court queue." : "You can edit completed scores here too."}
                </div>
              </Card>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
