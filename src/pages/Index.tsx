import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  Clock3,
  Copy,
  Crown,
  Flame,
  Link2,
  Loader2,
  Medal,
  PartyPopper,
  Plus,
  QrCode,
  Share2,
  Sparkles,
  TrendingUp,
  Trophy,
  Unlink,
  UserMinus,
  Users,
  UserCircle2,
  Waves,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { GameSetup, GameConfig } from "@/components/GameSetup";
import { PlayerIdentitySelector } from "@/components/PlayerIdentitySelector";
import { MyMatchesView } from "@/components/MyMatchesView";
import { usePlayerIdentity } from "@/hooks/use-player-identity";
import { usePlayerMatches } from "@/hooks/use-player-matches";
import { usePlayerNotifications } from "@/hooks/use-player-notifications";
import { supabase } from "@/integrations/supabase/client";
import { setSkipNextMatch } from "@/lib/player-identity";
import { generateSchedule, Match } from "@/lib/scheduler";
import { computeCourtStatus } from "@/lib/court-status";
import { safeStorage } from "@/lib/safe-storage";
import { debugLogger } from "@/lib/debug-logger";
import { validateMatchScore, validatePlayerName } from "@/lib/validation";

const STORAGE_GAME_ID = "picklematch_game_id";
const STORAGE_GAME_CODE = "picklematch_game_code";

type MainStep = "start" | "setup" | "players" | "courts" | "wrap";
type ScoreDraft = { team1: number | string; team2: number | string };

type PlayerStanding = {
  player: string;
  wins: number;
  losses: number;
  matchesPlayed: number;
  winRate: number;
  totalScored: number;
  totalAllowed: number;
  differential: number;
  differentialPerGame: number;
};

const STEP_ORDER: MainStep[] = ["start", "setup", "players", "courts", "wrap"];

const STEP_LABELS: Record<MainStep, string> = {
  start: "Start",
  setup: "Setup",
  players: "Players",
  courts: "Courts",
  wrap: "Wrap",
};

const adSlot = (label: string) => (
  <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 px-4 py-5 text-center text-xs uppercase tracking-[0.24em] text-white/55">
    Reserved AdSense space · {label}
  </div>
);

const parseBulkNames = (value: string) =>
  Array.from(
    new Set(
      value
        .split(/[\n,]+/)
        .map((name) => name.trim())
        .filter(Boolean)
    )
  );

const sanitizeMatches = (arr: Match[]): Match[] => {
  const seen = new Map<string, number>();
  return arr.map((m) => {
    const baseId = m.id && m.id.trim() !== "" ? m.id : `match-c${m.court}-t${m.startTime}`;
    const count = seen.get(baseId) || 0;
    seen.set(baseId, count + 1);
    const id = count === 0 ? baseId : `${baseId}-v${count + 1}`;
    return { ...m, id };
  });
};

const getNextStep = (step: MainStep): MainStep => STEP_ORDER[Math.min(STEP_ORDER.indexOf(step) + 1, STEP_ORDER.length - 1)];
const getPreviousStep = (step: MainStep): MainStep => STEP_ORDER[Math.max(STEP_ORDER.indexOf(step) - 1, 0)];

const getTeamLabel = (team: Match["team1"] | Match["team2"]) => team.join(" · ");

const getMatchLabel = (matches: Match[], match: Match) => {
  const courtMatches = matches.filter((entry) => entry.court === match.court);
  const index = courtMatches.findIndex((entry) => entry.id === match.id) + 1;
  return `C${match.court}-${Math.max(index, 1)}`;
};

const normalizeRoundRobinConfig = (config: GameConfig): GameConfig => {
  const safeCourts = Math.max(1, Number.isFinite(config.courts) ? Math.round(config.courts) : 1);
  const safeGameDuration = [5, 10, 15].includes(config.gameDuration) ? config.gameDuration : 10;
  const safeTotalTime = Number.isFinite(config.totalTime) && config.totalTime > 0 ? Math.round(config.totalTime) : 60;
  const normalizedCourtConfigs = Array.from({ length: safeCourts }, (_, index) => {
    const existing = config.courtConfigs?.[index];
    return {
      courtNumber: index + 1,
      type: existing?.type === "singles" ? "singles" as const : "doubles" as const,
    };
  });

  return {
    gameDuration: safeGameDuration,
    totalTime: safeTotalTime,
    courts: safeCourts,
    courtConfigs: normalizedCourtConfigs,
    teammatePairs: config.teammatePairs,
    schedulingType: "round-robin",
    tournamentPlayStyle: undefined,
  };
};

const buildStandings = (
  players: string[],
  matches: Match[],
  matchScores: Map<string, { team1: number; team2: number }>
): PlayerStanding[] => {
  const stats = players.map((player) => {
    let wins = 0;
    let losses = 0;
    let totalScored = 0;
    let totalAllowed = 0;
    let matchesPlayed = 0;

    matches.forEach((match) => {
      const score = matchScores.get(match.id);
      if (!score) return;

      const isInTeam1 = match.team1.includes(player);
      const isInTeam2 = match.team2.includes(player);
      if (!isInTeam1 && !isInTeam2) return;

      matchesPlayed += 1;
      const team1Score = Number(score.team1);
      const team2Score = Number(score.team2);

      if (isInTeam1) {
        totalScored += team1Score;
        totalAllowed += team2Score;
        if (team1Score > team2Score) wins += 1;
        if (team1Score < team2Score) losses += 1;
      }

      if (isInTeam2) {
        totalScored += team2Score;
        totalAllowed += team1Score;
        if (team2Score > team1Score) wins += 1;
        if (team2Score < team1Score) losses += 1;
      }
    });

    const winRate = matchesPlayed > 0 ? wins / matchesPlayed : 0;
    const differential = totalScored - totalAllowed;
    const differentialPerGame = matchesPlayed > 0 ? differential / matchesPlayed : 0;

    return {
      player,
      wins,
      losses,
      matchesPlayed,
      winRate,
      totalScored,
      totalAllowed,
      differential,
      differentialPerGame,
    };
  });

  return stats.sort((a, b) => {
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    if (b.differentialPerGame !== a.differentialPerGame) return b.differentialPerGame - a.differentialPerGame;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.player.localeCompare(b.player);
  });
};

