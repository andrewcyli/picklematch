import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
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
import { ScheduleView } from "@/components/ScheduleView";
import { Leaderboard } from "@/components/Leaderboard";
import { MatchHistory } from "@/components/MatchHistory";
import { MyMatchesView } from "@/components/MyMatchesView";
import { PlayerSetup } from "@/components/PlayerSetup";
import { ShareButton } from "@/components/ShareButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { safeStorage } from "@/lib/safe-storage";
import { setSkipNextMatch } from "@/lib/player-identity";
import { usePlayerIdentity } from "@/hooks/use-player-identity";
import { usePlayerMatches } from "@/hooks/use-player-matches";
import { usePlayerNotifications } from "@/hooks/use-player-notifications";
import { type CourtConfig, generateSchedule } from "@/lib/scheduler";
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
  { id: "history", label: "Wrap", shortLabel: "Wrap" },
];

const DURATION_OPTIONS = [10, 15, 20];
const TOTAL_TIME_OPTIONS = [60, 90, 120, 150];
const COURT_OPTIONS = [1, 2, 3, 4, 5, 6];

const getCourtLetter = (court: number) => String.fromCharCode(64 + court);

const copyToClipboard = async (value: string, label: string) => {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Couldn't copy ${label.toLowerCase()}`);
  }
};

const buildQuickConfig = (courts: number, gameDuration: number, totalTime: number, courtConfigs?: CourtConfig[]): GameConfig => ({
  courts,
  gameDuration,
  totalTime,
  schedulingType: "round-robin",
  tournamentPlayStyle: undefined,
  courtConfigs:
    courtConfigs ||
    Array.from({ length: courts }, (_, index) => ({
      courtNumber: index + 1,
      type: "doubles" as const,
    })),
});

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

