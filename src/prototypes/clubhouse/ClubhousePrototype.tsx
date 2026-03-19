import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowRight,
  Award,
  Building2,
  CalendarDays,
  Crown,
  Heart,
  Sparkles,
  UserCircle2,
  Users,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GameCodeDialog } from "@/components/GameCodeDialog";
import { PlayerIdentitySelector } from "@/components/PlayerIdentitySelector";
import { supabase } from "@/integrations/supabase/client";
import { safeStorage } from "@/lib/safe-storage";
import { setSkipNextMatch } from "@/lib/player-identity";
import { debugLogger } from "@/lib/debug-logger";
import { AppShell, useShell } from "@/shell";
import { usePlayerIdentity } from "@/hooks/use-player-identity";
import { usePlayerMatches } from "@/hooks/use-player-matches";
import { usePlayerNotifications } from "@/hooks/use-player-notifications";
import { generateSchedule, type CourtConfig } from "@/lib/scheduler";
import type { GameConfig, Match, Section } from "@/core/types";
import {
  ClassicHistoryView,
  ClassicLeaderboardView,
  ClassicMatchesView,
  ClassicMyMatchesView,
  ClassicPlayersView,
  ClassicSetupView,
} from "@/variants/classic/components";

const NAV_ITEMS: Array<{ section: Section; label: string; shortLabel: string }> = [
  { section: "setup", label: "Home", shortLabel: "Home" },
  { section: "players", label: "Members", shortLabel: "Crew" },
  { section: "matches", label: "Sessions", shortLabel: "Play" },
  { section: "leaderboard", label: "Ladder", shortLabel: "Ladder" },
  { section: "history", label: "Recap", shortLabel: "Recap" },
];

const useClubhouseGameState = () => {
  const [players, setPlayers] = useState<string[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameCode, setGameCode] = useState("");
  const [setupComplete, setSetupComplete] = useState(false);
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

  const syncMatchScoresFromMatches = useCallback((loadedMatches: Match[]) => {
    const next = new Map<string, { team1: number; team2: number }>();
    loadedMatches.forEach((match) => {
      if (match.score) next.set(match.id, match.score);
    });
    setMatchScores(next);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (!error) setUserId(data.user?.id || null);
      } else {
        setUserId(session.user.id);
      }
    };

    initAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId || restoringRef.current) return;

    const restore = async () => {
      restoringRef.current = true;
      const savedGameId = safeStorage.getItem("clubhouse_game_id");
      const savedGameCode = safeStorage.getItem("clubhouse_game_code");

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
            setSetupComplete(!!data.game_config);
          } else {
            safeStorage.removeItem("clubhouse_game_id");
            safeStorage.removeItem("clubhouse_game_code");
          }
        } catch (err) {
          debugLogger.log("error", "Clubhouse restore failed", err);
          safeStorage.removeItem("clubhouse_game_id");
          safeStorage.removeItem("clubhouse_game_code");
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
      .channel(`clubhouse-updates-${gameId}`)
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
    players, setPlayers,
    matches, setMatches,
    gameConfig, setGameConfig,
    gameId, setGameId,
    gameCode, setGameCode,
    setupComplete, setSetupComplete,
    matchScores, setMatchScores,
    userId,
    isRestoringSession,
    sanitizeMatches,
    syncMatchScoresFromMatches,
  };
};