const StartScreen = ({
  joinCode,
  onJoinCodeChange,
  onJoin,
  onCreate,
  hasResume,
  onResume,
  loading,
}: {
  joinCode: string;
  onJoinCodeChange: (value: string) => void;
  onJoin: () => void;
  onCreate: () => void;
  hasResume: boolean;
  onResume: () => void;
  loading: boolean;
}) => {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-white/10 bg-[linear-gradient(140deg,rgba(22,28,45,0.96),rgba(21,78,74,0.88),rgba(13,18,31,0.96))] p-6 text-white shadow-2xl shadow-cyan-950/30 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <Badge className="border-0 bg-white/12 text-white">Round robin nights, no mode maze</Badge>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              Run one court or two, keep the room moving, and make the board feel alive.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
              PickleMatch now starts where a real club night starts: create a session fast, join with a code fast,
              then move straight into players, courts, scoring, and the end-of-night recap.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/80">
              <span className="rounded-full bg-white/10 px-3 py-2">1 or 2 courts only</span>
              <span className="rounded-full bg-white/10 px-3 py-2">Singles or doubles</span>
              <span className="rounded-full bg-white/10 px-3 py-2">Realtime shared session board</span>
            </div>
          </div>

          <div className="space-y-4 rounded-[2rem] border border-white/12 bg-white/10 p-5 backdrop-blur-xl">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/55">Start a night</p>
              <h2 className="mt-2 text-2xl font-semibold">Create or join immediately</h2>
            </div>

            <Button onClick={onCreate} size="lg" className="h-12 w-full bg-lime-400 text-slate-950 hover:bg-lime-300">
              <Plus className="mr-2 h-4 w-4" />
              Create session
            </Button>

            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="mb-3 text-sm font-medium text-white/88">Join with code</p>
              <div className="flex gap-2">
                <Input
                  value={joinCode}
                  onChange={(event) => onJoinCodeChange(event.target.value.toUpperCase())}
                  placeholder="Enter code"
                  maxLength={8}
                  className="h-11 border-white/10 bg-white/10 font-mono text-white placeholder:text-white/35"
                />
                <Button onClick={onJoin} disabled={loading || !joinCode.trim()} className="h-11 px-5">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {hasResume ? (
              <Button variant="outline" onClick={onResume} className="h-11 w-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                Resume saved session
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      {adSlot("start footer")}
    </div>
  );
};

const SessionBottomNav = ({
  activeStep,
  onSelect,
  disabled,
  canOpenPlayers,
  canOpenCourts,
  canOpenWrap,
}: {
  activeStep: MainStep;
  onSelect: (step: MainStep) => void;
  disabled?: boolean;
  canOpenPlayers: boolean;
  canOpenCourts: boolean;
  canOpenWrap: boolean;
}) => {
  const items: { step: MainStep; label: string; enabled: boolean }[] = [
    { step: "setup", label: "Setup", enabled: true },
    { step: "players", label: "Players", enabled: canOpenPlayers },
    { step: "courts", label: "Courts", enabled: canOpenCourts },
    { step: "wrap", label: "Wrap", enabled: canOpenWrap },
  ];

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-3 sm:px-6">
      <div className="mx-auto flex max-w-md items-center gap-2 rounded-[1.75rem] border border-white/12 bg-slate-950/92 p-2 shadow-2xl shadow-black/35 backdrop-blur-xl">
        {items.map((item) => {
          const isActive = activeStep === item.step;
          const isDisabled = disabled || !item.enabled;
          return (
            <button
              key={item.step}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelect(item.step)}
              className={`flex min-w-0 flex-1 flex-col items-center rounded-[1.1rem] px-2 py-2 text-[11px] font-semibold transition ${
                isActive ? "bg-lime-400 text-slate-950" : "text-white/70 hover:bg-white/10 hover:text-white"
              } ${isDisabled ? "cursor-not-allowed opacity-40" : ""}`}
            >
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const SessionHeader = ({
  activeStep,
  gameCode,
  players,
  matchScores,
  matches,
  isPlayerView,
  playerName,
  onShowPlayerSelector,
  onReleaseIdentity,
  onShare,
}: {
  activeStep: MainStep;
  gameCode: string;
  players: string[];
  matchScores: Map<string, { team1: number; team2: number }>;
  matches: Match[];
  isPlayerView: boolean;
  playerName: string | null;
  onShowPlayerSelector: () => void;
  onReleaseIdentity: () => void;
  onShare: () => void;
}) => {
  return (
    <div className="flex flex-col gap-3 rounded-[1.4rem] border border-white/10 bg-slate-950/60 p-3 text-white shadow-xl shadow-cyan-950/10 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
        <Badge className="border-0 bg-white/10 text-white">{STEP_LABELS[activeStep]}</Badge>
        {gameCode ? <Badge className="border-0 bg-lime-400 text-slate-950">{gameCode}</Badge> : null}
        <span className="rounded-full bg-white/8 px-3 py-1 text-white/75">{players.length} players</span>
        <span className="rounded-full bg-white/8 px-3 py-1 text-white/75">{matchScores.size} done</span>
      </div>

      <div className="flex items-center gap-2 self-start sm:self-auto">
        <Button variant="outline" size="sm" onClick={onShare} className="h-9 border-white/15 bg-white/5 px-3 text-white hover:bg-white/10 hover:text-white">
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
        {!isPlayerView ? (
          <Button size="sm" onClick={onShowPlayerSelector} className="h-9 bg-lime-400 px-3 text-slate-950 hover:bg-lime-300">
            <UserCircle2 className="mr-2 h-4 w-4" />
            I'm playing
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={onReleaseIdentity} className="h-9 border-white/15 bg-white/5 px-3 text-white hover:bg-white/10 hover:text-white">
            <Users className="mr-2 h-4 w-4" />
            Host{playerName ? ` · ${playerName}` : ""}
          </Button>
        )}
      </div>
    </div>
  );
};

const SetupScreen = ({
  gameCode,
  onComplete,
  onNewSession,
  hasExistingMatches,
}: {
  gameCode: string;
  onComplete: (config: GameConfig) => void;
  onNewSession?: () => void;
  hasExistingMatches: boolean;
}) => (
  <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
    <Card className="border-white/10 bg-slate-900/80 p-4 sm:p-5 text-white">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/55">Setup</div>
          <div className="mt-1 text-base font-semibold text-white">Pick format, court count, target score, and session length.</div>
        </div>
        {gameCode ? <Badge className="border-0 bg-emerald-500/20 text-emerald-300">Code {gameCode}</Badge> : null}
      </div>

      <GameSetup
        onComplete={onComplete}
        gameCode={gameCode}
        onNewSession={onNewSession}
        hasExistingMatches={hasExistingMatches}
        quickCourtMode
      />
    </Card>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
      <Card className="border-white/10 bg-slate-950/70 p-4 text-white">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/55">
          <QrCode className="h-3.5 w-3.5" />
          Live rules
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
          <div className="rounded-[1rem] border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/78">Round robin only</div>
          <div className="rounded-[1rem] border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/78">1-2 courts only</div>
          <div className="rounded-[1rem] border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/78">Save here, roster next</div>
        </div>
      </Card>

      <Card className="border-white/10 bg-slate-900/60 p-4 text-white">
        <div className="text-[11px] uppercase tracking-[0.2em] text-white/55">Sharing</div>
        <p className="mt-2 text-sm leading-6 text-white/65">Once saved, the same session opens on phones and iPad with the code or join link.</p>
      </Card>

      {adSlot("setup sidebar")}
    </div>
  </div>
);

const PlayersScreen = ({
  gameCode,
  players,
  matches,
  teammatePairs = [],
  minimumPlayersRequired,
  onPlayersChange,
  onPlayersUpdate,
}: {
  gameCode: string;
  players: string[];
  matches: Match[];
  matchScores: Map<string, { team1: number; team2: number }>;
  teammatePairs?: { player1: string; player2: string }[];
  minimumPlayersRequired: number;
  onPlayersChange: (players: string[], pairs?: { player1: string; player2: string }[]) => void;
  onPlayersUpdate: (players: string[], pairs?: { player1: string; player2: string }[]) => Promise<boolean>;
  onNavigateToCourts: () => void;
}) => {
  const [roster, setRoster] = useState(players);
  const [bulkNames, setBulkNames] = useState("");
  const [currentName, setCurrentName] = useState("");
  const [pairings, setPairings] = useState(teammatePairs);
  const [selectedForPairing, setSelectedForPairing] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => setRoster(players), [players]);
  useEffect(() => setPairings(teammatePairs), [teammatePairs]);

  const bulkParsed = useMemo(() => parseBulkNames(bulkNames), [bulkNames]);
  const ready = roster.length >= minimumPlayersRequired;
  const lockedPlayers = new Set(pairings.flatMap((pair) => [pair.player1, pair.player2]));

  const syncRoster = useCallback((nextRoster: string[], nextPairings = pairings) => {
    setRoster(nextRoster);
    setPairings(nextPairings);
    onPlayersChange(nextRoster, nextPairings);
  }, [onPlayersChange, pairings]);

  const addOnePlayer = useCallback(() => {
    const trimmed = currentName.trim();
    if (!trimmed) return;

    const validation = validatePlayerName(trimmed);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid player name");
      return;
    }

    if (roster.some((player) => player.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("That player is already in the roster");
      return;
    }

    syncRoster([...roster, trimmed]);
    setCurrentName("");
  }, [currentName, roster, syncRoster]);

  const addBatchPlayers = useCallback(() => {
    const additions: string[] = [];

    for (const name of bulkParsed) {
      const validation = validatePlayerName(name);
      if (!validation.valid) continue;
      if (roster.some((player) => player.toLowerCase() === name.toLowerCase())) continue;
      if (additions.some((player) => player.toLowerCase() === name.toLowerCase())) continue;
      additions.push(name);
    }

    if (additions.length === 0) {
      toast.error("No new valid names to add");
      return;
    }

    syncRoster([...roster, ...additions]);
    setBulkNames("");
    toast.success(`${additions.length} player${additions.length === 1 ? "" : "s"} added`);
  }, [bulkParsed, roster, syncRoster]);

  const removePlayer = useCallback((playerToRemove: string) => {
    const nextPairings = pairings.filter((pair) => pair.player1 !== playerToRemove && pair.player2 !== playerToRemove);
    if (selectedForPairing === playerToRemove) setSelectedForPairing(null);
    syncRoster(roster.filter((player) => player !== playerToRemove), nextPairings);
  }, [pairings, roster, selectedForPairing, syncRoster]);

  const getPartner = useCallback((player: string) => {
    const pair = pairings.find((entry) => entry.player1 === player || entry.player2 === player);
    if (!pair) return null;
    return pair.player1 === player ? pair.player2 : pair.player1;
  }, [pairings]);

  const togglePairing = useCallback((player: string) => {
    const partner = getPartner(player);
    if (partner) {
      const nextPairings = pairings.filter((pair) => !(pair.player1 === player && pair.player2 === partner) && !(pair.player1 === partner && pair.player2 === player));
      syncRoster(roster, nextPairings);
      toast.success("Pair removed");
      return;
    }

    if (selectedForPairing === player) {
      setSelectedForPairing(null);
      return;
    }

    if (!selectedForPairing) {
      setSelectedForPairing(player);
      return;
    }

    const nextPairings = [...pairings, { player1: selectedForPairing, player2: player }];
    syncRoster(roster, nextPairings);
    setSelectedForPairing(null);
    toast.success(`${selectedForPairing} & ${player} locked together`);
  }, [getPartner, pairings, roster, selectedForPairing, syncRoster]);

  const startOrUpdateSession = useCallback(async () => {
    if (!ready || isSaving) return;
    setIsSaving(true);
    try {
      await onPlayersUpdate(roster, pairings);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, onPlayersUpdate, pairings, ready, roster]);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
        <Card className="border-white/10 bg-slate-900/70 p-3 text-white">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">Code</div>
          <div className="mt-1 text-xl font-semibold">{gameCode || "Draft"}</div>
        </Card>
        <Card className="border-white/10 bg-slate-900/70 p-3 text-white">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">Roster</div>
          <div className="mt-1 text-xl font-semibold">{roster.length}</div>
        </Card>
        <Card className="border-white/10 bg-slate-900/70 p-3 text-white">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">Pairs</div>
          <div className="mt-1 text-xl font-semibold">{pairings.length}</div>
        </Card>
        <Card className="border-white/10 bg-slate-950/85 p-3 text-white">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">Ready</div>
          <div className="mt-1 text-sm font-semibold">{ready ? "Can start" : `${minimumPlayersRequired - roster.length} more needed`}</div>
        </Card>
      </div>

      {selectedForPairing ? (
        <Card className="border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-300">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Check className="h-4 w-4" />
            Pairing {selectedForPairing} - tap a partner card next.
          </div>
        </Card>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-3">
          <Card className="border-white/10 bg-slate-900/70 p-4 text-white">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/55">Quick add</div>
                <Input
                  value={currentName}
                  onChange={(event) => setCurrentName(event.target.value)}
                  placeholder="Add one player"
                  maxLength={50}
                  className="mt-2 h-11 rounded-2xl border-white/10 bg-white/10 text-white placeholder:text-white/35"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addOnePlayer();
                  }}
                />
              </div>
              <Button onClick={addOnePlayer} disabled={!currentName.trim()} className="h-11 rounded-2xl bg-emerald-500 px-4 text-white hover:bg-emerald-400">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          <Card className="border-white/10 bg-slate-950/85 p-4 text-white">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-white/65">Minimum {minimumPlayersRequired}</span>
              <span className="text-white/65">Now {roster.length}</span>
              <span className="text-white/65">{matches.length > 0 ? "Refresh schedule" : "Generate schedule"}</span>
            </div>
            <Button onClick={() => void startOrUpdateSession()} disabled={!ready || isSaving} className="mt-3 h-11 w-full rounded-2xl bg-lime-400 text-base font-semibold text-slate-950 hover:bg-lime-300">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {matches.length > 0 ? "Update session" : "Start session"}
            </Button>
          </Card>

          <Card className="border-white/10 bg-slate-900/70 p-4 text-white">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/55">Roster</div>
              <Badge className="border-0 bg-lime-400 text-slate-950">{roster.length}</Badge>
            </div>
            {roster.length > 0 ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {roster.map((player) => {
                  const partner = getPartner(player);
                  const selected = selectedForPairing === player;

                  return (
                    <Card
                      key={player}
                      className={`rounded-[1.2rem] border p-3 shadow-sm transition ${
                        selected ? "border-emerald-400/40 bg-emerald-500/15" : partner ? "border-sky-400/30 bg-sky-500/10" : "border-white/10 bg-white/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-white">{player}</div>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {partner ? <Badge className="rounded-full border-0 bg-sky-500/30 text-sky-200">{partner}</Badge> : null}
                            {!partner && lockedPlayers.size === 0 ? <Badge variant="secondary" className="rounded-full bg-lime-400/15 text-lime-300">Open</Badge> : null}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removePlayer(player)} className="h-7 w-7 rounded-full p-0 text-white/50 hover:bg-red-500/20 hover:text-red-400">
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <Button type="button" variant="outline" onClick={() => togglePairing(player)} className="h-9 flex-1 rounded-full border-white/15 bg-white/5 px-3 text-xs text-white hover:bg-white/10 hover:text-white">
                          {partner ? <Unlink className="mr-1.5 h-3.5 w-3.5" /> : <Link2 className="mr-1.5 h-3.5 w-3.5" />}
                          {partner ? "Unpair" : selected ? "Cancel" : "Pair"}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => removePlayer(player)} className="h-9 rounded-full border-white/15 bg-white/5 px-3 text-white hover:bg-white/10 hover:text-white">
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="mt-3 rounded-[1.25rem] border border-dashed border-white/15 bg-white/5 px-5 py-10 text-center text-sm text-white/55">
                No players yet. Add a few names and start the night.
              </div>
            )}
          </Card>
        </div>

        <Card className="border-white/10 bg-slate-900/70 p-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/55">Batch add</div>
            <div className="text-xs text-white/40">Comma or line-break separated</div>
          </div>
          <Textarea
            value={bulkNames}
            onChange={(event) => setBulkNames(event.target.value)}
            placeholder="Maya, Theo, Jules, Iris, 小明, 阿華"
            className="mt-3 min-h-[132px] rounded-[1.25rem] border-white/10 bg-white/10 text-white placeholder:text-white/30"
          />
          <div className="mt-3 flex justify-end">
            <Button onClick={addBatchPlayers} disabled={bulkParsed.length === 0} variant="outline" className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
              Add batch
            </Button>
          </div>
        </Card>
      </div>

      {adSlot("players footer")}
    </div>
  );
};

const CourtBlock = ({
  court,
  live,
  next,
  courtMatches,
  allMatches,
  matchScores,
  pendingScores,
  updatePendingScore,
  saveScore,
}: {
  court: number;
  live: Match | undefined;
  next: Match | undefined;
  courtMatches: Match[];
  allMatches: Match[];
  matchScores: Map<string, { team1: number; team2: number }>;
  pendingScores: Map<string, ScoreDraft>;
  updatePendingScore: (matchId: string, team: "team1" | "team2", value: string) => void;
  saveScore: (match: Match) => void;
}) => {
  const score = live ? pendingScores.get(live.id) || matchScores.get(live.id) || { team1: "", team2: "" } : null;
  const doneCount = courtMatches.filter((m) => matchScores.has(m.id)).length;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* Live current match section */}
      <Card className="overflow-hidden border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-cyan-950/10 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">Court {court}</div>
            <div className="mt-1 text-lg font-semibold">{live ? "Live match" : next ? "Next match ready" : "Standby"}</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="border-0 bg-white/10 text-white/70">{doneCount} done</Badge>
            <Badge className={`border-0 ${live ? "bg-emerald-500 text-white" : "bg-white/10 text-white/60"}`}>{live ? "Playing" : "Standby"}</Badge>
          </div>
        </div>

        <div className="mt-3 rounded-[1.4rem] bg-[linear-gradient(135deg,#0f172a,#115e59,#0f172a)] p-4 text-white">
          {live ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-[1rem] bg-white/10 px-3 py-2.5">
                  <div className="min-w-0 flex-1 truncate text-sm font-semibold">{getTeamLabel(live.team1)}</div>
                  <Input
                    type="number"
                    min="0"
                    value={score?.team1 ?? ""}
                    onChange={(event) => updatePendingScore(live.id, "team1", event.target.value)}
                    className="h-10 w-20 shrink-0 rounded-xl border-white/10 bg-white text-center text-xl font-semibold text-slate-900"
                  />
                </div>
                <div className="flex items-center gap-2 rounded-[1rem] bg-white/10 px-3 py-2.5">
                  <div className="min-w-0 flex-1 truncate text-sm font-semibold">{getTeamLabel(live.team2)}</div>
                  <Input
                    type="number"
                    min="0"
                    value={score?.team2 ?? ""}
                    onChange={(event) => updatePendingScore(live.id, "team2", event.target.value)}
                    className="h-10 w-20 shrink-0 rounded-xl border-white/10 bg-white text-center text-xl font-semibold text-slate-900"
                  />
                </div>
              </div>
              <Button onClick={() => saveScore(live)} className="mt-3 h-11 w-full rounded-full bg-lime-400 text-base font-semibold text-slate-950 hover:bg-lime-300">
                Confirm & next
              </Button>
            </>
          ) : next ? (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-[0.18em] text-white/55">Next up</div>
              <div className="rounded-[1rem] bg-white/10 px-3 py-2.5 text-sm font-semibold">{getTeamLabel(next.team1)}</div>
              <div className="text-center text-xs text-white/40">vs</div>
              <div className="rounded-[1rem] bg-white/10 px-3 py-2.5 text-sm font-semibold">{getTeamLabel(next.team2)}</div>
            </div>
          ) : (
            <div className="rounded-[1rem] border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/70">No live match on this court yet.</div>
          )}
        </div>
      </Card>

      {/* Court match rail */}
      <div className="min-w-0 w-full overflow-hidden">
        {courtMatches.length === 0 ? (
          <div className="rounded-[1rem] border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/65">No matches for this court yet.</div>
        ) : (
          <div className="flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch]">
            {courtMatches.map((match) => {
              const isCompleted = matchScores.has(match.id);
              const isCurrent = live?.id === match.id;
              const isNext = next?.id === match.id;
              const matchScore = matchScores.get(match.id);

              const statusLabel = isCompleted ? "Final" : isCurrent ? "Live" : isNext ? "Next" : "Later";
              const statusClass = isCompleted
                ? "bg-violet-500/20 text-violet-200"
                : isCurrent
                  ? "bg-emerald-500 text-white"
                  : isNext
                    ? "bg-amber-500 text-white"
                    : "bg-white/10 text-white";
              const cardClass = isCompleted
                ? "border-violet-300/15 bg-violet-400/10"
                : isCurrent
                  ? "border-emerald-300/20 bg-emerald-300/10"
                  : isNext
                    ? "border-amber-300/20 bg-amber-300/10 ring-1 ring-amber-300/25"
                    : "border-white/10 bg-white/5";

              return (
                <div
                  key={match.id}
                  className={`w-40 min-w-[10rem] shrink-0 rounded-[1rem] border p-2.5 ${cardClass}`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <Badge className={`border-0 px-1.5 py-0.5 text-[10px] ${statusClass}`}>{statusLabel}</Badge>
                    <div className="text-[10px] text-white/55">{getMatchLabel(allMatches, match)}</div>
                  </div>

                  <div className="mt-2 space-y-1.5">
                    <div className="rounded-[0.8rem] bg-black/15 px-2 py-1.5">
                      <div className="truncate text-[11px] leading-4 text-white/90">{getTeamLabel(match.team1)}</div>
                    </div>
                    <div className="rounded-[0.8rem] bg-black/15 px-2 py-1.5">
                      <div className="truncate text-[11px] leading-4 text-white/90">{getTeamLabel(match.team2)}</div>
                    </div>
                  </div>

                  {isCompleted && matchScore ? (
                    <div className="mt-2 flex items-center justify-between rounded-[0.85rem] border border-white/10 bg-black/20 px-2.5 py-2">
                      <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">Score</div>
                      <div className="text-sm font-semibold text-white">
                        {matchScore.team1}
                        <span className="px-1.5 text-white/35">-</span>
                        {matchScore.team2}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-[10px] text-white/55">
                      {isCurrent ? "Playing now" : isNext ? "Up next" : "Scheduled"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const CourtsScreen = ({
  matches,
  matchScores,
  players,
  courts,
  onScheduleUpdate,
  onMatchScoresUpdate,
}: {
  matches: Match[];
  matchScores: Map<string, { team1: number; team2: number }>;
  players: string[];
  courts: number;
  onScheduleUpdate: (updatedMatches: Match[], updatedPlayers: string[]) => void;
  onMatchScoresUpdate: (scores: Map<string, { team1: number; team2: number }>) => void;
}) => {
  const [pendingScores, setPendingScores] = useState<Map<string, ScoreDraft>>(new Map());

  const courtStatus = useMemo(
    () => computeCourtStatus(matches, matchScores, players, courts),
    [matches, matchScores, players, courts],
  );

  const { currentByCourt, nextByCourt } = courtStatus;

  const courtMatchesMap = useMemo(() => {
    const map = new Map<number, Match[]>();
    for (let c = 1; c <= courts; c++) {
      map.set(c, matches.filter((m) => m.court === c));
    }
    return map;
  }, [matches, courts]);

  const updatePendingScore = useCallback((matchId: string, team: "team1" | "team2", value: string) => {
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
  }, [matchScores, pendingScores]);

  const saveScore = useCallback((match: Match) => {
    const pending = pendingScores.get(match.id) || matchScores.get(match.id);
    if (!pending || pending.team1 === "" || pending.team2 === "") {
      toast.error("Enter both scores first");
      return;
    }

    const team1 = Number(pending.team1);
    const team2 = Number(pending.team2);
    const nextScores = new Map(matchScores);
    nextScores.set(match.id, { team1, team2 });
    onMatchScoresUpdate(nextScores);

    const updatedMatches = matches.map((entry) => {
      if (entry.id === match.id) {
        return {
          ...entry,
          score: { team1, team2 },
          status: "completed" as const,
          actualEndTime: entry.endTime,
        };
      }

      if (nextScores.has(entry.id)) {
        return { ...entry, score: nextScores.get(entry.id) };
      }

      return entry;
    });

    onScheduleUpdate(updatedMatches, players);

    const nextPending = new Map(pendingScores);
    nextPending.delete(match.id);
    setPendingScores(nextPending);
    toast.success(matchScores.has(match.id) ? "Score updated" : `Court ${match.court} advanced`);
  }, [matchScores, matches, onMatchScoresUpdate, onScheduleUpdate, pendingScores, players]);

  return (
    <div className="space-y-3">
      {/* Summary stats bar */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-white/10 bg-slate-900/70 p-3 text-center text-white">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">Live</div>
          <div className="mt-1 text-xl font-semibold">{Array.from(currentByCourt.values()).length}</div>
        </Card>
        <Card className="border-white/10 bg-slate-900/70 p-3 text-center text-white">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">Next</div>
          <div className="mt-1 text-xl font-semibold">{Array.from(nextByCourt.values()).length}</div>
        </Card>
        <Card className="border-white/10 bg-slate-950/85 p-3 text-center text-white">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">Done</div>
          <div className="mt-1 text-xl font-semibold">{matchScores.size}</div>
        </Card>
      </div>

      {adSlot("courts top")}

      {/* Court blocks: stacked on mobile, side-by-side on landscape/desktop, max-width centered */}
      <div className="mx-auto w-full max-w-5xl grid gap-4 md:grid-cols-2 overflow-hidden">
        {Array.from({ length: courts }, (_, index) => index + 1).map((court) => (
          <CourtBlock
            key={court}
            court={court}
            live={currentByCourt.get(court)}
            next={nextByCourt.get(court)}
            courtMatches={courtMatchesMap.get(court) || []}
            allMatches={matches}
            matchScores={matchScores}
            pendingScores={pendingScores}
            updatePendingScore={updatePendingScore}
            saveScore={saveScore}
          />
        ))}
      </div>

      {adSlot("courts bottom")}
    </div>
  );
};

const WrapScreen = ({
  players,
  matches,
  matchScores,
  gameCode,
  onShare,
}: {
  players: string[];
  matches: Match[];
  matchScores: Map<string, { team1: number; team2: number }>;
  gameCode: string;
  onShare: () => void;
}) => {
  const standings = useMemo(() => buildStandings(players, matches, matchScores), [players, matches, matchScores]);
  const completedMatches = useMemo(() => matches.filter((match) => matchScores.has(match.id)).slice().reverse(), [matches, matchScores]);
  const totalPoints = useMemo(() => Array.from(matchScores.values()).reduce((sum, score) => sum + score.team1 + score.team2, 0), [matchScores]);

  const leader = standings[0];
  const hottestMatch = completedMatches[0];

  const handleCopyRecap = useCallback(async () => {
    if (standings.length === 0) {
      toast.error("Finish a match first so there's something to recap");
      return;
    }

    const topThree = standings.slice(0, 3)
      .map((entry, index) => `${index + 1}. ${entry.player} (${entry.wins}-${entry.losses}, ${Math.round(entry.winRate * 100)}% WR, ${entry.differential >= 0 ? "+" : ""}${entry.differential} diff)`)
      .join("\n");

    const summary = [
      `PickleMatch wrap${gameCode ? ` · ${gameCode}` : ""}`,
      `Completed matches: ${matchScores.size}`,
      `Players: ${players.length}`,
      `Points recorded: ${totalPoints}`,
      "",
      "Leaderboard:",
      topThree,
    ].join("\n");

    await navigator.clipboard.writeText(summary);
    toast.success("Wrap summary copied");
  }, [gameCode, matchScores.size, players.length, standings, totalPoints]);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-cyan-950/10 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">Winner</div>
              <div className="mt-1 flex items-center gap-2">
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{leader ? leader.player : "Finish a match to crown the board"}</h2>
                {leader ? <Crown className="h-5 w-5 text-lime-400" /> : null}
              </div>
              {leader ? (
                <div className="mt-2 text-sm text-white/60">{leader.wins}-{leader.losses} · {Math.round(leader.winRate * 100)}% WR · {leader.differential >= 0 ? "+" : ""}{leader.differential} diff</div>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button onClick={onShare} className="h-10 rounded-full bg-violet-600 px-4 text-white hover:bg-violet-500">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button onClick={() => void handleCopyRecap()} variant="outline" className="h-10 rounded-full border-white/15 bg-white/5 px-4 text-white hover:bg-white/10 hover:text-white">
                <Copy className="mr-2 h-4 w-4" />
                Recap
              </Button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-[1rem] bg-white/5 px-3 py-3 text-center border border-white/10">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">Completed</div>
              <div className="mt-1 text-xl font-semibold">{matchScores.size}</div>
            </div>
            <div className="rounded-[1rem] bg-white/5 px-3 py-3 text-center border border-white/10">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">Players</div>
              <div className="mt-1 text-xl font-semibold">{players.length}</div>
            </div>
            <div className="rounded-[1rem] bg-white/5 px-3 py-3 text-center border border-white/10">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">Points</div>
              <div className="mt-1 text-xl font-semibold">{totalPoints}</div>
            </div>
            <div className="rounded-[1rem] bg-slate-950 px-3 py-3 text-center">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">Latest</div>
              <div className="mt-1 text-base font-semibold">{hottestMatch ? `Court ${hottestMatch.court}` : "-"}</div>
            </div>
          </div>
        </Card>

        <Card className="border-white/10 bg-slate-950/85 p-4 text-white shadow-xl shadow-cyan-950/10">
          <div className="flex items-center gap-2 text-lime-300">
            <TrendingUp className="h-4 w-4" />
            <h3 className="font-semibold">Night pulse</h3>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[1rem] border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">Leader</div>
              <div className="mt-1 text-sm font-semibold">{leader ? leader.player : "No winner yet"}</div>
            </div>
            <div className="rounded-[1rem] border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">Recent</div>
              <div className="mt-1 text-sm text-white/85">{hottestMatch ? `${getTeamLabel(hottestMatch.team1)} vs ${getTeamLabel(hottestMatch.team2)}` : "No completed match yet."}</div>
            </div>
            <div className="rounded-[1rem] border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">Room</div>
              <div className="mt-1 text-sm text-white/85">
                {matchScores.size === 0
                  ? "Not started yet."
                  : matchScores.size < 4
                    ? "Still loose. One run can flip it."
                    : "Enough results in to feel like a real night."}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {adSlot("wrap mid")}

      <div className="grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-cyan-950/10 text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">Leaderboard</div>
              <h3 className="mt-1 text-xl font-semibold">Standings</h3>
            </div>
            <Badge className="border-0 bg-lime-400 text-slate-950">{standings.length} ranked</Badge>
          </div>

          {standings.length > 0 ? (
            <div className="mt-4 space-y-2.5">
              {standings.map((entry, index) => (
                <div key={entry.player} className={`rounded-[1.2rem] border p-3 ${index === 0 ? "border-lime-400/30 bg-lime-400/10" : index < 3 ? "border-violet-400/20 bg-violet-400/10" : "border-white/10 bg-white/5"}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${index === 0 ? "bg-lime-400 text-slate-950" : "bg-white/10 text-white"}`}>{index + 1}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-base font-semibold">{entry.player}</div>
                          {index === 0 ? <Crown className="h-4 w-4 text-lime-400" /> : null}
                          {index === 1 ? <Medal className="h-4 w-4 text-violet-400" /> : null}
                          {index === 2 ? <Trophy className="h-4 w-4 text-amber-400" /> : null}
                        </div>
                        <div className="text-xs text-white/55">{entry.matchesPlayed} match{entry.matchesPlayed === 1 ? "" : "es"}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:min-w-[252px]">
                      <div className="rounded-[0.9rem] bg-white/5 px-3 py-2 text-center border border-white/10">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">WR</div>
                        <div className="mt-1 text-base font-semibold">{Math.round(entry.winRate * 100)}%</div>
                      </div>
                      <div className="rounded-[0.9rem] bg-white/5 px-3 py-2 text-center border border-white/10">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">W-L</div>
                        <div className="mt-1 text-base font-semibold">{entry.wins}-{entry.losses}</div>
                      </div>
                      <div className="rounded-[0.9rem] bg-white/5 px-3 py-2 text-center border border-white/10">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">Diff</div>
                        <div className={`mt-1 text-base font-semibold ${entry.differential >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{entry.differential >= 0 ? "+" : ""}{entry.differential}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[1.2rem] bg-white/5 border border-white/10 px-5 py-10 text-center text-sm text-white/55">Finish a few matches to generate standings.</div>
          )}
        </Card>

        <Card className="border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-cyan-950/10 text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">History</div>
              <h3 className="mt-1 text-xl font-semibold">Completed matches</h3>
            </div>
            <Badge className="border-0 bg-white/10 text-white">{completedMatches.length}</Badge>
          </div>

          {completedMatches.length > 0 ? (
            <div className="mt-4 space-y-2.5">
              {completedMatches.slice(0, 6).map((match) => {
                const score = matchScores.get(match.id);
                if (!score) return null;
                const team1Won = score.team1 > score.team2;
                const team2Won = score.team2 > score.team1;
                return (
                  <div key={match.id} className="rounded-[1.2rem] border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">Court {match.court} · {getMatchLabel(matches, match)}</div>
                        <div className="mt-1 text-xs text-white/40">{match.clockStartTime || `${match.startTime} min slot`}</div>
                      </div>
                      <Badge className="border-0 bg-violet-500/20 text-violet-300">Final</Badge>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className={`flex items-center justify-between rounded-[1rem] px-3 py-2.5 ${team1Won ? "bg-emerald-500/15 border border-emerald-400/25" : "bg-white/5 border border-white/10"}`}>
                        <div className="text-sm font-medium">{getTeamLabel(match.team1)}</div>
                        <div className={`text-xl font-semibold ${team1Won ? "text-emerald-400" : "text-white/70"}`}>{score.team1}</div>
                      </div>
                      <div className={`flex items-center justify-between rounded-[1rem] px-3 py-2.5 ${team2Won ? "bg-emerald-500/15 border border-emerald-400/25" : "bg-white/5 border border-white/10"}`}>
                        <div className="text-sm font-medium">{getTeamLabel(match.team2)}</div>
                        <div className={`text-xl font-semibold ${team2Won ? "text-emerald-400" : "text-white/70"}`}>{score.team2}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-[1.2rem] bg-white/5 border border-white/10 px-5 py-10 text-center text-sm text-white/55">Completed matches will collect here once the night gets moving.</div>
          )}
        </Card>
      </div>

      {adSlot("wrap footer")}
    </div>
  );
};

const Index = () => {
  const [activeStep, setActiveStep] = useState<MainStep>("start");
  const [players, setPlayers] = useState<string[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameCode, setGameCode] = useState("");
  const [matchScores, setMatchScores] = useState<Map<string, { team1: number; team2: number }>>(new Map());
  const [userId, setUserId] = useState<string | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);
  const [isSetupDraftOpen, setIsSetupDraftOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const restoreRef = useRef(false);
  const subscriptionRef = useRef<any>(null);

  const { playerName, isPlayerView, claimIdentity, releaseIdentity } = usePlayerIdentity(gameId);
  const playerMatches = usePlayerMatches(matches, playerName, matchScores);
  usePlayerNotifications(matches, playerName, gameId, matchScores);

  useEffect(() => {
    if (!isPlayerView) return;
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isPlayerView]);

  const syncMatchScoresFromMatches = useCallback((loadedMatches: Match[]) => {
    const next = new Map<string, { team1: number; team2: number }>();
    loadedMatches.forEach((match) => {
      if (match.score) next.set(match.id, match.score);
    });
    setMatchScores(next);
  }, []);

  const determineStep = useCallback((loadedConfig: GameConfig | null, loadedPlayers: string[], loadedMatches: Match[], loadedScores?: Map<string, { team1: number; team2: number }>) => {
    if (!loadedConfig) return "setup" as MainStep;
    if (loadedPlayers.length === 0) return "players" as MainStep;
    if (loadedMatches.length === 0) return "players" as MainStep;
    if ((loadedScores?.size || 0) > 0) return "courts" as MainStep;
    return "courts" as MainStep;
  }, []);

  const saveSessionStorage = useCallback((nextGameId: string, nextGameCode: string) => {
    safeStorage.setItem(STORAGE_GAME_ID, nextGameId);
    safeStorage.setItem(STORAGE_GAME_CODE, nextGameCode);
  }, []);

  const clearSessionStorage = useCallback(() => {
    safeStorage.removeItem(STORAGE_GAME_ID);
    safeStorage.removeItem(STORAGE_GAME_CODE);
  }, []);

  const minimumPlayersRequired = useMemo(() => {
    if (!gameConfig?.courtConfigs?.length) return 2;
    return Math.min(...gameConfig.courtConfigs.map((config) => (config.type === "singles" ? 2 : 4)));
  }, [gameConfig]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) throw error;
          setUserId(data.user?.id || null);
        } else {
          setUserId(session.user.id);
        }
      } catch (error) {
        debugLogger.log("error", "auth init failed", error);
        toast.error("Failed to initialize authentication");
        setIsRestoringSession(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId || restoreRef.current) return;

    const restore = async () => {
      restoreRef.current = true;
      const savedGameId = safeStorage.getItem(STORAGE_GAME_ID);
      const savedGameCode = safeStorage.getItem(STORAGE_GAME_CODE);

      if (savedGameId && savedGameCode) {
        try {
          const { data, error } = await supabase.from("games").select("*").eq("id", savedGameId).single();
          if (!error && data) {
            const loadedMatches = sanitizeMatches((data.matches as unknown as Match[]) || []);
            const loadedConfig = data.game_config as unknown as GameConfig;
            const scores = new Map<string, { team1: number; team2: number }>();
            loadedMatches.forEach((match) => {
              if (match.score) scores.set(match.id, match.score);
            });
            setGameId(data.id);
            setGameCode(data.game_code);
            setIsSetupDraftOpen(false);
            setPlayers(data.players || []);
            setGameConfig(loadedConfig);
            setMatches(loadedMatches);
            setMatchScores(scores);
            setActiveStep(determineStep(loadedConfig, data.players || [], loadedMatches, scores));
          } else {
            clearSessionStorage();
          }
        } catch (error) {
          debugLogger.log("error", "restore failed", error);
          clearSessionStorage();
        }
      }

      setIsRestoringSession(false);
      restoreRef.current = false;
    };

    restore();
  }, [clearSessionStorage, determineStep, userId]);

  useEffect(() => {
    if (!userId) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("join");
    if (!code) return;
    window.history.replaceState({}, "", window.location.pathname);
    setJoinCode(code.toUpperCase());
    void (async () => {
      await joinExistingGame(code.toUpperCase());
    })();
  }, [userId]);

  useEffect(() => {
    if (!gameId) return;

    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    const channel = supabase
      .channel(`picklematch-updates-${gameId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` }, (payload) => {
        if (payload.eventType !== "UPDATE") return;
        const updated = payload.new;
        const loadedMatches = sanitizeMatches((updated.matches as unknown as Match[]) || []);
        setPlayers(updated.players || []);
        setMatches(loadedMatches);
        setGameConfig(updated.game_config as unknown as GameConfig);
        syncMatchScoresFromMatches(loadedMatches);
      })
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [gameId, syncMatchScoresFromMatches]);

  const createNewGame = useCallback(() => {
    clearSessionStorage();
    setPlayers([]);
    setMatches([]);
    setGameConfig(null);
    setGameId(null);
    setGameCode("");
    setMatchScores(new Map());
    setJoinCode("");
    setIsSetupDraftOpen(true);
    setActiveStep("setup");
  }, [clearSessionStorage]);

  const joinExistingGame = useCallback(async (code: string) => {
    if (!userId) {
      toast.error("Please wait for authentication");
      return;
    }

    try {
      setIsJoining(true);
      const { data, error } = await supabase.from("games").select("*").eq("game_code", code).single();
      if (error || !data) {
        toast.error("Session not found. Check the code and try again.");
        return;
      }

      const loadedMatches = sanitizeMatches((data.matches as unknown as Match[]) || []);
      setGameId(data.id);
      setGameCode(data.game_code);
      setIsSetupDraftOpen(false);
      setPlayers(data.players || []);
      setGameConfig(data.game_config as unknown as GameConfig);
      setMatches(loadedMatches);
      syncMatchScoresFromMatches(loadedMatches);
      saveSessionStorage(data.id, data.game_code);
      setActiveStep(determineStep(data.game_config as unknown as GameConfig, data.players || [], loadedMatches));
      toast.success(`Joined session ${data.game_code}`);
    } catch (error) {
      debugLogger.log("error", "join failed", error);
      toast.error("Failed to join session");
    } finally {
      setIsJoining(false);
    }
  }, [determineStep, saveSessionStorage, syncMatchScoresFromMatches, userId]);

  const handleSetupComplete = useCallback(async (config: GameConfig) => {
    const roundRobinConfig = normalizeRoundRobinConfig(config);
    setGameConfig(roundRobinConfig);

    try {
      let activeUserId = userId;
      if (!activeUserId) {
        const { data: { session } } = await supabase.auth.getSession();
        activeUserId = session?.user?.id || null;
      }

      if (!activeUserId) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        activeUserId = data.user?.id || null;
      }

      if (!activeUserId) {
        toast.error("Please wait for authentication");
        return;
      }

      setUserId(activeUserId);

      if (gameId) {
        const { data, error } = await supabase
          .from("games")
          .update({ game_config: roundRobinConfig as any })
          .eq("id", gameId)
          .select("id")
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error("setup update returned no game row");
      } else {
        const { data: codeData, error: codeError } = await supabase.rpc("generate_game_code");
        if (codeError) throw codeError;

        const newCode = codeData as string;
        const { data, error } = await supabase
          .from("games")
          .insert([{ game_code: newCode, game_config: roundRobinConfig as any, players: [], matches: [], creator_id: activeUserId }])
          .select()
          .single();
        if (error) throw error;
        setGameId(data.id);
        setGameCode(newCode);
        setIsSetupDraftOpen(false);
        saveSessionStorage(data.id, newCode);
        toast.success(`Session created · ${newCode}`);
      }

      setActiveStep("players");
    } catch (error) {
      debugLogger.log("error", "setup save failed", {
        error,
        gameId,
        userId,
        config: roundRobinConfig,
      });
      toast.error("Failed to save setup");
    }
  }, [gameId, saveSessionStorage, userId]);

  const handlePlayersChange = useCallback(async (
    playerList: string[],
    teammatePairs?: { player1: string; player2: string }[]
  ) => {
    setPlayers(playerList);
    if (!gameConfig || !gameId) return;

    const updatedConfig = { ...gameConfig, teammatePairs };
    setGameConfig(updatedConfig);

    try {
      const { error } = await supabase.from("games").update({ players: playerList, game_config: updatedConfig as any }).eq("id", gameId);
      if (error) throw error;
    } catch (error) {
      debugLogger.log("error", "player sync failed", error);
    }
  }, [gameConfig, gameId]);

  const handlePlayersUpdate = useCallback(async (
    playerList: string[],
    teammatePairs?: { player1: string; player2: string }[]
  ): Promise<boolean> => {
    if (!gameConfig) return false;

    const updatedConfig = { ...gameConfig, teammatePairs, schedulingType: "round-robin" as const };
    setPlayers(playerList);
    setGameConfig(updatedConfig);

    const preservedMatches: Match[] = [];
    const courts = Array.from(new Set(matches.map((match) => match.court)));
    for (const court of courts) {
      const courtMatches = matches.filter((match) => match.court === court);
      preservedMatches.push(...courtMatches.filter((match) => matchScores.has(match.id)));
      const currentMatchIndex = courtMatches.findIndex((match) => !matchScores.has(match.id));
      if (currentMatchIndex >= 0) preservedMatches.push(courtMatches[currentMatchIndex]);
    }

    const regenerateFromTime = preservedMatches.length > 0 ? Math.max(...preservedMatches.map((match) => match.endTime)) : 0;
    const newSchedule = generateSchedule(
      playerList,
      updatedConfig.gameDuration,
      updatedConfig.totalTime,
      updatedConfig.courts,
      undefined,
      teammatePairs,
      updatedConfig.courtConfigs
    );
    const futureMatches = newSchedule.filter((match) => match.startTime >= regenerateFromTime);
    const finalSchedule = sanitizeMatches([...preservedMatches, ...futureMatches]);

    setMatches(finalSchedule);

    try {
      if (gameId) {
        const { error } = await supabase
          .from("games")
          .update({ players: playerList, matches: finalSchedule as any, game_config: updatedConfig as any })
          .eq("id", gameId);
        if (error) throw error;
      }
      setActiveStep("courts");
      toast.success(preservedMatches.length > 0 ? `Roster updated. ${preservedMatches.length} current/completed match(es) preserved.` : "Schedule generated.");
      return true;
    } catch (error) {
      debugLogger.log("error", "player update failed", error);
      toast.error("Failed to update players");
      return false;
    }
  }, [gameConfig, gameId, matchScores, matches]);

  const handleScheduleUpdate = useCallback(async (updatedMatches: Match[], updatedPlayers: string[]) => {
    const sanitized = sanitizeMatches(updatedMatches);
    setMatches(sanitized);
    setPlayers(updatedPlayers);

    try {
      if (gameId) {
        const { error } = await supabase.from("games").update({ matches: sanitized as any, players: updatedPlayers }).eq("id", gameId);
        if (error) throw error;
      }
    } catch (error) {
      debugLogger.log("error", "schedule update failed", error);
      toast.error("Failed to update session");
    }
  }, [gameId]);

  const handleSkipMatch = useCallback(async (matchId: string) => {
    if (!gameId || !playerName) return;
    try {
      await setSkipNextMatch(gameId, playerName, true);
      toast.success("You're marked to skip your next match");
      window.setTimeout(async () => {
        await setSkipNextMatch(gameId, playerName, false);
      }, 5 * 60 * 1000);
    } catch (error) {
      debugLogger.log("error", `skip failed for ${matchId}`, error);
      toast.error("Couldn't update skip status");
    }
  }, [gameId, playerName]);

  const handleShare = useCallback(async () => {
    if (!gameCode) return;
    const url = `${window.location.origin}${window.location.pathname}?join=${gameCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join my PickleMatch session", text: `Join with code ${gameCode}`, url });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(url);
    toast.success("Join link copied");
  }, [gameCode]);

  const handleCopyCode = useCallback(async () => {
    if (!gameCode) return;
    await navigator.clipboard.writeText(gameCode);
    toast.success("Code copied");
  }, [gameCode]);

  const renderMain = () => {
    if (activeStep === "start") {
      return (
        <StartScreen
          joinCode={joinCode}
          onJoinCodeChange={setJoinCode}
          onJoin={() => void joinExistingGame(joinCode.trim())}
          onCreate={createNewGame}
          hasResume={Boolean(gameId && gameCode)}
          onResume={() => setActiveStep(determineStep(gameConfig, players, matches, matchScores))}
          loading={isJoining}
        />
      );
    }

    if (activeStep === "setup") {
      return <SetupScreen gameCode={gameCode} onComplete={handleSetupComplete} onNewSession={gameCode ? createNewGame : undefined} hasExistingMatches={matches.length > 0} />;
    }

    if (!gameConfig || !gameCode) {
      return (
        <Card className="border-white/10 bg-slate-900/70 p-8 text-center text-white/60">
          Create or restore a session to continue.
        </Card>
      );
    }

    if (activeStep === "players") {
      return (
        <PlayersScreen
          gameCode={gameCode}
          players={players}
          matches={matches}
          matchScores={matchScores}
          teammatePairs={gameConfig.teammatePairs}
          minimumPlayersRequired={minimumPlayersRequired}
          onPlayersChange={handlePlayersChange}
          onPlayersUpdate={handlePlayersUpdate}
          onNavigateToCourts={() => setActiveStep("courts")}
        />
      );
    }

    if (activeStep === "courts") {
      return isPlayerView && playerName ? (
        <Card className="border-white/10 bg-slate-900/80 p-3 sm:p-4 text-white">
          <MyMatchesView
            playerName={playerName}
            matchGroups={playerMatches}
            matchScores={matchScores}
            currentTime={currentTime}
            allMatches={matches}
            onReleaseIdentity={() => {
              releaseIdentity();
              toast.success("Back in host view");
            }}
            onSkipMatch={handleSkipMatch}
          />
        </Card>
      ) : (
        <CourtsScreen
          matches={matches}
          matchScores={matchScores}
          players={players}
          courts={gameConfig.courts}
          onScheduleUpdate={handleScheduleUpdate}
          onMatchScoresUpdate={setMatchScores}
        />
      );
    }

    return <WrapScreen players={players} matches={matches} matchScores={matchScores} gameCode={gameCode} onShare={handleShare} />;
  };

  if (isRestoringSession) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.24),transparent_32%),linear-gradient(180deg,#08111f_0%,#0b1220_100%)] px-4 py-10 text-white">
        <div className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-lime-400 text-slate-950">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
            <p className="mt-4 text-sm text-white/72">Restoring session…</p>
          </div>
        </div>
      </div>
    );
  }

  const showSessionNav = activeStep !== "start" && (gameCode || gameConfig || isSetupDraftOpen);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.18),transparent_28%),linear-gradient(180deg,#08111f_0%,#0b1220_100%)] px-4 py-4 text-slate-900 sm:px-6 sm:py-5 lg:px-8">
      <div className={`mx-auto max-w-7xl space-y-3 ${showSessionNav ? "pb-28 sm:pb-32" : "pb-8"}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-white">
            <div className="text-[10px] uppercase tracking-[0.24em] text-white/45">Casual club-night utility</div>
            <div className="text-base font-semibold sm:text-lg">PickleMatch</div>
          </div>

          {gameCode ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white">
                Code <span className="ml-2 font-mono font-semibold text-lime-300">{gameCode}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleCopyCode} className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </div>
          ) : null}
        </div>

        {showSessionNav ? (
          <SessionHeader
            activeStep={activeStep}
            gameCode={gameCode}
            players={players}
            matchScores={matchScores}
            matches={matches}
            isPlayerView={isPlayerView}
            playerName={playerName}
            onShowPlayerSelector={() => setShowPlayerSelector(true)}
            onReleaseIdentity={() => releaseIdentity()}
            onShare={handleShare}
          />
        ) : null}

        {renderMain()}

        {showPlayerSelector ? (
          <PlayerIdentitySelector
            players={players}
            onSelect={async (name) => {
              await claimIdentity(name);
              setShowPlayerSelector(false);
              toast.success(`Viewing as ${name}`);
            }}
            onCancel={() => setShowPlayerSelector(false)}
          />
        ) : null}
      </div>

      {showSessionNav ? (
        <SessionBottomNav
          activeStep={activeStep}
          onSelect={setActiveStep}
          canOpenPlayers={Boolean(gameCode || gameConfig || isSetupDraftOpen)}
          canOpenCourts={Boolean(gameConfig && gameCode && matches.length > 0)}
          canOpenWrap={Boolean(gameConfig && gameCode && matches.length > 0)}
        />
      ) : null}
    </div>
  );
};

export default Index;
