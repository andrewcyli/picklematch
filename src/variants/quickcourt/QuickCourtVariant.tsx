import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Clock3,
  Copy,
  ListOrdered,
  LogIn,
  PlayCircle,
  Share2,
  TimerReset,
  Trophy,
  UserCircle,
  Users,
  Zap,
} from "lucide-react";

import { AppShell, PlayerViewHeader, useShell } from "@/shell";
import { PlayerIdentitySelector } from "@/components/PlayerIdentitySelector";
import { CheckInOut } from "@/components/CheckInOut";
import { ScheduleView } from "@/components/ScheduleView";
import { Leaderboard } from "@/components/Leaderboard";
import { MatchHistory } from "@/components/MatchHistory";
import { MyMatchesView } from "@/components/MyMatchesView";
import { GameSetup } from "@/components/GameSetup";
import { ShareButton } from "@/components/ShareButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { safeStorage } from "@/lib/safe-storage";
import { setSkipNextMatch } from "@/lib/player-identity";
import { usePlayerIdentity } from "@/hooks/use-player-identity";
import { usePlayerMatches } from "@/hooks/use-player-matches";
import { usePlayerNotifications } from "@/hooks/use-player-notifications";
import { generateSchedule, type CourtConfig } from "@/lib/scheduler";
import { cn } from "@/lib/utils";
import { validateGameCode } from "@/lib/validation";
import type { GameConfig, Match, Section } from "@/core/types";

const QUICK_STORAGE_KEYS = {
  id: "quickcourt_game_id",
  code: "quickcourt_game_code",
};

const QUICK_NAV: Array<{ id: Section; label: string; shortLabel: string }> = [
  { id: "setup", label: "Start", shortLabel: "Start" },
  { id: "players", label: "Players", shortLabel: "Players" },
  { id: "matches", label: "Courts", shortLabel: "Courts" },
  { id: "leaderboard", label: "Leaders", shortLabel: "Leaders" },
  { id: "history", label: "Done", shortLabel: "Done" },
];

const FLOW_STEPS: Array<{ id: Section; label: string }> = [
  { id: "setup", label: "Start" },
  { id: "players", label: "Players" },
  { id: "matches", label: "Courts" },
  { id: "leaderboard", label: "Leaderboard" },
];

const parseQuickNames = (value: string) =>
  Array.from(
    new Set(
      value
        .split(/[\n,]+/)
        .map((name) => name.trim())
        .filter(Boolean)
    )
  );

const getCourtLetter = (court: number) => String.fromCharCode(64 + court);

const copyToClipboard = async (value: string, label: string) => {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Couldn't copy ${label.toLowerCase()}`);
  }
};