const QuickCourtBottomNav: React.FC<{ disabled?: boolean; hiddenItems?: Section[] }> = ({ disabled = false, hiddenItems = [] }) => {
  const { activeSection, setActiveSection } = useShell();

  return (
    <div className="border-t border-slate-200 bg-white/95 backdrop-blur-xl px-2 pb-safe pt-2">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-1">
        {QUICK_NAV.filter((item) => !hiddenItems.includes(item.id)).map((item) => {
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

const ScreenHeader: React.FC<{
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  stats?: React.ReactNode;
}> = ({ eyebrow, title, description, actions, stats }) => (
  <Card className="border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-sm sm:p-6">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">{description}</p>
        {actions ? <div className="mt-5 flex flex-wrap gap-3">{actions}</div> : null}
      </div>
      {stats ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 lg:min-w-[420px]">{stats}</div> : null}
    </div>
  </Card>
);

const StatCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
    <div className="mt-1 text-lg font-semibold text-slate-950">{value}</div>
  </div>
);

const QuickEntryCard: React.FC<{
  onJoinGame: (code: string) => void;
  onCreateGame: () => void;
}> = ({ onJoinGame, onCreateGame }) => {
  const [gameCode, setGameCode] = useState("");
  const [joinOpen, setJoinOpen] = useState(false);

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
    <Card className="border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mx-auto max-w-xl text-center">
        <Badge className="border-0 bg-slate-900 text-white">Quick Court</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Fast round-robin nights, minus the clutter.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          Start a room, load players, and run both courts from one clean board.
        </p>

        <Button onClick={onCreateGame} className="mt-8 h-14 w-full text-base font-semibold sm:text-lg">
          <PlayCircle className="mr-2 h-5 w-5" />
          Create session
        </Button>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          or
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {!joinOpen ? (
          <Button variant="secondary" className="h-12 w-full text-base font-semibold" onClick={() => setJoinOpen(true)}>
            <LogIn className="mr-2 h-4 w-4" />
            Join with a code
          </Button>
        ) : (
          <div className="space-y-3 text-left">
            <Input
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-character code"
              maxLength={6}
              className="h-12 font-mono text-lg uppercase tracking-[0.3em]"
            />
            <div className="flex gap-3">
              <Button onClick={handleJoin} disabled={gameCode.trim().length !== 6} className="h-12 flex-1 text-base font-semibold">
                Join session
              </Button>
              <Button variant="outline" className="h-12" onClick={() => setJoinOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

const QuickSetupBuilder: React.FC<{
  onBack: () => void;
  onComplete: (config: GameConfig) => void;
}> = ({ onBack, onComplete }) => {
  const [courts, setCourts] = useState(2);
  const [gameDuration, setGameDuration] = useState(15);
  const [totalTime, setTotalTime] = useState(90);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [courtConfigs, setCourtConfigs] = useState<CourtConfig[]>(buildQuickConfig(2, 15, 90).courtConfigs || []);

  useEffect(() => {
    setCourtConfigs((prev) =>
      Array.from({ length: courts }, (_, index) => prev[index] || { courtNumber: index + 1, type: "doubles" as const })
    );
  }, [courts]);

  const toggleCourtType = (courtNumber: number) => {
    setCourtConfigs((prev) =>
      prev.map((config) =>
        config.courtNumber === courtNumber
          ? { ...config, type: config.type === "doubles" ? "singles" : "doubles" }
          : config
      )
    );
  };

  return (
    <div className="space-y-4">
      <ScreenHeader
        eyebrow="Quick Court • Setup"
        title="Set the session in under a minute."
        description="Round-robin is locked in. Just choose courts, game length, and total session time."
      />

      <Card className="border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="space-y-6">
          <ConfigRow label="Courts" hint="How many courts are live tonight?">
            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
              {COURT_OPTIONS.map((value) => (
                <ChipButton key={value} active={courts === value} onClick={() => setCourts(value)}>
                  {value}
                </ChipButton>
              ))}
            </div>
          </ConfigRow>

          <ConfigRow label="Game length" hint="Keep the queue moving.">
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((value) => (
                <ChipButton key={value} active={gameDuration === value} onClick={() => setGameDuration(value)}>
                  {value} min
                </ChipButton>
              ))}
            </div>
          </ConfigRow>

          <ConfigRow label="Session length" hint="Total play time before wrap-up.">
            <div className="flex flex-wrap gap-2">
              {TOTAL_TIME_OPTIONS.map((value) => (
                <ChipButton key={value} active={totalTime === value} onClick={() => setTotalTime(value)}>
                  {value % 60 === 0 ? `${value / 60}h` : `${Math.floor(value / 60)}.5h`}
                </ChipButton>
              ))}
            </div>
          </ConfigRow>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <button
              type="button"
              className="flex w-full items-center justify-between text-left"
              onClick={() => setAdvancedOpen((open) => !open)}
            >
              <div>
                <div className="text-sm font-semibold text-slate-900">More options</div>
                <div className="mt-1 text-sm text-slate-500">Optional court-by-court singles or doubles mix.</div>
              </div>
              {advancedOpen ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
            </button>

            {advancedOpen ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {courtConfigs.map((config) => (
                  <div key={config.courtNumber} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-semibold text-slate-900">Court {getCourtLetter(config.courtNumber)}</div>
                    <div className="mt-3 flex gap-2">
                      <ChipButton active={config.type === "doubles"} onClick={() => toggleCourtType(config.courtNumber)}>
                        Doubles
                      </ChipButton>
                      <ChipButton active={config.type === "singles"} onClick={() => toggleCourtType(config.courtNumber)}>
                        Singles
                      </ChipButton>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" className="h-12 sm:min-w-[120px]" onClick={onBack}>
              Back
            </Button>
            <Button className="h-12 flex-1 text-base font-semibold" onClick={() => onComplete(buildQuickConfig(courts, gameDuration, totalTime, courtConfigs))}>
              Generate room
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

const ConfigRow: React.FC<{ label: string; hint: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div>
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        <div className="text-sm text-slate-500">{hint}</div>
      </div>
    </div>
    <div className="mt-3">{children}</div>
  </div>
);

const ChipButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "inline-flex min-h-11 items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition",
      active ? "border-slate-900 bg-slate-900 text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
    )}
  >
    {children}
  </button>
);

const QuickPlayersScreen: React.FC<{
  players: string[];
  matches: Match[];
  matchScores: Map<string, { team1: number; team2: number }>;
  gameCode: string;
  gameConfig: GameConfig;
  onPlayersChange: (players: string[], pairs?: { player1: string; player2: string }[]) => void;
  onPlayersUpdate: (players: string[], pairs?: { player1: string; player2: string }[]) => Promise<boolean>;
}> = ({ players, matches, matchScores, gameCode, gameConfig, onPlayersChange, onPlayersUpdate }) => {
  const completedMatches = matchScores.size;
  const teammatePairs = gameConfig.teammatePairs || [];
  const ready = players.length >= 4;

  return (
    <div className="space-y-4">
      <ScreenHeader
        eyebrow="Quick Court • Players"
        title="Load the roster, then push it live."
        description="Bulk paste works, walk-ins stay easy, and locked teammate pairs still feed the same scheduling engine underneath."
        stats={
          <>
            <StatCard label="Code" value={gameCode} />
            <StatCard label="Players" value={String(players.length)} />
            <StatCard label="Courts" value={String(gameConfig.courts)} />
            <StatCard label="Completed" value={String(completedMatches)} />
          </>
        }
      />

      <Card className="border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {players.length} players loaded{teammatePairs.length > 0 ? ` · ${teammatePairs.length} locked pair${teammatePairs.length === 1 ? "" : "s"}` : ""}
          </div>
          <div className="font-medium text-slate-800">{ready ? "Ready to load courts" : "Add at least 4 players for proper court rotation"}</div>
        </div>
      </Card>

      <Card className="border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <PlayerSetup
          onPlayersChange={onPlayersChange}
          onComplete={async (playerList, pairs) => {
            await onPlayersUpdate(playerList, pairs);
          }}
          initialPlayers={players}
          initialTeammatePairs={teammatePairs}
          matches={matches as any}
          matchScores={matchScores}
          hasStartedMatches={matches.length > 0}
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
        <div className="mt-3 space-y-2 text-sm">
          <div className="font-medium">{match.team1.join(" + ")}</div>
          <div className="text-xs font-semibold opacity-70">vs</div>
          <div className="font-medium">{match.team2.join(" + ")}</div>
        </div>
        <div className="mt-3 text-xs opacity-70">Slot {match.startTime} min</div>
      </>
    ) : (
      <div className="mt-2 text-sm opacity-70">Nothing queued here yet.</div>
    )}
  </div>
);

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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [waitingOpen, setWaitingOpen] = useState(false);

  const board = useMemo(() => {
    const courtIds = Array.from({ length: gameConfig.courts }, (_, index) => index + 1);
    const liveByCourt = new Map<number, Match>();
    const nextByCourt = new Map<number, Match>();
    const upcoming: Match[] = [];

    courtIds.forEach((court) => {
      const queue = matches.filter((match) => match.court === court && !matchScores.has(match.id));
      if (queue[0]) liveByCourt.set(court, queue[0]);
      if (queue[1]) nextByCourt.set(court, queue[1]);
      queue.slice(1, 3).forEach((match) => upcoming.push(match));
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

    return stats.sort((a, b) => b.rate - a.rate || b.wins - a.wins).slice(0, 5);
  }, [matchScores, matches, players]);

  return (
    <div className="space-y-4">
      <ScreenHeader
        eyebrow="Quick Court • Courts"
        title="Run both courts from one board."
        description="Now and next stay visible up top. Detailed score entry and schedule controls are still here, just not stealing the whole screen."
        actions={
          <>
            <Button variant="secondary" className="bg-white" onClick={onShowPlayerSelector}>
              <UserCircle className="mr-2 h-4 w-4" />
              Find my matches
            </Button>
          </>
        }
        stats={
          <>
            <StatCard label="Courts" value={String(gameConfig.courts)} />
            <StatCard label="Players" value={String(players.length)} />
            <StatCard label="Waiting" value={String(board.waitingPlayers.length)} />
            <StatCard label="Left" value={String(Math.max(matches.length - matchScores.size, 0))} />
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
          {board.courtIds.map((court) => {
            const live = board.liveByCourt.get(court);
            const next = board.nextByCourt.get(court);
            return (
              <Card key={court} className="border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Court {getCourtLetter(court)}</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">{live ? "Live now" : "Standing by"}</div>
                  </div>
                  <Badge className={cn("border-0", live ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700")}>
                    {live ? "Live" : "Open"}
                  </Badge>
                </div>
                <div className="mt-4 space-y-3">
                  <MiniMatchCard title="Now" match={live} tone="live" />
                  <MiniMatchCard title="Next" match={next} tone="queue" />
                </div>
              </Card>
            );
          })}
        </div>

        <div className="space-y-4">
          <Card className="border-slate-200 bg-white p-5 shadow-sm">
            <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setWaitingOpen((open) => !open)}>
              <div>
                <div className="flex items-center gap-2 text-slate-900">
                  <Users className="h-5 w-5" />
                  <h3 className="font-semibold">Bench / waiting</h3>
                </div>
                <p className="mt-2 text-sm text-slate-600">Who is free right now and not already queued next.</p>
              </div>
              {waitingOpen ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
            </button>

            {waitingOpen ? (
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
            ) : null}
          </Card>

          <Card className="border-slate-200 bg-white p-5 shadow-sm">
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
              {board.upcoming.length === 0 ? <div className="text-sm text-slate-500">No extra queue beyond the live pairings yet.</div> : null}
            </div>
          </Card>

          <Card className="border-slate-200 bg-white p-5 shadow-sm">
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
              )) : <div className="text-sm text-slate-500">No scores yet — the table wakes up after the first finished game.</div>}
            </div>
          </Card>
        </div>
      </div>

      <Card className="border-slate-200 bg-white p-4 shadow-sm">
        <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setDetailsOpen((open) => !open)}>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Detailed controls</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">Score entry and schedule controls</h3>
            <p className="mt-2 text-sm text-slate-600">Same underlying Quick Court engine, tucked below the live board instead of dominating it.</p>
          </div>
          {detailsOpen ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
        </button>

        {detailsOpen ? (
          <div className="mt-4">
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
          </div>
        ) : null}
      </Card>
    </div>
  );
};

const QuickWrapScreen: React.FC<{
  players: string[];
  matches: Match[];
  matchScores: Map<string, { team1: number; team2: number }>;
}> = ({ players, matches, matchScores }) => (
  <div className="space-y-4">
    <ScreenHeader
      eyebrow="Quick Court • Wrap"
      title="Leaderboard and recap, together."
      description="No separate leaderboard tab and no separate history ceremony. Just standings up top and the night’s results below."
      actions={
        <div className="inline-flex items-center gap-2">
          <Share2 className="h-4 w-4 text-slate-500" />
          <ShareButton />
        </div>
      }
      stats={
        <>
          <StatCard label="Players" value={String(players.length)} />
          <StatCard label="Matches" value={String(matches.length)} />
          <StatCard label="Completed" value={String(matchScores.size)} />
          <StatCard label="Remaining" value={String(Math.max(matches.length - matchScores.size, 0))} />
        </>
      }
    />

    <Leaderboard players={players} matches={matches as any} matchScores={matchScores} />
    <MatchHistory matches={matches as any} matchScores={matchScores} />
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

  const lastAutoSectionRef = useRef<Section | null>(null);

  useEffect(() => {
    const targetSection: Section = state.matches.length > 0 ? "matches" : state.gameConfig ? "players" : "setup";

    if (lastAutoSectionRef.current !== targetSection) {
      setActiveSection(targetSection);
      lastAutoSectionRef.current = targetSection;
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
      setActiveSection("matches");
      return true;
    } catch {
      toast.error("Failed to refresh session");
      return false;
    }
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

  const hiddenNavItems: Section[] = [];
  if (!state.gameConfig) hiddenNavItems.push("players", "matches", "history");
  else if (state.matches.length === 0) hiddenNavItems.push("matches", "history");

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
      bottomNav={<QuickCourtBottomNav hiddenItems={hiddenNavItems} />}
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

        <div className="space-y-4 px-1 pt-4">
          {activeSection === "setup" && !state.gameConfig && !isSetupDraftOpen && (
            <QuickEntryCard onJoinGame={joinExistingGame} onCreateGame={createNewGame} />
          )}

          {activeSection === "setup" && !state.gameConfig && isSetupDraftOpen && (
            <QuickSetupBuilder onBack={() => setIsSetupDraftOpen(false)} onComplete={handleSetupComplete} />
          )}

          {activeSection === "players" && state.gameCode && state.gameConfig && (
            <QuickPlayersScreen
              players={state.players}
              matches={state.matches}
              matchScores={state.matchScores}
              gameCode={state.gameCode}
              gameConfig={state.gameConfig}
              onPlayersChange={handlePlayersChange}
              onPlayersUpdate={handlePlayersUpdate}
            />
          )}

          {activeSection === "matches" && state.gameConfig && (
            <div className="space-y-4">
              {state.matches.length === 0 ? (
                <Card className="border-slate-200 bg-white p-6 shadow-sm">
                  <div className="max-w-2xl">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">No courts yet</p>
                    <h2 className="mt-1 text-2xl font-semibold text-slate-900">Load the schedule from Players first.</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Quick Court doesn’t expose an empty legacy schedule anymore. Add tonight’s players, then generate the live board there.
                    </p>
                    <Button className="mt-4" onClick={() => setActiveSection("players")}>Back to players</Button>
                  </div>
                </Card>
              ) : isPlayerView && playerName ? (
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

          {activeSection === "history" && state.gameConfig && (
            <QuickWrapScreen players={state.players} matches={state.matches} matchScores={state.matchScores} />
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default QuickCourtVariant;
