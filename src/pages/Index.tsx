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
import { safeStorage } from "@/lib/safe-storage";
import { debugLogger } from "@/lib/debug-logger";
import { validateMatchScore, validatePlayerName } from "@/lib/validation";
import logo from "@/assets/logo.png";

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

const StepRail = ({ activeStep, onSelect, disabled }: { activeStep: MainStep; onSelect: (step: MainStep) => void; disabled?: boolean }) => (
  <div className="grid gap-2 rounded-[2rem] border border-white/10 bg-slate-950/45 p-2 md:grid-cols-5">
    {STEP_ORDER.map((step, index) => {
      const isActive = step === activeStep;
      return (
        <button
          key={step}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(step)}
          className={`flex items-center gap-3 rounded-[1.25rem] px-4 py-3 text-left transition ${
            isActive ? "bg-lime-400 text-slate-950" : "bg-white/5 text-white/72 hover:bg-white/10"
          } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${isActive ? "bg-slate-950/10" : "bg-white/10"}`}>
            {index + 1}
          </span>
          <div>
            <div className="text-xs uppercase tracking-[0.18em] opacity-70">Stage</div>
            <div className="text-sm font-semibold">{STEP_LABELS[step]}</div>
          </div>
        </button>
      );
    })}
  </div>
);

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
  const waitingCount = useMemo(() => {
    const livePlayers = new Set(
      matches.filter((match) => !matchScores.has(match.id)).slice(0, 2).flatMap((match) => [...match.team1, ...match.team2])
    );
    return players.filter((player) => !livePlayers.has(player)).length;
  }, [matchScores, matches, players]);

  return (
    <div className="flex flex-col gap-3 rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-4 text-white shadow-xl shadow-cyan-950/10 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="border-0 bg-white/12 text-white">{STEP_LABELS[activeStep]}</Badge>
        {gameCode ? <Badge className="border-0 bg-lime-400 text-slate-950">Code {gameCode}</Badge> : null}
        <Badge className="border-0 bg-white/10 text-white/85">{players.length} players</Badge>
        <Badge className="border-0 bg-white/10 text-white/85">{matchScores.size} completed</Badge>
        <Badge className="border-0 bg-white/10 text-white/85">{waitingCount} waiting</Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={onShare} className="h-10 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
          <Share2 className="mr-2 h-4 w-4" />
          Share join link
        </Button>
        {!isPlayerView ? (
          <Button onClick={onShowPlayerSelector} className="h-10 bg-lime-400 text-slate-950 hover:bg-lime-300">
            <UserCircle2 className="mr-2 h-4 w-4" />
            I’m playing
          </Button>
        ) : (
          <Button variant="outline" onClick={onReleaseIdentity} className="h-10 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
            <Users className="mr-2 h-4 w-4" />
            Host view{playerName ? ` · ${playerName}` : ""}
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
  <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
    <Card className="border-white/10 bg-white/95 p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Setup essentials</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">Court count, format, game target, session length.</div>
        </div>
        {gameCode ? <Badge className="border-0 bg-emerald-100 text-emerald-800">Live code {gameCode}</Badge> : null}
      </div>

      <GameSetup
        onComplete={onComplete}
        gameCode={gameCode}
        onNewSession={onNewSession}
        hasExistingMatches={hasExistingMatches}
        quickCourtMode
      />
    </Card>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
      <Card className="border-white/10 bg-slate-950/70 p-5 text-white">
        <div className="text-xs uppercase tracking-[0.2em] text-white/55">Locked product rules</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold">Round robin only</div>
            <div className="mt-1 text-xs text-white/65">No tournament mode branch.</div>
          </div>
          <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold">1 or 2 courts</div>
            <div className="mt-1 text-xs text-white/65">Built for club nights, not venue sprawl.</div>
          </div>
          <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold">Continue fast</div>
            <div className="mt-1 text-xs text-white/65">Save here, roster next.</div>
          </div>
        </div>
      </Card>

      <Card className="border-white/10 bg-white/95 p-5">
        <div className="flex items-center gap-2 text-emerald-700">
          <QrCode className="h-5 w-5" />
          <h3 className="text-lg font-semibold text-slate-900">Shareable immediately</h3>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Once setup is saved, the same session can be opened on phones and iPad with the code or join link.
        </p>
      </Card>
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
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="border-white/10 bg-white/95 p-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Code</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{gameCode || "Draft"}</div>
        </Card>
        <Card className="border-white/10 bg-white/95 p-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Roster</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{roster.length}</div>
        </Card>
        <Card className="border-white/10 bg-white/95 p-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Locked pairs</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{pairings.length}</div>
        </Card>
        <Card className="border-white/10 bg-slate-950/80 p-4 text-white">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">Ready</div>
          <div className="mt-2 text-sm font-semibold">{ready ? "Can start now" : `${minimumPlayersRequired - roster.length} more needed`}</div>
        </Card>
      </div>

      {selectedForPairing ? (
        <Card className="border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Check className="h-4 w-4" />
            Pairing mode on for {selectedForPairing}
          </div>
          <p className="mt-1 text-sm text-emerald-800">Tap another player card to lock them together, or tap {selectedForPairing} again to cancel.</p>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <Card className="border-white/10 bg-white/95 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Quick add</div>
            <div className="mt-3 flex gap-2">
              <Input
                value={currentName}
                onChange={(event) => setCurrentName(event.target.value)}
                placeholder="Add one player"
                maxLength={50}
                className="h-12 rounded-2xl border-slate-200"
                onKeyDown={(event) => {
                  if (event.key === "Enter") addOnePlayer();
                }}
              />
              <Button onClick={addOnePlayer} disabled={!currentName.trim()} className="h-12 rounded-2xl bg-emerald-500 px-5 text-white hover:bg-emerald-400">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          <Card className="border-white/10 bg-white/95 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Batch add</div>
            <Textarea
              value={bulkNames}
              onChange={(event) => setBulkNames(event.target.value)}
              placeholder="Maya, Theo, Jules, Iris"
              className="mt-3 min-h-[150px] rounded-[1.25rem] border-slate-200 bg-slate-50"
            />
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
              <span>Comma or line-break separated.</span>
              <Button onClick={addBatchPlayers} disabled={bulkParsed.length === 0} variant="outline" className="rounded-full">
                Add batch
              </Button>
            </div>
          </Card>

          <Card className="border-white/10 bg-slate-950/80 p-5 text-white">
            <div className="text-xs uppercase tracking-[0.2em] text-white/55">Session action</div>
            <div className="mt-4 space-y-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between text-sm text-white/72">
                <span>Minimum required</span>
                <span className="font-semibold text-white">{minimumPlayersRequired}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-white/72">
                <span>Roster now</span>
                <span className="font-semibold text-white">{roster.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-white/72">
                <span>Existing schedule</span>
                <span className="font-semibold text-white">{matches.length > 0 ? "Will refresh" : "Will generate"}</span>
              </div>
              <Button onClick={() => void startOrUpdateSession()} disabled={!ready || isSaving} className="h-12 rounded-2xl bg-lime-400 text-base font-semibold text-slate-950 hover:bg-lime-300">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {matches.length > 0 ? "Update session" : "Start session"}
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {roster.map((player) => {
              const partner = getPartner(player);
              const selected = selectedForPairing === player;

              return (
                <Card
                  key={player}
                  className={`rounded-[1.5rem] border p-4 shadow-lg shadow-slate-950/5 transition ${
                    selected ? "border-emerald-400 bg-emerald-50" : partner ? "border-sky-200 bg-sky-50" : "border-white/10 bg-white/95"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-slate-900">{player}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-700">In roster</Badge>
                        {partner ? <Badge className="rounded-full border-0 bg-sky-600 text-white">Paired with {partner}</Badge> : null}
                        {!partner && lockedPlayers.size === 0 ? <Badge variant="secondary" className="rounded-full bg-lime-100 text-lime-800">Open</Badge> : null}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removePlayer(player)} className="h-8 w-8 rounded-full p-0 text-slate-500 hover:bg-red-50 hover:text-red-600">
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button type="button" variant="outline" onClick={() => togglePairing(player)} className="flex-1 rounded-full">
                      {partner ? <Unlink className="mr-2 h-4 w-4" /> : <Link2 className="mr-2 h-4 w-4" />}
                      {partner ? "Unpair" : selected ? "Cancel pair" : "Pair"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => removePlayer(player)} className="rounded-full">
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {roster.length === 0 ? (
            <Card className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white/80 px-6 py-12 text-center">
              <Users className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 text-sm font-medium text-slate-700">No players yet. Add a few names and start the night.</p>
            </Card>
          ) : null}
        </div>
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
  const [selectedCourt, setSelectedCourt] = useState(1);
  const [pendingScores, setPendingScores] = useState<Map<string, ScoreDraft>>(new Map());

  useEffect(() => {
    if (selectedCourt > courts) setSelectedCourt(1);
  }, [courts, selectedCourt]);

  const unscoredMatches = useMemo(() => matches.filter((match) => !matchScores.has(match.id)), [matches, matchScores]);

  const queueByCourt = useMemo(() => {
    const next = new Map<number, Match[]>();
    for (let court = 1; court <= courts; court += 1) {
      next.set(court, unscoredMatches.filter((match) => match.court === court));
    }
    return next;
  }, [courts, unscoredMatches]);

  const currentByCourt = useMemo(() => {
    const next = new Map<number, Match>();
    for (let court = 1; court <= courts; court += 1) {
      const queue = queueByCourt.get(court) || [];
      if (queue[0]) next.set(court, queue[0]);
    }
    return next;
  }, [courts, queueByCourt]);

  const nextByCourt = useMemo(() => {
    const next = new Map<number, Match>();
    for (let court = 1; court <= courts; court += 1) {
      const queue = queueByCourt.get(court) || [];
      if (queue[1]) next.set(court, queue[1]);
    }
    return next;
  }, [courts, queueByCourt]);

  const waitingPlayers = useMemo(() => {
    const occupied = new Set<string>();
    currentByCourt.forEach((match) => [...match.team1, ...match.team2].forEach((player) => occupied.add(player)));
    nextByCourt.forEach((match) => [...match.team1, ...match.team2].forEach((player) => occupied.add(player)));
    return players.filter((player) => !occupied.has(player));
  }, [currentByCourt, nextByCourt, players]);

  const completedMatches = useMemo(() => matches.filter((match) => matchScores.has(match.id)).slice().reverse(), [matches, matchScores]);

  const featuredCourt = selectedCourt;
  const featuredCurrent = currentByCourt.get(featuredCourt);
  const featuredNext = nextByCourt.get(featuredCourt);
  const featuredQueue = queueByCourt.get(featuredCourt) || [];

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
    <div className="space-y-4">
      <Card className="overflow-hidden border-white/10 bg-[linear-gradient(135deg,rgba(17,24,39,0.98),rgba(13,94,88,0.92),rgba(9,14,27,0.98))] p-5 text-white sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-0 bg-lime-400 text-slate-950">Live session</Badge>
              <Badge className="border-0 bg-white/10 text-white">{courts} {courts === 1 ? "court" : "courts"}</Badge>
              <Badge className="border-0 bg-white/10 text-white">{unscoredMatches.length} unplayed</Badge>
              <Badge className="border-0 bg-white/10 text-white">{waitingPlayers.length} bench</Badge>
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Courts stay live, queue stays obvious, scores stay one tap away.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/72">
              Mobile centers one featured court at a time for fast host taps. Larger screens open into a room board with both live courts visible at once.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 xl:min-w-[360px]">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4 text-center">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">Live now</div>
              <div className="mt-2 text-3xl font-semibold">{Array.from(currentByCourt.values()).length}</div>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4 text-center">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">On deck</div>
              <div className="mt-2 text-3xl font-semibold">{Array.from(nextByCourt.values()).length}</div>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4 text-center">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">Done</div>
              <div className="mt-2 text-3xl font-semibold">{matchScores.size}</div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 2xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-4">
          <Card className="border-white/10 bg-white/95 p-3 lg:hidden">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {Array.from({ length: courts }, (_, index) => index + 1).map((court) => {
                const live = currentByCourt.get(court);
                const next = nextByCourt.get(court);
                return (
                  <Button
                    key={court}
                    variant={featuredCourt === court ? "default" : "outline"}
                    onClick={() => setSelectedCourt(court)}
                    className={featuredCourt === court ? "rounded-full bg-emerald-500 text-white hover:bg-emerald-400" : "rounded-full"}
                  >
                    Court {court}
                    {live ? " · live" : next ? " · next" : " · idle"}
                  </Button>
                );
              })}
            </div>
          </Card>

          <div className="lg:hidden">
            <Card className="overflow-hidden border-white/10 bg-white/95 p-5 shadow-xl shadow-slate-950/5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Featured court</div>
                  <h3 className="mt-1 text-2xl font-semibold text-slate-900">Court {featuredCourt}</h3>
                </div>
                <Badge className="border-0 bg-slate-900 text-white">{featuredCurrent ? "Live now" : featuredNext ? "Ready next" : "Standby"}</Badge>
              </div>

              <div className="mt-4 space-y-4">
                <div className="rounded-[1.75rem] bg-[linear-gradient(135deg,#0f172a,#115e59,#0f172a)] p-4 text-white">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/60">
                    <Flame className="h-3.5 w-3.5" />
                    Current match
                  </div>
                  {featuredCurrent ? (
                    <>
                      <div className="mt-4 grid gap-3">
                        <div className="rounded-[1.25rem] bg-white/10 p-3">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">Side A</div>
                          <div className="mt-1 text-lg font-semibold">{getTeamLabel(featuredCurrent.team1)}</div>
                        </div>
                        <div className="rounded-[1.25rem] bg-white/10 p-3">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">Side B</div>
                          <div className="mt-1 text-lg font-semibold">{getTeamLabel(featuredCurrent.team2)}</div>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <Input
                          type="number"
                          min="0"
                          value={(pendingScores.get(featuredCurrent.id) || matchScores.get(featuredCurrent.id) || { team1: "", team2: "" }).team1}
                          onChange={(event) => updatePendingScore(featuredCurrent.id, "team1", event.target.value)}
                          className="h-14 rounded-[1.1rem] border-white/10 bg-white text-center text-2xl font-semibold text-slate-900"
                        />
                        <Input
                          type="number"
                          min="0"
                          value={(pendingScores.get(featuredCurrent.id) || matchScores.get(featuredCurrent.id) || { team1: "", team2: "" }).team2}
                          onChange={(event) => updatePendingScore(featuredCurrent.id, "team2", event.target.value)}
                          className="h-14 rounded-[1.1rem] border-white/10 bg-white text-center text-2xl font-semibold text-slate-900"
                        />
                      </div>
                      <Button onClick={() => saveScore(featuredCurrent)} className="mt-4 h-12 w-full rounded-full bg-lime-400 text-base font-semibold text-slate-950 hover:bg-lime-300">
                        Confirm score and pull next up
                      </Button>
                    </>
                  ) : (
                    <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/70">
                      No live match on this court yet.
                    </div>
                  )}
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Next up</div>
                  <div className="mt-2 text-base font-semibold text-slate-900">
                    {featuredNext ? `${getTeamLabel(featuredNext.team1)} vs ${getTeamLabel(featuredNext.team2)}` : "No queued follow-up yet."}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="hidden lg:grid lg:grid-cols-2 lg:gap-4">
            {Array.from({ length: courts }, (_, index) => index + 1).map((court) => {
              const live = currentByCourt.get(court);
              const next = nextByCourt.get(court);
              const score = live ? pendingScores.get(live.id) || matchScores.get(live.id) || { team1: "", team2: "" } : null;

              return (
                <Card key={court} className="overflow-hidden border-white/10 bg-white/95 p-5 shadow-xl shadow-slate-950/5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Live court</div>
                      <h3 className="mt-1 text-2xl font-semibold text-slate-900">Court {court}</h3>
                    </div>
                    <Badge className={`border-0 ${live ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-700"}`}>{live ? "Playing" : "Standby"}</Badge>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div className="rounded-[1.5rem] bg-[linear-gradient(135deg,#0f172a,#115e59,#0f172a)] p-4 text-white">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/60">
                        <Flame className="h-3.5 w-3.5" />
                        Current match
                      </div>
                      {live ? (
                        <>
                          <div className="mt-4 grid gap-3">
                            <div className="rounded-[1.25rem] bg-white/10 p-3">
                              <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">Side A</div>
                              <div className="mt-1 text-lg font-semibold">{getTeamLabel(live.team1)}</div>
                            </div>
                            <div className="rounded-[1.25rem] bg-white/10 p-3">
                              <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">Side B</div>
                              <div className="mt-1 text-lg font-semibold">{getTeamLabel(live.team2)}</div>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <Input
                              type="number"
                              min="0"
                              value={score?.team1 ?? ""}
                              onChange={(event) => updatePendingScore(live.id, "team1", event.target.value)}
                              className="h-14 rounded-[1.1rem] border-white/10 bg-white text-center text-2xl font-semibold text-slate-900"
                            />
                            <Input
                              type="number"
                              min="0"
                              value={score?.team2 ?? ""}
                              onChange={(event) => updatePendingScore(live.id, "team2", event.target.value)}
                              className="h-14 rounded-[1.1rem] border-white/10 bg-white text-center text-2xl font-semibold text-slate-900"
                            />
                          </div>

                          <Button onClick={() => saveScore(live)} className="mt-4 h-12 w-full rounded-full bg-lime-400 text-base font-semibold text-slate-950 hover:bg-lime-300">
                            Confirm score
                          </Button>
                        </>
                      ) : (
                        <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/70">
                          No live match on this court yet.
                        </div>
                      )}
                    </div>

                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Next up</div>
                      <div className="mt-2 text-base font-semibold text-slate-900">
                        {next ? `${getTeamLabel(next.team1)} vs ${getTeamLabel(next.team2)}` : "No queued follow-up yet."}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="border-white/10 bg-white/95 p-5 shadow-xl shadow-slate-950/5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Bench and ready line</div>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">Waiting players stay visible outside the queue</h3>
              </div>
              <Badge className="border-0 bg-slate-900 text-white">{waitingPlayers.length} on bench</Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {waitingPlayers.length > 0 ? waitingPlayers.map((player) => (
                <Badge key={player} variant="secondary" className="rounded-full bg-slate-100 px-3 py-2 text-slate-700">{player}</Badge>
              )) : <div className="rounded-[1.25rem] bg-slate-100 px-4 py-3 text-sm text-slate-600">Everyone is either live now or first up next.</div>}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-white/10 bg-slate-950/85 p-5 text-white shadow-xl shadow-cyan-950/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-white/45">Queue rail</div>
                <h3 className="mt-1 text-xl font-semibold">Court {featuredCourt} upcoming lane</h3>
              </div>
              <div className="flex gap-2">
                {Array.from({ length: courts }, (_, index) => index + 1).map((court) => (
                  <Button
                    key={court}
                    size="sm"
                    variant={featuredCourt === court ? "default" : "outline"}
                    onClick={() => setSelectedCourt(court)}
                    className={featuredCourt === court ? "rounded-full bg-lime-400 text-slate-950 hover:bg-lime-300" : "rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"}
                  >
                    {court}
                  </Button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {featuredQueue.slice(0, 5).map((match, index) => {
                const isCurrent = index === 0;
                const isNext = index === 1;
                return (
                  <div key={match.id} className={`rounded-[1.35rem] border p-4 ${isCurrent ? "border-emerald-300/20 bg-emerald-300/10" : isNext ? "border-amber-300/20 bg-amber-300/10" : "border-white/10 bg-white/5"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <Badge className={`border-0 ${isCurrent ? "bg-emerald-500 text-white" : isNext ? "bg-amber-500 text-white" : "bg-white/10 text-white"}`}>
                        {isCurrent ? "Current" : isNext ? "Next" : `Queue ${index + 1}`}
                      </Badge>
                      <div className="text-xs text-white/55">{getMatchLabel(matches, match)}</div>
                    </div>
                    <div className="mt-3 text-sm leading-6 text-white/90">{getTeamLabel(match.team1)} <span className="text-white/45">vs</span> {getTeamLabel(match.team2)}</div>
                  </div>
                );
              })}

              {featuredQueue.length === 0 ? (
                <div className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/65">
                  No upcoming matches on this court yet.
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="border-white/10 bg-white/95 p-5 shadow-xl shadow-slate-950/5">
            <div className="flex items-center gap-2 text-slate-900">
              <Clock3 className="h-4 w-4 text-violet-600" />
              <h3 className="font-semibold">Recent finishes</h3>
            </div>
            <div className="mt-4 space-y-3">
              {completedMatches.slice(0, 4).map((match) => {
                const score = pendingScores.get(match.id) || matchScores.get(match.id) || { team1: "", team2: "" };
                return (
                  <div key={match.id} className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Court {match.court} · finished</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{getTeamLabel(match.team1)} vs {getTeamLabel(match.team2)}</div>
                      </div>
                      <Badge className="border-0 bg-slate-900 text-white">{getMatchLabel(matches, match)}</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <Input
                        type="number"
                        min="0"
                        value={score.team1}
                        onChange={(event) => updatePendingScore(match.id, "team1", event.target.value)}
                        className="h-11 rounded-2xl text-center text-lg font-semibold"
                      />
                      <Input
                        type="number"
                        min="0"
                        value={score.team2}
                        onChange={(event) => updatePendingScore(match.id, "team2", event.target.value)}
                        className="h-11 rounded-2xl text-center text-lg font-semibold"
                      />
                    </div>
                    <Button onClick={() => saveScore(match)} variant="outline" className="mt-3 w-full rounded-full">Save edit</Button>
                  </div>
                );
              })}

              {completedMatches.length === 0 ? (
                <div className="rounded-[1.35rem] bg-slate-100 px-4 py-5 text-sm text-slate-600">Completed matches will stack here as courts advance.</div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
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
      toast.error("Finish a match first so there’s something to recap");
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
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden border-white/10 bg-[linear-gradient(135deg,rgba(17,24,39,0.98),rgba(91,33,182,0.88),rgba(17,24,39,0.98))] p-5 text-white sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-violet-200">
              <PartyPopper className="h-5 w-5" />
              <span className="text-xs uppercase tracking-[0.22em]">Session wrap</span>
            </div>
            <div className="text-sm text-white/72">Leaderboard · recap · export</div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-white/55">Night winner</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{leader ? leader.player : "Finish a match to crown the board"}</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-white/72">
                Wrap now feels like a club-night finish: clear winner up top, room stats in one glance, then recap and match log underneath.
              </p>
              {leader ? (
                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/90">
                  <Crown className="h-4 w-4 text-lime-300" />
                  {leader.wins}-{leader.losses} record · {Math.round(leader.winRate * 100)}% win rate · {leader.differential >= 0 ? "+" : ""}{leader.differential} diff
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">Completed</div>
                <div className="mt-2 text-3xl font-semibold">{matchScores.size}</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">Players</div>
                <div className="mt-2 text-3xl font-semibold">{players.length}</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">Points</div>
                <div className="mt-2 text-3xl font-semibold">{totalPoints}</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">Latest finish</div>
                <div className="mt-2 text-lg font-semibold">{hottestMatch ? `Court ${hottestMatch.court}` : "—"}</div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-white/10 bg-white/95 p-5 shadow-xl shadow-slate-950/5">
          <div className="flex items-center gap-2 text-violet-700">
            <Sparkles className="h-5 w-5" />
            <h3 className="text-lg font-semibold text-slate-900">Share the finish</h3>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Keep the end moment social. Share the session link, or export a clean wrap summary to the clipboard for group chat.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Button onClick={onShare} className="h-12 rounded-2xl bg-violet-600 text-white hover:bg-violet-500">
              <Share2 className="mr-2 h-4 w-4" />
              Share session link
            </Button>
            <Button onClick={() => void handleCopyRecap()} variant="outline" className="h-12 rounded-2xl">
              <Copy className="mr-2 h-4 w-4" />
              Copy wrap summary
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-white/10 bg-white/95 p-5 shadow-xl shadow-slate-950/5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Leaderboard summary</div>
              <h3 className="mt-1 text-2xl font-semibold text-slate-900">Standings for the night</h3>
            </div>
            <Badge className="border-0 bg-slate-900 text-white">{standings.length} ranked</Badge>
          </div>

          {standings.length > 0 ? (
            <div className="mt-5 space-y-3">
              {standings.map((entry, index) => (
                <div key={entry.player} className={`rounded-[1.5rem] border p-4 ${index === 0 ? "border-lime-300 bg-lime-50" : index < 3 ? "border-violet-200 bg-violet-50/60" : "border-slate-200 bg-slate-50"}`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${index === 0 ? "bg-lime-400 text-slate-950" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-lg font-semibold text-slate-900">{entry.player}</div>
                          {index === 0 ? <Crown className="h-4 w-4 text-lime-600" /> : null}
                          {index === 1 ? <Medal className="h-4 w-4 text-violet-600" /> : null}
                          {index === 2 ? <Trophy className="h-4 w-4 text-amber-500" /> : null}
                        </div>
                        <div className="text-sm text-slate-600">{entry.matchesPlayed} match{entry.matchesPlayed === 1 ? "" : "es"} played</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 sm:min-w-[310px]">
                      <div className="rounded-[1rem] bg-white px-3 py-2 text-center ring-1 ring-slate-200">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Win rate</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900">{Math.round(entry.winRate * 100)}%</div>
                      </div>
                      <div className="rounded-[1rem] bg-white px-3 py-2 text-center ring-1 ring-slate-200">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">W-L</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900">{entry.wins}-{entry.losses}</div>
                      </div>
                      <div className="rounded-[1rem] bg-white px-3 py-2 text-center ring-1 ring-slate-200">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Diff</div>
                        <div className={`mt-1 text-lg font-semibold ${entry.differential >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{entry.differential >= 0 ? "+" : ""}{entry.differential}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[1.5rem] bg-slate-100 px-5 py-12 text-center text-sm text-slate-600">
              Finish a few matches to generate standings.
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="border-white/10 bg-slate-950/85 p-5 text-white shadow-xl shadow-cyan-950/10">
            <div className="flex items-center gap-2 text-lime-300">
              <TrendingUp className="h-4 w-4" />
              <h3 className="font-semibold">Session recap</h3>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-white/45">Leader</div>
                <div className="mt-2 text-lg font-semibold">{leader ? leader.player : "No winner yet"}</div>
              </div>
              <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-white/45">Most recent result</div>
                <div className="mt-2 text-sm leading-6 text-white/85">
                  {hottestMatch ? `${getTeamLabel(hottestMatch.team1)} vs ${getTeamLabel(hottestMatch.team2)}` : "No completed match yet."}
                </div>
              </div>
              <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-white/45">Room pulse</div>
                <div className="mt-2 text-sm leading-6 text-white/85">
                  {matchScores.size === 0
                    ? "The session hasn’t really started yet."
                    : matchScores.size < 4
                      ? "The ladder is still loose — one strong run can flip the order fast."
                      : "The room has enough finished games to feel like a real night, not a draft board."}
                </div>
              </div>
            </div>
          </Card>

          {adSlot("wrap lower section")}
        </div>
      </div>

      <Card className="border-white/10 bg-white/95 p-5 shadow-xl shadow-slate-950/5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">History reel</div>
            <h3 className="mt-1 text-2xl font-semibold text-slate-900">Completed matches</h3>
          </div>
          <Badge className="border-0 bg-slate-900 text-white">{completedMatches.length} finished</Badge>
        </div>

        {completedMatches.length > 0 ? (
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {completedMatches.map((match) => {
              const score = matchScores.get(match.id);
              if (!score) return null;
              const team1Won = score.team1 > score.team2;
              const team2Won = score.team2 > score.team1;
              return (
                <div key={match.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Court {match.court} · {getMatchLabel(matches, match)}</div>
                      <div className="mt-1 text-sm text-slate-600">{match.clockStartTime || `${match.startTime} min slot`}</div>
                    </div>
                    <Badge className="border-0 bg-violet-100 text-violet-800">Final</Badge>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className={`flex items-center justify-between rounded-[1.15rem] px-4 py-3 ${team1Won ? "bg-emerald-50 ring-1 ring-emerald-200" : "bg-white ring-1 ring-slate-200"}`}>
                      <div className="text-sm font-medium text-slate-900">{getTeamLabel(match.team1)}</div>
                      <div className={`text-2xl font-semibold ${team1Won ? "text-emerald-700" : "text-slate-700"}`}>{score.team1}</div>
                    </div>
                    <div className={`flex items-center justify-between rounded-[1.15rem] px-4 py-3 ${team2Won ? "bg-emerald-50 ring-1 ring-emerald-200" : "bg-white ring-1 ring-slate-200"}`}>
                      <div className="text-sm font-medium text-slate-900">{getTeamLabel(match.team2)}</div>
                      <div className={`text-2xl font-semibold ${team2Won ? "text-emerald-700" : "text-slate-700"}`}>{score.team2}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 rounded-[1.5rem] bg-slate-100 px-5 py-12 text-center text-sm text-slate-600">
            Completed matches will collect here once the night gets moving.
          </div>
        )}
      </Card>
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
    if (!userId) {
      toast.error("Please wait for authentication");
      return;
    }

    const roundRobinConfig: GameConfig = {
      ...config,
      schedulingType: "round-robin",
      tournamentPlayStyle: undefined,
    };

    setGameConfig(roundRobinConfig);

    try {
      if (gameId) {
        const { error } = await supabase.from("games").update({ game_config: roundRobinConfig as any }).eq("id", gameId);
        if (error) throw error;
      } else {
        const { data: codeData } = await supabase.rpc("generate_game_code");
        const newCode = codeData as string;
        const { data, error } = await supabase
          .from("games")
          .insert([{ game_code: newCode, game_config: roundRobinConfig as any, players: [], matches: [], creator_id: userId }])
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
      debugLogger.log("error", "setup save failed", error);
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
      toast.success("You’re marked to skip your next match");
      window.setTimeout(async () => {
        await setSkipNextMatch(gameId, playerName, false);
      }, 5 * 60 * 1000);
    } catch (error) {
      debugLogger.log("error", `skip failed for ${matchId}`, error);
      toast.error("Couldn’t update skip status");
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
        <Card className="border-white/10 bg-white/95 p-8 text-center text-slate-600">
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
        <Card className="border-white/10 bg-white/95 p-3 sm:p-4">
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.18),transparent_28%),linear-gradient(180deg,#08111f_0%,#0b1220_100%)] px-4 py-5 text-slate-900 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4 pb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="PickleMatch" className="h-12 w-auto sm:h-14" />
            <div className="text-white">
              <div className="text-xs uppercase tracking-[0.24em] text-white/45">Casual club-night utility</div>
              <div className="text-lg font-semibold sm:text-xl">PickleMatch</div>
            </div>
          </div>

          {gameCode ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white">
                Session code <span className="ml-2 font-mono font-semibold text-lime-300">{gameCode}</span>
              </div>
              <Button variant="outline" onClick={handleCopyCode} className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                <Copy className="mr-2 h-4 w-4" />
                Copy code
              </Button>
            </div>
          ) : null}
        </div>

        {activeStep !== "start" && (gameCode || gameConfig || isSetupDraftOpen) ? (
          <>
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
            <StepRail activeStep={activeStep} onSelect={setActiveStep} />
          </>
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

        {activeStep !== "start" && (gameCode || gameConfig || isSetupDraftOpen) ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[2rem] border border-white/10 bg-white/5 px-4 py-3 text-white/72">
            <Button
              variant="outline"
              onClick={() => setActiveStep(getPreviousStep(activeStep))}
              disabled={activeStep === "start"}
              className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              Back
            </Button>
            <div className="text-sm">{STEP_LABELS[activeStep]} screen owns one job.</div>
            <Button
              onClick={() => setActiveStep(getNextStep(activeStep))}
              disabled={
                activeStep === "wrap" ||
                (activeStep === "setup" && !gameCode) ||
                (activeStep === "players" && players.length < minimumPlayersRequired)
              }
              className="bg-lime-400 text-slate-950 hover:bg-lime-300"
            >
              Next step
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Index;