const useQuickCourtGameState = () => {
  const [players, setPlayers] = useState<string[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameCode, setGameCode] = useState("");
  const [matchScores, setMatchScores] = useState<Map<string, { team1: number; team2: number }>>(new Map());
  const [userId, setUserId] = useState<string | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const restoringRef = useRef(false);

  const sanitizeMatches = useCallback((arr: Match[]) => {
    const seen = new Map<string, number>();
    return arr.map((m) => {
      const baseId = m.id && m.id.trim() !== "" ? m.id : `match-c${m.court}-t${m.startTime}`;
      const count = seen.get(baseId) || 0;
      seen.set(baseId, count + 1);
      const id = count === 0 ? baseId : `${baseId}-v${count + 1}`;
      return { ...m, id };
    });
  }, []);

  const syncMatchScoresFromMatches = useCallback((loaded: Match[]) => {
    const next = new Map<string, { team1: number; team2: number }>();
    loaded.forEach((match) => {
      if (match.score) next.set(match.id, match.score);
    });
    setMatchScores(next);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (!error) setUserId(data.user?.id || null);
      } else {
        setUserId(session.user.id);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId || restoringRef.current) return;

    const restore = async () => {
      restoringRef.current = true;
      const savedGameId = safeStorage.getItem(QUICK_STORAGE_KEYS.id);
      const savedGameCode = safeStorage.getItem(QUICK_STORAGE_KEYS.code);

      if (savedGameId && savedGameCode) {
        try {
          const { data, error } = await supabase.from("games").select("*").eq("id", savedGameId).single();
          if (!error && data) {
            const loadedMatches = sanitizeMatches((data.matches as unknown as Match[]) || []);
            setGameId(data.id);
            setGameCode(data.game_code);
            setPlayers(data.players || []);
            setGameConfig(data.game_config as unknown as GameConfig);
            setMatches(loadedMatches);
            syncMatchScoresFromMatches(loadedMatches);
          } else {
            safeStorage.removeItem(QUICK_STORAGE_KEYS.id);
            safeStorage.removeItem(QUICK_STORAGE_KEYS.code);
          }
        } catch {
          safeStorage.removeItem(QUICK_STORAGE_KEYS.id);
          safeStorage.removeItem(QUICK_STORAGE_KEYS.code);
        }
      }

      setIsRestoringSession(false);
      restoringRef.current = false;
    };

    restore();
  }, [sanitizeMatches, syncMatchScoresFromMatches, userId]);

  useEffect(() => {
    if (!gameId) return;

    const channel = supabase
      .channel(`quickcourt-updates-${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const updated = payload.new;
            const loadedMatches = sanitizeMatches((updated.matches as unknown as Match[]) || []);
            setPlayers(updated.players || []);
            setMatches(loadedMatches);
            setGameConfig(updated.game_config as unknown as GameConfig);
            syncMatchScoresFromMatches(loadedMatches);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, sanitizeMatches, syncMatchScoresFromMatches]);

  return {
    players,
    setPlayers,
    matches,
    setMatches,
    gameConfig,
    setGameConfig,
    gameId,
    setGameId,
    gameCode,
    setGameCode,
    matchScores,
    setMatchScores,
    userId,
    isRestoringSession,
    sanitizeMatches,
    syncMatchScoresFromMatches,
  };
};

const QuickCourtBottomNav: React.FC<{ disabled?: boolean }> = ({ disabled = false }) => {
  const { activeSection, setActiveSection } = useShell();

  return (
    <div className="border-t border-slate-200 bg-white/95 backdrop-blur-xl px-2 pb-safe pt-2">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-1">
        {QUICK_NAV.map((item) => {
          const active = item.id === activeSection;
          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && setActiveSection(item.id)}
              className={cn(
                "flex min-h-12 flex-1 flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-medium transition",
                active ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-slate-100",
                disabled && "cursor-not-allowed opacity-50"
              )}
            >
              <span className="hidden sm:inline">{item.label}</span>
              <span className="sm:hidden">{item.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const FlowTracker: React.FC<{ activeSection: Section; unlocked: Set<Section> }> = ({ activeSection, unlocked }) => (
  <div className="px-1 pt-4 pb-3">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-3 shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-2 overflow-x-auto">
        {FLOW_STEPS.map((step, index) => {
          const complete = unlocked.has(step.id) && step.id !== activeSection;
          const active = step.id === activeSection;
          return (
            <React.Fragment key={step.id}>
              <div
                className={cn(
                  "flex min-w-fit items-center gap-2 rounded-full px-3 py-2 text-xs font-medium",
                  active && "bg-slate-900 text-white",
                  complete && !active && "bg-emerald-50 text-emerald-700",
                  !active && !complete && "bg-slate-100 text-slate-500"
                )}
              >
                {complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleDot className="h-3.5 w-3.5" />}
                {step.label}
              </div>
              {index < FLOW_STEPS.length - 1 ? <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" /> : null}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  </div>
);

const QuickHero: React.FC<{
  gameCode: string;
  players: string[];
  matches: Match[];
  matchScores: Map<string, { team1: number; team2: number }>;
  gameConfig: GameConfig | null;
  activeSection: Section;
  onShowPlayerSelector: () => void;
}> = ({ gameCode, players, matches, matchScores, gameConfig, activeSection, onShowPlayerSelector }) => {
  const remaining = Math.max(matches.length - matchScores.size, 0);
  const titleBySection: Record<Section, string> = {
    setup: gameCode ? "Set up tonight’s courts." : "Join a code or start a session.",
    players: "Add players and build the rotation.",
    matches: "Run the courts.",
    leaderboard: "Leaderboard",
    history: "Session recap",
  };

  const descriptionBySection: Record<Section, string> = {
    setup: gameCode
      ? "Pick duration and court format, then move straight into players."
      : "No intro detour — create or join and get straight to the working screen.",
    players: "Paste names fast, add walk-ins, lock doubles pairs if needed, then generate matches.",
    matches: "Edit scores, swap players, and keep the next matchup visible on each court.",
    leaderboard: "Wins and games played, kept visible without getting in the way.",
    history: "Completed matches and final scores.",
  };

  return (
    <div className="px-1 pt-1 pb-4">
      <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_50%,#eef2ff_100%)] p-5 text-slate-900 shadow-[0_30px_80px_rgba(15,23,42,0.08)] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge className="border-0 bg-slate-900 text-white">Quick Court</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{titleBySection[activeSection]}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">{descriptionBySection[activeSection]}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 lg:min-w-[440px]">
            <StatCard label="Code" value={gameCode || "New"} />
            <StatCard label="Players" value={String(players.length)} />
            <StatCard label="Courts" value={String(gameConfig?.courts || 0)} />
            <StatCard label="To play" value={String(remaining)} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {gameCode ? (
            <Button variant="secondary" className="bg-white" onClick={() => copyToClipboard(gameCode, "Code")}>
              <Copy className="mr-2 h-4 w-4" />
              Copy code
            </Button>
          ) : null}
          {gameCode ? (
            <Button variant="secondary" className="bg-white" onClick={onShowPlayerSelector}>
              <UserCircle className="mr-2 h-4 w-4" />
              I’m playing
            </Button>
          ) : null}
          {gameCode ? (
            <div className="inline-flex items-center">
              <ShareButton />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-2xl border border-white/80 bg-white/75 p-3 shadow-sm">
    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
    <div className="mt-1 text-lg font-semibold">{value}</div>
  </div>
);

const QuickEntryCard: React.FC<{
  onJoinGame: (code: string) => void;
  onCreateGame: () => void;
}> = ({ onJoinGame, onCreateGame }) => {
  const [gameCode, setGameCode] = useState("");

  const handleJoin = () => {
    const code = gameCode.trim().toUpperCase();
    const validation = validateGameCode(code);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid game code");
      return;
    }
    onJoinGame(code);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <Card className="border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2 text-slate-900">
          <PlayCircle className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Create session</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Start a room, choose court setup, and go straight to players.
        </p>
        <Button onClick={onCreateGame} className="mt-5 h-12 w-full text-base font-semibold">
          Continue
        </Button>
      </Card>

      <Card className="border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2 text-slate-900">
          <LogIn className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Join with a code</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Drop into an existing night with the 6-character code from the organizer.
        </p>
        <div className="mt-5 space-y-3">
          <Input
            value={gameCode}
            onChange={(e) => setGameCode(e.target.value.toUpperCase())}
            placeholder="Enter 6-char code"
            maxLength={6}
            className="h-12 font-mono text-lg uppercase tracking-[0.3em]"
          />
          <Button onClick={handleJoin} disabled={gameCode.trim().length !== 6} variant="secondary" className="h-12 w-full text-base font-semibold">
            Join session
          </Button>
        </div>
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          Use this if the session already exists. If you’re organizing tonight, create first and you’ll get the code right away.
        </div>
      </Card>
    </div>
  );
};

const QuickAddPlayersCard: React.FC<{
  players: string[];
  onAddPlayers: (names: string[]) => void;
}> = ({ players, onAddPlayers }) => {
  const [draft, setDraft] = useState("");
  const parsed = useMemo(() => parseQuickNames(draft), [draft]);
  const addable = parsed.filter((name) => !players.some((player) => player.toLowerCase() === name.toLowerCase()));

  return (
    <Card className="border-slate-200 bg-white/90 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-slate-900">
        <Zap className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Quick add lane</h3>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Paste names separated by commas or line breaks. Ideal for getting a whole drop-in crowd registered in one shot.
      </p>
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Maya, Theo, Jules, Iris"
        className="mt-4 min-h-[110px] border-slate-200 bg-slate-50"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {parsed.slice(0, 8).map((name) => (
          <Badge key={name} variant="secondary" className="bg-slate-100 text-slate-700">
            {name}
          </Badge>
        ))}
        {parsed.length > 8 ? <Badge variant="secondary">+{parsed.length - 8} more</Badge> : null}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          disabled={addable.length === 0}
          onClick={() => {
            onAddPlayers(addable);
            setDraft("");
          }}
        >
          Add {addable.length || ""} player{addable.length === 1 ? "" : "s"}
        </Button>
        <p className="text-sm text-slate-500">Duplicates are skipped automatically.</p>
      </div>
    </Card>
  );
};

const QuickCourtBoard: React.FC<{
  matches: Match[];
  players: string[];
  gameConfig: GameConfig;
  matchScores: Map<string, { team1: number; team2: number }>;
  onShowPlayerSelector: () => void;
  onMatchScoresUpdate: (scores: Map<string, { team1: number; team2: number }>) => void;
  onScheduleUpdate: (matches: Match[], players: string[]) => void;
  onCourtConfigUpdate: (configs: CourtConfig[]) => void;
}> = ({
  matches,
  players,
  gameConfig,
  matchScores,
  onShowPlayerSelector,
  onMatchScoresUpdate,
  onScheduleUpdate,
  onCourtConfigUpdate,
}) => {
  const board = useMemo(() => {
    const courtIds = Array.from({ length: gameConfig.courts }, (_, index) => index + 1);
    const liveByCourt = new Map<number, Match>();
    const nextByCourt = new Map<number, Match>();
    const upcoming: Match[] = [];

    courtIds.forEach((court) => {
      const queue = matches.filter((match) => match.court === court && !matchScores.has(match.id));
      if (queue[0]) liveByCourt.set(court, queue[0]);
      if (queue[1]) nextByCourt.set(court, queue[1]);
      queue.slice(0, 2).forEach((match) => upcoming.push(match));
    });

    const activePlayers = new Set(Array.from(liveByCourt.values()).flatMap((match) => [...match.team1, ...match.team2]));
    const queuedPlayers = new Set(Array.from(nextByCourt.values()).flatMap((match) => [...match.team1, ...match.team2]));
    const waitingPlayers = players.filter((player) => !activePlayers.has(player) && !queuedPlayers.has(player));

    return { courtIds, liveByCourt, nextByCourt, waitingPlayers, upcoming };
  }, [gameConfig.courts, matchScores, matches, players]);

  const leaderboardPreview = useMemo(() => {
    const stats = players.map((player) => {
      let wins = 0;
      let played = 0;

      matches.forEach((match) => {
        const score = matchScores.get(match.id);
        if (!score) return;
        const in1 = match.team1.includes(player);
        const in2 = match.team2.includes(player);
        if (!in1 && !in2) return;
        played += 1;
        if ((in1 && score.team1 > score.team2) || (in2 && score.team2 > score.team1)) wins += 1;
      });

      return { player, wins, played, rate: played ? wins / played : 0 };
    });

    return stats.sort((a, b) => b.rate - a.rate || b.wins - a.wins).slice(0, 3);
  }, [matchScores, matches, players]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Courts now</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Live status and next game in one glance.</h2>
            </div>
            <Button variant="secondary" className="bg-white" onClick={onShowPlayerSelector}>
              <UserCircle className="mr-2 h-4 w-4" />
              Find my matches
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {board.courtIds.map((court) => {
              const live = board.liveByCourt.get(court);
              const next = board.nextByCourt.get(court);
              return (
                <div key={court} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Court {getCourtLetter(court)}</div>
                      <div className="mt-1 text-lg font-semibold text-slate-900">{live ? "Playing now" : "Court open"}</div>
                    </div>
                    <Badge className={cn("border-0", live ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700")}>
                      {live ? "Live" : "Standby"}
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <MiniMatchCard title="On court" match={live} tone="live" />
                    <MiniMatchCard title="Next in" match={next} tone="queue" />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="border-slate-200 bg-white/90 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900">
              <ListOrdered className="h-5 w-5" />
              <h3 className="font-semibold">Bench / waiting</h3>
            </div>
            <p className="mt-2 text-sm text-slate-600">Anyone not on court and not already next up.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {board.waitingPlayers.length > 0 ? (
                board.waitingPlayers.map((player) => (
                  <Badge key={player} variant="secondary" className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">
                    {player}
                  </Badge>
                ))
              ) : (
                <div className="rounded-2xl bg-slate-100 px-3 py-3 text-sm text-slate-500">Everyone is either playing or next in.</div>
              )}
            </div>
          </Card>

          <Card className="border-slate-200 bg-white/90 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900">
              <Clock3 className="h-5 w-5" />
              <h3 className="font-semibold">Next around the room</h3>
            </div>
            <div className="mt-4 space-y-2">
              {board.upcoming.slice(0, Math.max(2, gameConfig.courts * 2)).map((match) => (
                <div key={match.id} className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                  <div className="font-medium text-slate-900">Court {getCourtLetter(match.court)}</div>
                  <div className="mt-1">{match.team1.join(" + ")} vs {match.team2.join(" + ")}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-slate-200 bg-white/90 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900">
              <Trophy className="h-5 w-5" />
              <h3 className="font-semibold">Live leaderboard snapshot</h3>
            </div>
            <div className="mt-4 space-y-2">
              {leaderboardPreview.length > 0 ? leaderboardPreview.map((entry, index) => (
                <div key={entry.player} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">{index + 1}</div>
                    <div>
                      <div className="font-medium text-slate-900">{entry.player}</div>
                      <div className="text-xs text-slate-500">{entry.played} match{entry.played === 1 ? "" : "es"}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-900">{Math.round(entry.rate * 100)}%</div>
                    <div className="text-xs text-slate-500">{entry.wins} wins</div>
                  </div>
                </div>
              )) : <div className="text-sm text-slate-500">No scores yet — leaderboard wakes up after the first finished game.</div>}
            </div>
          </Card>
        </div>
      </div>

      <Card className="border-slate-200 bg-white/90 p-3 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-2 pt-1">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Detailed controls</p>
            <h3 className="text-xl font-semibold text-slate-900">Scoring and schedule controls</h3>
          </div>
          <Badge variant="secondary" className="bg-slate-100 text-slate-700">Core engine unchanged</Badge>
        </div>
        <ScheduleView
          matches={matches as any}
          onBack={() => {}}
          gameConfig={gameConfig as any}
          allPlayers={players}
          onScheduleUpdate={(updatedMatches, updatedPlayers) => onScheduleUpdate(updatedMatches as any, updatedPlayers)}
          matchScores={matchScores}
          onMatchScoresUpdate={onMatchScoresUpdate}
          onCourtConfigUpdate={(configs) => onCourtConfigUpdate(configs as CourtConfig[])}
          isPlayerView={false}
          playerName={null}
          onReleaseIdentity={() => {}}
          onShowPlayerSelector={onShowPlayerSelector}
        />
      </Card>
    </div>
  );
};

const MiniMatchCard: React.FC<{
  title: string;
  match?: Match;
  tone: "live" | "queue";
}> = ({ title, match, tone }) => (
  <div className={cn("rounded-2xl border p-3", tone === "live" ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-amber-200 bg-amber-50 text-amber-950")}>
    <div className="text-xs uppercase tracking-[0.18em] opacity-70">{title}</div>
    {match ? (
      <>
        <div className="mt-2 text-sm font-medium leading-6">{match.team1.join(" + ")} vs {match.team2.join(" + ")}</div>
        <div className="mt-2 text-xs opacity-70">Starts at {match.startTime} min</div>
      </>
    ) : (
      <div className="mt-2 text-sm opacity-70">Nothing queued here yet.</div>
    )}
  </div>
);

export const QuickCourtVariant: React.FC = () => {
  const { activeSection, setActiveSection } = useShell();
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);
  const [isSetupDraftOpen, setIsSetupDraftOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const state = useQuickCourtGameState();
  const { playerName, isPlayerView, claimIdentity, releaseIdentity } = usePlayerIdentity(state.gameId);
  const playerMatches = usePlayerMatches(state.matches as any, playerName, state.matchScores);

  usePlayerNotifications(state.matches as any, playerName, state.gameId, state.matchScores);

  useEffect(() => {
    if (isPlayerView) {
      const interval = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(interval);
    }
  }, [isPlayerView]);

  useEffect(() => {
    const joinCode = new URLSearchParams(window.location.search).get("join");
    if (joinCode && state.userId) {
      window.history.replaceState({}, "", window.location.pathname);
      joinExistingGame(joinCode);
    }
  }, [state.userId]);

  useEffect(() => {
    if (state.matches.length > 0) {
      setActiveSection("matches");
    } else if (state.gameConfig) {
      setActiveSection("players");
    } else {
      setActiveSection("setup");
    }
  }, [setActiveSection, state.gameConfig, state.matches.length]);

  const joinExistingGame = async (code: string) => {
    if (!state.userId) {
      toast.error("Please wait for authentication");
      return;
    }

    try {
      const { data, error } = await supabase.from("games").select("*").eq("game_code", code).single();
      if (error || !data) {
        toast.error("Game not found");
        return;
      }

      const loadedMatches = state.sanitizeMatches((data.matches as unknown as Match[]) || []);
      state.setGameId(data.id);
      state.setGameCode(data.game_code);
      state.setPlayers(data.players || []);
      state.setGameConfig(data.game_config as unknown as GameConfig);
      state.setMatches(loadedMatches);
      state.syncMatchScoresFromMatches(loadedMatches);
      safeStorage.setItem(QUICK_STORAGE_KEYS.id, data.id);
      safeStorage.setItem(QUICK_STORAGE_KEYS.code, data.game_code);
      setIsSetupDraftOpen(false);
      setActiveSection(loadedMatches.length > 0 ? "matches" : data.game_config ? "players" : "setup");
      toast.success(`Joined game: ${code}`);
    } catch {
      toast.error("Failed to join game");
    }
  };

  const createNewGame = () => {
    safeStorage.removeItem(QUICK_STORAGE_KEYS.id);
    safeStorage.removeItem(QUICK_STORAGE_KEYS.code);
    state.setPlayers([]);
    state.setMatches([]);
    state.setGameConfig(null);
    state.setGameId(null);
    state.setGameCode("");
    state.setMatchScores(new Map());
    setIsSetupDraftOpen(true);
    setActiveSection("setup");
  };

  const startNewSession = () => {
    createNewGame();
    toast.success("Fresh Quick Court session started");
  };

  const handleSetupComplete = async (config: GameConfig) => {
    if (!state.userId) {
      toast.error("Please wait for authentication");
      return;
    }

    const quickConfig: GameConfig = {
      ...config,
      schedulingType: "round-robin",
      tournamentPlayStyle: undefined,
    };

    state.setGameConfig(quickConfig);

    try {
      const { data: codeData } = await supabase.rpc("generate_game_code");
      const newGameCode = codeData as string;

      const { data, error } = await supabase
        .from("games")
        .insert([{ game_code: newGameCode, game_config: quickConfig as any, players: [], matches: [], creator_id: state.userId }])
        .select()
        .single();

      if (error) throw error;

      state.setGameId(data.id);
      state.setGameCode(newGameCode);
      safeStorage.setItem(QUICK_STORAGE_KEYS.id, data.id);
      safeStorage.setItem(QUICK_STORAGE_KEYS.code, newGameCode);
      setIsSetupDraftOpen(false);
      setActiveSection("players");
      toast.success(`Quick Court ready: ${newGameCode}`);
    } catch {
      toast.error("Failed to create session");
    }
  };

  const handlePlayersChange = async (players: string[], pairs?: { player1: string; player2: string }[]) => {
    state.setPlayers(players);
    if (!state.gameConfig || !state.gameId) return;
    const updatedConfig = { ...state.gameConfig, teammatePairs: pairs };
    state.setGameConfig(updatedConfig);

    try {
      const { error } = await supabase.from("games").update({ players, game_config: updatedConfig as any }).eq("id", state.gameId);
      if (error) throw error;
    } catch {
      toast.error("Failed to save players");
    }
  };

  const handlePlayersUpdate = async (players: string[], pairs?: { player1: string; player2: string }[]): Promise<boolean> => {
    if (!state.gameConfig || !state.gameId) return false;

    const updatedConfig = { ...state.gameConfig, teammatePairs: pairs };
    state.setPlayers(players);
    state.setGameConfig(updatedConfig);

    const preservedMatches: Match[] = [];
    const courts = Array.from(new Set(state.matches.map((m) => m.court)));
    for (const court of courts) {
      const courtMatches = state.matches.filter((m) => m.court === court);
      const completedMatches = courtMatches.filter((m) => state.matchScores.has(m.id));
      preservedMatches.push(...completedMatches);
      const currentMatchIndex = courtMatches.findIndex((m) => !state.matchScores.has(m.id));
      if (currentMatchIndex >= 0) preservedMatches.push(courtMatches[currentMatchIndex]);
    }

    let regenerateFromTime = 0;
    if (preservedMatches.length > 0) {
      regenerateFromTime = Math.max(...preservedMatches.map((m) => m.endTime));
    }

    const futureMatches = generateSchedule(
      players,
      state.gameConfig.gameDuration,
      state.gameConfig.totalTime,
      state.gameConfig.courts,
      undefined,
      pairs,
      state.gameConfig.courtConfigs
    ).filter((match) => match.startTime >= regenerateFromTime);

    const finalSchedule = state.sanitizeMatches([...preservedMatches, ...futureMatches]);
    state.setMatches(finalSchedule);

    try {
      const { error } = await supabase
        .from("games")
        .update({ players, matches: finalSchedule as any, game_config: updatedConfig as any })
        .eq("id", state.gameId);
      if (error) throw error;

      toast.success(
        preservedMatches.length > 0
          ? `Roster updated. ${preservedMatches.length} live/completed match(es) held in place.`
          : "Courts loaded — ready to play."
      );
      return true;
    } catch {
      toast.error("Failed to refresh session");
      return false;
    }
  };

  const handleQuickAddPlayers = async (names: string[]) => {
    const merged = Array.from(new Set([...state.players, ...names]));
    await handlePlayersChange(merged, state.gameConfig?.teammatePairs);
    toast.success(`${names.length} player${names.length === 1 ? "" : "s"} added`);
  };

  const handleScheduleUpdate = async (matches: Match[], players: string[]) => {
    const sanitized = state.sanitizeMatches(matches);
    state.setMatches(sanitized);
    state.setPlayers(players);
    state.syncMatchScoresFromMatches(sanitized);
    if (!state.gameId) return;

    try {
      const { error } = await supabase.from("games").update({ matches: sanitized as any, players }).eq("id", state.gameId);
      if (error) throw error;
    } catch {
      toast.error("Failed to save match update");
    }
  };

  const handleCourtConfigUpdate = async (courtConfigs: CourtConfig[]) => {
    if (!state.gameConfig || !state.gameId) return;
    const updatedConfig = { ...state.gameConfig, courtConfigs };
    state.setGameConfig(updatedConfig);

    try {
      const { error } = await supabase.from("games").update({ game_config: updatedConfig as any }).eq("id", state.gameId);
      if (error) throw error;
    } catch {
      toast.error("Failed to save court setup");
    }
  };

  const handleSkipMatch = async (matchId: string) => {
    if (!state.gameId || !playerName) return;
    try {
      await setSkipNextMatch(state.gameId, playerName, true);
      toast.success("You’ll sit out the next one");
      setTimeout(async () => {
        if (state.gameId && playerName) await setSkipNextMatch(state.gameId, playerName, false);
      }, 5 * 60 * 1000);
    } catch {
      toast.error("Failed to skip match");
    }
  };

  const completedMatches = state.matchScores.size;
  const waitingCount = Math.max(state.players.length - Math.min(state.players.length, state.gameConfig?.courts ? state.gameConfig.courts * 4 : 0), 0);
  const unlockedSections = useMemo(() => {
    const unlocked = new Set<Section>(["setup"]);
    if (state.gameConfig) unlocked.add("players");
    if (state.matches.length > 0) {
      unlocked.add("matches");
      unlocked.add("leaderboard");
      unlocked.add("history");
    }
    return unlocked;
  }, [state.gameConfig, state.matches.length]);

  if (state.isRestoringSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] text-slate-900">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg">
            <TimerReset className="h-8 w-8" />
          </div>
          <p className="text-sm text-slate-500">Reopening Quick Court…</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      hideHeader
      bottomNav={<QuickCourtBottomNav disabled={!state.gameId && activeSection === "setup" && !state.gameConfig} />}
      header={isPlayerView && playerName ? (
        <PlayerViewHeader
          playerName={playerName}
          onExit={() => {
            releaseIdentity();
            toast.success("Back to organizer board");
          }}
        />
      ) : undefined}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col pb-6">
        <FlowTracker activeSection={activeSection} unlocked={unlockedSections} />

        <QuickHero
          gameCode={state.gameCode}
          players={state.players}
          matches={state.matches}
          matchScores={state.matchScores}
          gameConfig={state.gameConfig}
          activeSection={activeSection}
          onShowPlayerSelector={() => setShowPlayerSelector(true)}
        />

        {showPlayerSelector ? (
          <PlayerIdentitySelector
            players={state.players}
            onSelect={async (name) => {
              await claimIdentity(name);
              setShowPlayerSelector(false);
              setActiveSection("matches");
              toast.success(`You’re checked in as ${name}`);
            }}
            onCancel={() => setShowPlayerSelector(false)}
          />
        ) : null}

        <Card className="border-slate-200 bg-white/80 p-3 shadow-[0_24px_60px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:p-4">
          {activeSection === "setup" && !state.gameConfig && !isSetupDraftOpen && (
            <QuickEntryCard onJoinGame={joinExistingGame} onCreateGame={createNewGame} />
          )}

          {activeSection === "setup" && !state.gameConfig && isSetupDraftOpen && (
            <div className="space-y-4">
              <Card className="border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Quick setup</p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-900">Round-robin only. Just the choices that matter tonight.</h2>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      safeStorage.removeItem(QUICK_STORAGE_KEYS.id);
                      safeStorage.removeItem(QUICK_STORAGE_KEYS.code);
                      state.setPlayers([]);
                      state.setMatches([]);
                      state.setGameConfig(null);
                      state.setGameId(null);
                      state.setGameCode("");
                      state.setMatchScores(new Map());
                      setIsSetupDraftOpen(false);
                    }}
                  >
                    Back
                  </Button>
                </div>
              </Card>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 sm:p-5">
                <GameSetup quickCourtMode onComplete={handleSetupComplete} gameCode={state.gameCode} onNewSession={startNewSession} />
              </div>
            </div>
          )}

          {activeSection === "players" && state.gameCode && state.gameConfig && (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <QuickAddPlayersCard players={state.players} onAddPlayers={handleQuickAddPlayers} />
                <Card className="border-slate-200 bg-white/90 p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900">
                    <Users className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Tonight’s pickup snapshot</h3>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <StatCard label="Checked in" value={String(state.players.length)} />
                    <StatCard label="Completed" value={String(completedMatches)} />
                    <StatCard label="Bench" value={String(waitingCount)} />
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    This screen is just for rostering. Add the room, lock pairs if needed, then generate the session when you’re ready.
                  </p>
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    Once matches are generated, this page still works for walk-ins and drop-offs without changing the overall flow.
                  </div>
                </Card>
              </div>

              <CheckInOut
                gameCode={state.gameCode}
                players={state.players}
                onPlayersChange={handlePlayersChange}
                onPlayersUpdate={handlePlayersUpdate}
                matches={state.matches as any}
                matchScores={state.matchScores}
                teammatePairs={state.gameConfig?.teammatePairs}
                onNavigateToMatches={() => setActiveSection("matches")}
                hasStartedMatches={state.matches.length > 0}
              />
            </div>
          )}

          {activeSection === "matches" && state.gameConfig && (
            <div className="space-y-4">
              {isPlayerView && playerName ? (
                <MyMatchesView
                  playerName={playerName}
                  matchGroups={playerMatches}
                  matchScores={state.matchScores}
                  currentTime={currentTime}
                  allMatches={state.matches}
                  onReleaseIdentity={() => {
                    releaseIdentity();
                    toast.success("Back to organizer board");
                  }}
                  onSkipMatch={handleSkipMatch}
                />
              ) : (
                <QuickCourtBoard
                  matches={state.matches}
                  players={state.players}
                  gameConfig={state.gameConfig}
                  matchScores={state.matchScores}
                  onShowPlayerSelector={() => setShowPlayerSelector(true)}
                  onMatchScoresUpdate={state.setMatchScores}
                  onScheduleUpdate={handleScheduleUpdate}
                  onCourtConfigUpdate={handleCourtConfigUpdate}
                />
              )}
            </div>
          )}

          {activeSection === "leaderboard" && (
            <div className="space-y-4">
              <Card className="border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Leaders</p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-900">Keep the bragging rights light and visible.</h2>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-slate-500" />
                    <ShareButton />
                  </div>
                </div>
              </Card>
              <Leaderboard players={state.players} matches={state.matches as any} matchScores={state.matchScores} />
            </div>
          )}

          {activeSection === "history" && (
            <div className="space-y-4">
              <Card className="border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-slate-900">
                  <Trophy className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">Quick wrap-up</h2>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Recap the session without turning it into a tournament ceremony. Scores, winners, and the final story are all here.
                </p>
              </Card>
              <MatchHistory matches={state.matches as any} matchScores={state.matchScores} />
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
};

export default QuickCourtVariant;