const ClubhouseNavigation: React.FC<{ activeSection: Section; onSelect: (section: Section) => void; disabled?: boolean }> = ({
  activeSection,
  onSelect,
  disabled,
}) => {
  return (
    <div className="border-t border-amber-950/10 bg-[#f4ede2]/95 px-2 pb-safe pt-2 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-1">
        {NAV_ITEMS.map((item) => {
          const active = item.section === activeSection;
          return (
            <button
              key={item.section}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(item.section)}
              className={`flex min-h-12 flex-1 flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-medium transition ${
                active
                  ? "bg-[#204432] text-white shadow-lg"
                  : "text-[#6f6255] hover:bg-white/60"
              } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
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

const ClubhouseHeader: React.FC<{
  gameCode: string;
  playerCount: number;
  completedMatches: number;
  activeSection: Section;
  isPlayerView: boolean;
  playerName: string | null;
  onExitPlayerView: () => void;
}> = ({ gameCode, playerCount, completedMatches, activeSection, isPlayerView, playerName, onExitPlayerView }) => {
  const sectionCopy = {
    setup: "Tonight at the club",
    players: "Members & check-in",
    matches: "Session board",
    leaderboard: "Club ladder",
    history: "Night recap",
  } as const;

  return (
    <div className="px-1 pb-4 pt-4 sm:pt-6">
      <div className="rounded-[2rem] border border-[#d9c8ad] bg-[linear-gradient(135deg,#f8f2e8_0%,#eedfc7_42%,#d7eadb_100%)] p-5 text-[#2c2117] shadow-[0_30px_80px_rgba(58,39,17,0.12)] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/65 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-[#765f44]">
              <Building2 className="h-3.5 w-3.5" />
              Clubhouse prototype
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">A warmer, recurring-play shell for PickleMatch.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5c4b3a] sm:text-base">
              The same round-robin engine, join codes, realtime sync, and player-notification flow — reframed as a community night with a roster, a ladder, and a social home base.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[350px]">
            <div className="rounded-2xl bg-white/70 p-3 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-[#8b7152]">Session code</div>
              <div className="mt-1 text-lg font-semibold">{gameCode || "Start one"}</div>
            </div>
            <div className="rounded-2xl bg-white/70 p-3 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-[#8b7152]">Members here</div>
              <div className="mt-1 text-lg font-semibold">{playerCount}</div>
            </div>
            <div className="rounded-2xl bg-white/70 p-3 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-[#8b7152]">Finished matches</div>
              <div className="mt-1 text-lg font-semibold">{completedMatches}</div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs sm:text-sm">
          <Badge className="border-0 bg-[#204432] text-white">{sectionCopy[activeSection]}</Badge>
          <Badge variant="secondary" className="bg-white/75 text-[#5c4b3a]">Recurring session vibe</Badge>
          <Badge variant="secondary" className="bg-white/75 text-[#5c4b3a]">Player identity forward</Badge>
          {isPlayerView && playerName ? (
            <Button size="sm" variant="secondary" className="bg-white/80" onClick={onExitPlayerView}>
              Viewing as {playerName} • organizer mode
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const ClubhouseHomePanel: React.FC<{
  gameCode: string;
  players: string[];
  matches: Match[];
  matchScores: Map<string, { team1: number; team2: number }>;
  onJump: (section: Section) => void;
  onShowPlayerSelector: () => void;
}> = ({ gameCode, players, matches, matchScores, onJump, onShowPlayerSelector }) => {
  const nextMatch = matches.find((match) => !matchScores.has(match.id));
  const standoutMembers = useMemo(() => players.slice(0, 4), [players]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="overflow-hidden border-[#d7c7ad] bg-[linear-gradient(135deg,#fffdf9_0%,#f7efe1_100%)] p-6 text-[#2c2117] shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#204432]/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-[#204432]">
                <Sparkles className="h-3.5 w-3.5" />
                Welcome back to the club
              </div>
              <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">Make tonight feel like a standing session, not a utility screen.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#5c4b3a] sm:text-base">
                Clubhouse pushes the social layer to the front: who is here, who is on next, how the ladder is moving, and how quickly players can jump into a personal view.
              </p>
            </div>
            <div className="rounded-3xl border border-white/80 bg-white/80 p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-[#8b7152]">Tonight's session</div>
              <div className="mt-2 text-3xl font-semibold">{gameCode || "No code yet"}</div>
              <div className="mt-2 text-sm text-[#6d5a48]">Shared code keeps the existing join flow intact.</div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => onJump(gameCode ? "players" : "setup")}>
              {gameCode ? "Open tonight's roster" : "Start a club session"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="secondary" className="bg-white" onClick={onShowPlayerSelector}>
              <UserCircle2 className="mr-2 h-4 w-4" />
              I'm playing tonight
            </Button>
          </div>
        </Card>

        <Card className="border-[#d7c7ad] bg-[#204432] p-6 text-white shadow-sm">
          <div className="flex items-center gap-2 text-amber-200">
            <CalendarDays className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Who's on next</h3>
          </div>
          {nextMatch ? (
            <div className="mt-4 space-y-3 rounded-3xl bg-white/10 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-white/60">Court {nextMatch.court}</div>
              <div className="text-sm text-white/80">{nextMatch.team1.join(" & ")} vs {nextMatch.team2.join(" & ")}</div>
              <Button size="sm" variant="secondary" className="bg-white text-[#204432]" onClick={() => onJump("matches")}>
                Open session board
              </Button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-white/75">No session board yet. Start with setup, then bring members in.</p>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-[#d7c7ad] bg-white/90 p-5 text-[#2c2117]">
          <div className="flex items-center gap-2 text-[#204432]">
            <Users className="h-5 w-5" />
            <h3 className="font-semibold">Regular crew</h3>
          </div>
          <div className="mt-4 grid gap-3">
            {standoutMembers.length > 0 ? standoutMembers.map((player, index) => (
              <div key={player} className="flex items-center justify-between rounded-2xl bg-[#f7efe1] px-3 py-2">
                <div>
                  <div className="font-medium">{player}</div>
                  <div className="text-xs text-[#7b6753]">{index === 0 ? "Played last week" : "Checked into the club"}</div>
                </div>
                <div className="flex items-center gap-1 text-amber-500">
                  {Array.from({ length: 3 + (index % 3) }).map((_, i) => <Heart key={i} className="h-3.5 w-3.5 fill-current" />)}
                </div>
              </div>
            )) : <p className="text-sm text-[#7b6753]">Add a few members and this becomes a warm roster card wall instead of a blank admin list.</p>}
          </div>
        </Card>

        <Card className="border-[#d7c7ad] bg-white/90 p-5 text-[#2c2117]">
          <div className="flex items-center gap-2 text-[#204432]">
            <Crown className="h-5 w-5" />
            <h3 className="font-semibold">Ladder framing</h3>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#6d5a48]">
            Same standings data underneath. Different story on top: rivals, regulars, momentum, and who owns the night.
          </p>
          <Button variant="secondary" className="mt-4 bg-[#f7efe1]" onClick={() => onJump("leaderboard")}>View the ladder</Button>
        </Card>

        <Card className="border-[#d7c7ad] bg-white/90 p-5 text-[#2c2117]">
          <div className="flex items-center gap-2 text-[#204432]">
            <Award className="h-5 w-5" />
            <h3 className="font-semibold">What changed visibly</h3>
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[#6d5a48]">
            <li>• Warm club palette instead of generic tournament UI</li>
            <li>• Home/Members/Sessions/Ladder/Recap navigation</li>
            <li>• Session board and player CTA pulled to the top</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

const ClubhousePrototype: React.FC = () => {
  const { activeSection, setActiveSection } = useShell();
  const [showGameCodeDialog, setShowGameCodeDialog] = useState(true);
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const state = useClubhouseGameState();
  const { players, matches, gameConfig, gameId, gameCode, matchScores, setMatchScores } = state;

  const { playerName, isPlayerView, claimIdentity, releaseIdentity } = usePlayerIdentity(gameId);
  const playerMatches = usePlayerMatches(matches as any, playerName, matchScores);
  usePlayerNotifications(matches as any, playerName, gameId, matchScores);

  useEffect(() => {
    if (isPlayerView) {
      const interval = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(interval);
    }
  }, [isPlayerView]);

  useEffect(() => {
    const joinMode = new URLSearchParams(window.location.search).get("mode");
    if (joinMode === "player") setShowPlayerSelector(true);
  }, []);

  const completedMatches = matchScores.size;

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
      state.setSetupComplete(!!data.game_config);

      safeStorage.setItem("clubhouse_game_id", data.id);
      safeStorage.setItem("clubhouse_game_code", data.game_code);
      setShowGameCodeDialog(false);
      setActiveSection("setup");
      toast.success(`Joined club night: ${code}`);
    } catch {
      toast.error("Failed to join game");
    }
  };

  const createNewGame = () => {
    safeStorage.removeItem("clubhouse_game_id");
    safeStorage.removeItem("clubhouse_game_code");
    setShowGameCodeDialog(false);
    setActiveSection("setup");
  };

  const startNewSession = () => {
    safeStorage.removeItem("clubhouse_game_id");
    safeStorage.removeItem("clubhouse_game_code");
    state.setPlayers([]);
    state.setMatches([]);
    state.setGameConfig(null);
    state.setGameId(null);
    state.setGameCode("");
    state.setSetupComplete(false);
    setMatchScores(new Map());
    setShowGameCodeDialog(false);
    setActiveSection("setup");
    toast.success("Fresh club session started");
  };

  const handleSetupComplete = async (config: GameConfig) => {
    if (!state.userId) {
      toast.error("Please wait for authentication");
      return;
    }

    state.setGameConfig(config);
    state.setSetupComplete(true);

    try {
      const { data: codeData } = await supabase.rpc("generate_game_code");
      const newGameCode = codeData as string;
      const { data, error } = await supabase
        .from("games")
        .insert([{ game_code: newGameCode, game_config: config as any, players: [], matches: [], creator_id: state.userId }])
        .select()
        .single();

      if (error) throw error;
      state.setGameId(data.id);
      state.setGameCode(newGameCode);
      safeStorage.setItem("clubhouse_game_id", data.id);
      safeStorage.setItem("clubhouse_game_code", newGameCode);
      toast.success(`Club session created: ${newGameCode}`);
      setActiveSection("players");
    } catch {
      toast.error("Failed to create club session");
    }
  };

  const handlePlayersChange = async (newPlayers: string[], pairs?: { player1: string; player2: string }[]) => {
    state.setPlayers(newPlayers);
    if (!gameConfig || !gameId) return;

    const updatedConfig = { ...gameConfig, teammatePairs: pairs };
    state.setGameConfig(updatedConfig);

    try {
      const { error } = await supabase.from("games").update({ players: newPlayers, game_config: updatedConfig as any }).eq("id", gameId);
      if (error) throw error;
    } catch {
      toast.error("Failed to sync members");
    }
  };

  const handlePlayersUpdate = async (newPlayers: string[], pairs?: { player1: string; player2: string }[]) => {
    state.setPlayers(newPlayers);
    if (!gameConfig || !gameId) return;

    const updatedConfig = { ...gameConfig, teammatePairs: pairs };
    state.setGameConfig(updatedConfig);

    const preservedMatches: Match[] = [];
    const courts = Array.from(new Set(matches.map((m) => m.court)));
    for (const court of courts) {
      const courtMatches = matches.filter((m) => m.court === court);
      const completed = courtMatches.filter((m) => matchScores.has(m.id));
      preservedMatches.push(...completed);
      const currentMatchIndex = courtMatches.findIndex((m) => !matchScores.has(m.id));
      if (currentMatchIndex >= 0) preservedMatches.push(courtMatches[currentMatchIndex]);
    }

    let regenerateFromTime = 0;
    if (preservedMatches.length > 0) {
      regenerateFromTime = Math.max(...preservedMatches.map((m) => m.endTime));
    }

    const newSchedule = generateSchedule(
      newPlayers,
      gameConfig.gameDuration,
      gameConfig.totalTime,
      gameConfig.courts,
      undefined,
      pairs,
      gameConfig.courtConfigs as CourtConfig[] | undefined,
    ) as unknown as Match[];

    const futureMatches = newSchedule.filter((m) => m.startTime >= regenerateFromTime);
    const finalSchedule = state.sanitizeMatches([...preservedMatches, ...futureMatches]);
    state.setMatches(finalSchedule);

    try {
      const { error } = await supabase
        .from("games")
        .update({ players: newPlayers, matches: finalSchedule as any, game_config: updatedConfig as any })
        .eq("id", gameId);
      if (error) throw error;
      toast.success(preservedMatches.length > 0 ? `Roster updated. ${preservedMatches.length} match(es) preserved.` : "Session board generated!");
    } catch {
      toast.error("Failed to update session board");
    }
  };

  const handleScheduleUpdate = async (newMatches: Match[], newPlayers: string[]) => {
    const sanitized = state.sanitizeMatches(newMatches);
    state.setMatches(sanitized);
    state.setPlayers(newPlayers);
    state.syncMatchScoresFromMatches(sanitized);

    if (!gameId) return;

    try {
      const { error } = await supabase.from("games").update({ matches: sanitized as any, players: newPlayers }).eq("id", gameId);
      if (error) throw error;
    } catch {
      toast.error("Failed to update club session");
    }
  };

  const handleCourtConfigUpdate = async (configs: CourtConfig[]) => {
    if (!gameConfig || !gameId) return;
    const updatedConfig = { ...gameConfig, courtConfigs: configs };
    state.setGameConfig(updatedConfig);

    try {
      const { error } = await supabase.from("games").update({ game_config: updatedConfig as any }).eq("id", gameId);
      if (error) throw error;
    } catch {
      toast.error("Failed to update court setup");
    }
  };

  const handleSkipMatch = async (matchId: string) => {
    if (!gameId || !playerName) return;
    try {
      await setSkipNextMatch(gameId, playerName, true);
      toast.success("You've been marked to sit out the next one");
      setTimeout(async () => {
        await setSkipNextMatch(gameId, playerName, false);
      }, 5 * 60 * 1000);
    } catch {
      toast.error("Failed to skip match");
    }
  };

  if (state.isRestoringSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7efe1] text-[#2c2117]">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#204432] text-white shadow-lg">
            <Building2 className="h-8 w-8" />
          </div>
          <p className="text-sm text-[#6d5a48]">Reopening the clubhouse…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fbf7f0_0%,#f5ecdf_40%,#eef4ed_100%)] text-[#2c2117]">
      <AppShell
        hideHeader
        bottomNav={<ClubhouseNavigation activeSection={activeSection} onSelect={setActiveSection} disabled={showGameCodeDialog} />}
      >
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col pb-6">
          <div className="px-1 pt-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm text-[#6d5a48]">
              <Link to="/prototypes" className="inline-flex items-center gap-2 transition hover:text-[#204432]">
                ← Back to prototype lab
              </Link>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 shadow-sm">
                <Badge variant="secondary" className="bg-[#204432] text-white hover:bg-[#204432]">Built first</Badge>
                Shared round-robin engine underneath
              </div>
            </div>
          </div>

          <ClubhouseHeader
            gameCode={gameCode}
            playerCount={players.length}
            completedMatches={completedMatches}
            activeSection={activeSection}
            isPlayerView={isPlayerView}
            playerName={playerName}
            onExitPlayerView={() => {
              releaseIdentity();
              toast.success("Back to organizer mode");
            }}
          />

          <GameCodeDialog open={showGameCodeDialog} onOpenChange={setShowGameCodeDialog} onJoinGame={joinExistingGame} onCreateGame={createNewGame} />

          {showPlayerSelector && (
            <PlayerIdentitySelector
              players={players}
              onSelect={async (name) => {
                await claimIdentity(name);
                setShowPlayerSelector(false);
                toast.success(`You're checked in as ${name}`);
                setActiveSection("matches");
              }}
              onCancel={() => setShowPlayerSelector(false)}
            />
          )}

          <Card className="border-[#d7c7ad] bg-white/80 p-3 shadow-[0_24px_60px_rgba(58,39,17,0.08)] backdrop-blur-sm sm:p-4">
            {activeSection === "setup" && (
              <div className="space-y-5">
                <ClubhouseHomePanel
                  gameCode={gameCode}
                  players={players}
                  matches={matches}
                  matchScores={matchScores}
                  onJump={setActiveSection}
                  onShowPlayerSelector={() => setShowPlayerSelector(true)}
                />
                <div className="rounded-[1.75rem] border border-[#e3d8c6] bg-[#fffaf3] p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[#8b7152]">Club session settings</p>
                      <h2 className="text-xl font-semibold">Start or tune tonight's format</h2>
                    </div>
                    {gameCode ? <Badge variant="secondary" className="bg-[#f1e4cf] text-[#6d5a48]">Code: {gameCode}</Badge> : null}
                  </div>
                  <ClassicSetupView gameCode={gameCode} onComplete={handleSetupComplete} onNewSession={gameId ? startNewSession : undefined} />
                </div>
              </div>
            )}

            {activeSection === "players" && gameCode && (
              <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <Card className="border-[#e3d8c6] bg-[#fffaf3] p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#8b7152]">Members board</p>
                    <h2 className="mt-2 text-xl font-semibold">Who made it tonight?</h2>
                    <p className="mt-3 text-sm leading-6 text-[#6d5a48]">
                      Same check-in system, but framed like a recurring club night: build the roster first, then spin up sessions when the group feels right.
                    </p>
                    <div className="mt-5 rounded-2xl bg-[#f7efe1] p-4 text-sm text-[#6d5a48]">
                      Tip: once the roster is set, jump to Sessions to keep the social board front-and-center.
                    </div>
                  </Card>
                  <ClassicPlayersView
                    gameCode={gameCode}
                    players={players}
                    gameConfig={gameConfig}
                    matches={matches}
                    matchScores={matchScores}
                    onPlayersChange={handlePlayersChange}
                    onPlayersUpdate={handlePlayersUpdate}
                    onNavigateToMatches={() => setActiveSection("matches")}
                  />
                </div>
              </div>
            )}

            {activeSection === "matches" && gameConfig && (
              <div className="space-y-4">
                {!isPlayerView ? (
                  <Card className="border-[#d7c7ad] bg-[linear-gradient(135deg,#204432_0%,#2d5c47_100%)] p-5 text-white">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-amber-100/80">Session board</p>
                        <h2 className="mt-1 text-xl font-semibold">Keep the court energy visible.</h2>
                        <p className="mt-2 text-sm text-white/75">Pull players into identity mode fast, but keep a welcoming overview for the organizer.</p>
                      </div>
                      <Button variant="secondary" className="bg-white text-[#204432]" onClick={() => setShowPlayerSelector(true)}>
                        <UserCircle2 className="mr-2 h-4 w-4" />
                        Find my matches
                      </Button>
                    </div>
                  </Card>
                ) : null}

                {isPlayerView && playerName ? (
                  <ClassicMyMatchesView
                    playerName={playerName}
                    matchGroups={playerMatches}
                    matchScores={matchScores}
                    currentTime={currentTime}
                    allMatches={matches}
                    onReleaseIdentity={() => {
                      releaseIdentity();
                      toast.success("Back to organizer mode");
                    }}
                    onSkipMatch={handleSkipMatch}
                  />
                ) : (
                  <ClassicMatchesView
                    matches={matches}
                    gameConfig={gameConfig}
                    players={players}
                    matchScores={matchScores}
                    onMatchScoresUpdate={setMatchScores}
                    onScheduleUpdate={handleScheduleUpdate}
                    onCourtConfigUpdate={handleCourtConfigUpdate}
                    isPlayerView={isPlayerView}
                    playerName={playerName}
                    onShowPlayerSelector={() => setShowPlayerSelector(true)}
                  />
                )}
              </div>
            )}

            {activeSection === "leaderboard" && (
              <div className="space-y-4">
                <Card className="border-[#d7c7ad] bg-[#fffaf3] p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#8b7152]">Club ladder</p>
                  <h2 className="mt-2 text-xl font-semibold">Momentum, not just stats.</h2>
                  <p className="mt-2 text-sm text-[#6d5a48]">This still uses the existing standings engine. The product difference is the framing: familiar rivals, weekly bragging rights, and a more social language layer.</p>
                </Card>
                <ClassicLeaderboardView players={players} matches={matches} matchScores={matchScores} />
              </div>
            )}

            {activeSection === "history" && (
              <div className="space-y-4">
                <Card className="border-[#d7c7ad] bg-[#fffaf3] p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#8b7152]">Night recap</p>
                  <h2 className="mt-2 text-xl font-semibold">Keep the feeling of a club night after the last ball.</h2>
                  <p className="mt-2 text-sm text-[#6d5a48]">Longer-term, this becomes recurring session memory and player relationships. For now it already reads differently from a generic history tab.</p>
                </Card>
                <ClassicHistoryView matches={matches} matchScores={matchScores} />
              </div>
            )}
          </Card>
        </div>
      </AppShell>
    </div>
  );
};

export default ClubhousePrototype;
