import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  Clock3,
  Crown,
  Flame,
  ListOrdered,
  MapPin,
  Sparkles,
  TimerReset,
  UserCircle2,
  Users,
  Waves,
} from "lucide-react";

import { ScheduleView } from "@/components/ScheduleView";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { GameConfig, Match, CourtConfig } from "@/core/types";
import type { PlayerMatchGroups } from "@/hooks/use-player-matches";

interface ClubhouseOrganizerSessionProps {
  matches: Match[];
  gameConfig: GameConfig;
  players: string[];
  matchScores: Map<string, { team1: number; team2: number }>;
  onMatchScoresUpdate: (scores: Map<string, { team1: number; team2: number }>) => void;
  onScheduleUpdate: (matches: Match[], players: string[]) => void;
  onCourtConfigUpdate: (configs: CourtConfig[]) => void;
  onShowPlayerSelector: () => void;
}

interface ClubhousePlayerSessionProps {
  playerName: string;
  matchGroups: PlayerMatchGroups;
  matchScores: Map<string, { team1: number; team2: number }>;
  allMatches: Match[];
  onReleaseIdentity: () => void;
  onSkipMatch: (matchId: string) => void;
}

const getCourtLetter = (court: number) => String.fromCharCode(64 + court);

const getMatchLabel = (match: Match, allMatches: Match[]) => {
  const perCourtIndex = allMatches.filter((m) => m.court === match.court && m.endTime <= match.endTime).length;
  return `${getCourtLetter(match.court)}${perCourtIndex}`;
};

const getPlayersInMatch = (match: Match) => [...match.team1, ...match.team2];

const ClubhouseMatchChip: React.FC<{ match: Match; allMatches: Match[]; emphasis?: "live" | "queue" | "soft" }> = ({
  match,
  allMatches,
  emphasis = "soft",
}) => (
  <div
    className={cn(
      "rounded-2xl border p-3",
      emphasis === "live" && "border-[#204432]/20 bg-[#204432] text-white shadow-lg",
      emphasis === "queue" && "border-[#d7c7ad] bg-[#fff8ee] text-[#2c2117]",
      emphasis === "soft" && "border-[#eadfce] bg-white/80 text-[#5c4b3a]"
    )}
  >
    <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em]">
      <span>{getMatchLabel(match, allMatches)}</span>
      <span>Court {getCourtLetter(match.court)}</span>
    </div>
    <div className="mt-2 text-sm font-medium leading-6">
      {match.team1.join(" · ")} <span className="opacity-60">vs</span> {match.team2.join(" · ")}
    </div>
  </div>
);

export const ClubhouseOrganizerSession: React.FC<ClubhouseOrganizerSessionProps> = ({
  matches,
  gameConfig,
  players,
  matchScores,
  onMatchScoresUpdate,
  onScheduleUpdate,
  onCourtConfigUpdate,
  onShowPlayerSelector,
}) => {
  const { liveByCourt, nextByCourt, waitingPlayers, completedCount, totalCount, busiestCourt } = useMemo(() => {
    const courts = Array.from({ length: gameConfig.courts }, (_, index) => index + 1);
    const live = new Map<number, Match>();
    const next = new Map<number, Match>();

    courts.forEach((court) => {
      const courtMatches = matches.filter((match) => match.court === court && !matchScores.has(match.id));
      if (courtMatches[0]) live.set(court, courtMatches[0]);
      if (courtMatches[1]) next.set(court, courtMatches[1]);
    });

    const playingNow = new Set(Array.from(live.values()).flatMap(getPlayersInMatch));
    const queuedSoon = new Set(Array.from(next.values()).flatMap(getPlayersInMatch));
    const waiting = players.filter((player) => !playingNow.has(player) && !queuedSoon.has(player));

    const busiest = Array.from(live.keys()).sort((a, b) => {
      const aCount = matches.filter((m) => m.court === a).length;
      const bCount = matches.filter((m) => m.court === b).length;
      return bCount - aCount;
    })[0] ?? 1;

    return {
      liveByCourt: live,
      nextByCourt: next,
      waitingPlayers: waiting,
      completedCount: matchScores.size,
      totalCount: matches.length,
      busiestCourt: busiest,
    };
  }, [gameConfig.courts, matchScores, matches, players]);

  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden border-[#d7c7ad] bg-[linear-gradient(135deg,#fffaf3_0%,#f4e7d2_58%,#dbe9df_100%)] p-5 text-[#2c2117] shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#6b5945]">
                <Crown className="h-3.5 w-3.5 text-[#204432]" />
                Organizer board
              </div>
              <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">Run the room, not just the schedule.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#5c4b3a] sm:text-base">
                Clubhouse turns the active session into a social control room: live courts, who is queued, who is cooling off,
                and a faster path to player-specific views.
              </p>
            </div>

            <div className="grid min-w-[220px] gap-2 rounded-[1.5rem] border border-white/70 bg-white/80 p-3 text-sm shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#7b6753]">Live pace</span>
                <span className="font-semibold text-[#204432]">{progress}% complete</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#eadfce]">
                <div className="h-full rounded-full bg-[#204432] transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs text-[#7b6753]">
                <span>{completedCount}/{totalCount} matches done</span>
                <span>Busiest court: {getCourtLetter(busiestCourt)}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={onShowPlayerSelector} className="bg-[#204432] text-white hover:bg-[#183726]">
              <UserCircle2 className="mr-2 h-4 w-4" />
              Jump into player mode
            </Button>
            <Badge variant="secondary" className="bg-white/75 px-3 py-2 text-[#5c4b3a]">Next-up and waiting players surfaced first</Badge>
          </div>
        </Card>

        <Card className="border-[#d7c7ad] bg-[#204432] p-5 text-white shadow-sm">
          <div className="flex items-center gap-2 text-amber-100">
            <Flame className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Floor pulse</h3>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-white/60">Playing now</div>
              <div className="mt-2 text-3xl font-semibold">{liveByCourt.size}</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-white/60">Queued next</div>
              <div className="mt-2 text-3xl font-semibold">{nextByCourt.size}</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-white/60">Breathing room</div>
              <div className="mt-2 text-3xl font-semibold">{waitingPlayers.length}</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-[#d7c7ad] bg-white/90 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#8b7152]">Court orchestration</p>
              <h3 className="mt-1 text-xl font-semibold text-[#2c2117]">Live courts with visible next-up handoff</h3>
            </div>
            <Badge variant="secondary" className="bg-[#f3e6d1] text-[#6d5a48]">Session-first hierarchy</Badge>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {Array.from({ length: gameConfig.courts }, (_, index) => index + 1).map((court) => {
              const live = liveByCourt.get(court);
              const next = nextByCourt.get(court);
              return (
                <div key={court} className="rounded-[1.5rem] border border-[#eadfce] bg-[#fffaf3] p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-[#8b7152]">Court {getCourtLetter(court)}</div>
                      <div className="mt-1 text-lg font-semibold text-[#2c2117]">{live ? "Live match on floor" : "Court waiting"}</div>
                    </div>
                    <div className="rounded-full bg-[#204432]/10 px-3 py-1 text-xs font-medium text-[#204432]">
                      {live ? "Active" : "Standby"}
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {live ? <ClubhouseMatchChip match={live} allMatches={matches} emphasis="live" /> : <div className="rounded-2xl border border-dashed border-[#d7c7ad] px-4 py-6 text-sm text-[#7b6753]">No live match assigned yet.</div>}
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#8b7152]">
                        <ArrowRight className="h-3.5 w-3.5" />
                        Next up
                      </div>
                      {next ? <ClubhouseMatchChip match={next} allMatches={matches} emphasis="queue" /> : <div className="rounded-2xl border border-[#eadfce] bg-white/80 px-3 py-3 text-sm text-[#7b6753]">No queued follow-up on this court.</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="border-[#d7c7ad] bg-white/90 p-5">
            <div className="flex items-center gap-2 text-[#204432]">
              <ListOrdered className="h-5 w-5" />
              <h3 className="font-semibold text-[#2c2117]">Waiting lounge</h3>
            </div>
            <p className="mt-2 text-sm text-[#6d5a48]">Players not on court and not in the immediate queue. This makes pacing visible instead of buried in future cards.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {waitingPlayers.length > 0 ? waitingPlayers.map((player) => (
                <Badge key={player} variant="secondary" className="rounded-full bg-[#f7efe1] px-3 py-1.5 text-[#5c4b3a]">{player}</Badge>
              )) : <div className="rounded-2xl bg-[#f7efe1] px-3 py-3 text-sm text-[#7b6753]">Everyone is either playing or in the next-up queue.</div>}
            </div>
          </Card>

          <Card className="border-[#d7c7ad] bg-white/90 p-5">
            <div className="flex items-center gap-2 text-[#204432]">
              <Sparkles className="h-5 w-5" />
              <h3 className="font-semibold text-[#2c2117]">Why this feels different</h3>
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#6d5a48]">
              <li>• Live/next/waiting hierarchy before score-entry detail</li>
              <li>• Organizer board reads like a club floor manager, not a raw schedule</li>
              <li>• Player identity entry stays one tap away</li>
            </ul>
          </Card>
        </div>
      </div>

      <Card className="border-[#d7c7ad] bg-white/90 p-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3 px-2 pt-1">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#8b7152]">Score entry & edits</p>
            <h3 className="text-xl font-semibold text-[#2c2117]">Detailed court controls stay intact below</h3>
          </div>
          <Badge variant="secondary" className="bg-[#f7efe1] text-[#6d5a48]">Existing scoring logic preserved</Badge>
        </div>
        <ScheduleView
          matches={matches as any}
          onBack={() => {}}
          gameConfig={gameConfig as any}
          allPlayers={players}
          onScheduleUpdate={(updatedMatches, updatedPlayers) => onScheduleUpdate(updatedMatches as Match[], updatedPlayers)}
          matchScores={matchScores}
          onMatchScoresUpdate={onMatchScoresUpdate}
          onCourtConfigUpdate={(configs) => onCourtConfigUpdate(configs as CourtConfig[])}
          isPlayerView={false}
          onReleaseIdentity={() => {}}
          onShowPlayerSelector={onShowPlayerSelector}
        />
      </Card>
    </div>
  );
};

export const ClubhousePlayerSession: React.FC<ClubhousePlayerSessionProps> = ({
  playerName,
  matchGroups,
  matchScores,
  allMatches,
  onReleaseIdentity,
  onSkipMatch,
}) => {
  const [showLater, setShowLater] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const totalMatches = (matchGroups.current ? 1 : 0) + matchGroups.upNext.length + matchGroups.later.length + matchGroups.completed.length;
  const nextMatch = matchGroups.current ?? matchGroups.upNext[0] ?? matchGroups.later[0] ?? null;

  const renderPlayerCard = (match: Match, state: "current" | "upnext" | "later" | "completed") => {
    const team1HasPlayer = match.team1.includes(playerName);
    const score = matchScores.get(match.id);
    const isWinner = score && ((team1HasPlayer && score.team1 > score.team2) || (!team1HasPlayer && score.team2 > score.team1));

    return (
      <Card key={`${state}-${match.id}`} className={cn(
        "border p-4",
        state === "current" && "border-[#204432]/20 bg-[linear-gradient(135deg,#204432_0%,#2d5c47_100%)] text-white shadow-lg",
        state === "upnext" && "border-[#e8c57a] bg-[#fff7e5] text-[#2c2117]",
        state === "later" && "border-[#eadfce] bg-white/85 text-[#2c2117]",
        state === "completed" && (isWinner ? "border-[#bdd7c4] bg-[#eef7f0]" : "border-[#eadfce] bg-[#faf5ed]")
      )}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.18em]",
              state === "current" ? "bg-white/15 text-white" : "bg-[#f3e6d1] text-[#6d5a48]"
            )}>
              <MapPin className="h-3.5 w-3.5" />
              {getMatchLabel(match, allMatches)} • Court {getCourtLetter(match.court)}
            </div>
            <h3 className="mt-3 text-lg font-semibold">
              {state === "current" ? "You’re on court now" : state === "upnext" ? "You’re on deck" : state === "later" ? "Coming later" : isWinner ? "Finished strong" : "Completed"}
            </h3>
          </div>
          {score ? (
            <div className={cn(
              "rounded-2xl px-3 py-2 text-right",
              state === "current" ? "bg-white/10" : "bg-white/70"
            )}>
              <div className="text-xs uppercase tracking-[0.18em] opacity-70">Final</div>
              <div className="text-xl font-semibold">{score.team1} - {score.team2}</div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[{ label: "Team 1", team: match.team1 }, { label: "Team 2", team: match.team2 }].map(({ label, team }) => (
            <div key={label} className={cn(
              "rounded-2xl border p-3",
              state === "current" ? "border-white/15 bg-white/10" : "border-[#eadfce] bg-white/70"
            )}>
              <div className="text-xs uppercase tracking-[0.18em] opacity-70">{label}</div>
              <div className="mt-2 space-y-1 text-sm">
                {team.map((player) => (
                  <div key={player} className={cn("font-medium", player === playerName && (state === "current" ? "text-amber-100" : "text-[#204432]"))}>
                    {player === playerName ? "You" : player}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {(state === "current" || state === "upnext") && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant={state === "current" ? "secondary" : "outline"}
              className={cn(state === "current" ? "bg-white text-[#204432]" : "border-[#d7c7ad] bg-white")}
              onClick={() => onSkipMatch(match.id)}
            >
              <TimerReset className="mr-2 h-4 w-4" />
              Sit this one out
            </Button>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-[#d7c7ad] bg-[linear-gradient(135deg,#fff8ef_0%,#f3e4cd_55%,#dbe9df_100%)] p-5 text-[#2c2117] shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#6d5a48]">
              <Waves className="h-3.5 w-3.5 text-[#204432]" />
              Player lane
            </div>
            <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">Your night at the club, distilled.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5c4b3a] sm:text-base">
              This is no longer a generic player filter. It’s a personal pacing view: where you are now, what’s next, and how the night is unfolding for you.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/70 bg-white/80 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-[#8b7152]">Checked in as</div>
            <div className="mt-2 text-2xl font-semibold text-[#204432]">{playerName}</div>
            <Button variant="secondary" className="mt-3 bg-[#204432] text-white hover:bg-[#183726]" onClick={onReleaseIdentity}>
              Organizer board
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/75 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[#8b7152]">Playing now</div>
            <div className="mt-2 text-3xl font-semibold">{matchGroups.current ? "Yes" : "No"}</div>
          </div>
          <div className="rounded-2xl bg-white/75 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[#8b7152]">On deck</div>
            <div className="mt-2 text-3xl font-semibold">{matchGroups.upNext.length}</div>
          </div>
          <div className="rounded-2xl bg-white/75 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[#8b7152]">Done tonight</div>
            <div className="mt-2 text-3xl font-semibold">{matchGroups.completed.length}/{totalMatches || 0}</div>
          </div>
        </div>
      </Card>

      {nextMatch ? (
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            {matchGroups.current ? renderPlayerCard(matchGroups.current, "current") : null}
            {!matchGroups.current && matchGroups.upNext[0] ? renderPlayerCard(matchGroups.upNext[0], "upnext") : null}
          </div>

          <Card className="border-[#d7c7ad] bg-white/90 p-5">
            <div className="flex items-center gap-2 text-[#204432]">
              <Clock3 className="h-5 w-5" />
              <h3 className="font-semibold text-[#2c2117]">Your pacing board</h3>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-[#f7efe1] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[#8b7152]">Immediate status</div>
                <div className="mt-2 text-lg font-semibold text-[#2c2117]">
                  {matchGroups.current ? "Stay on court." : matchGroups.upNext.length > 0 ? "Be ready soon." : "You’ve got breathing room."}
                </div>
              </div>
              <div className="rounded-2xl bg-[#fffaf3] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[#8b7152]">Next matchup</div>
                <div className="mt-2 text-sm leading-6 text-[#5c4b3a]">
                  {nextMatch.team1.join(" · ")} vs {nextMatch.team2.join(" · ")}
                </div>
              </div>
              <div className="rounded-2xl bg-[#eef4ed] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[#6d7d70]">What’s different here</div>
                <div className="mt-2 text-sm leading-6 text-[#46604f]">
                  One clear card for your current rhythm, instead of dropping you into the organizer’s full-court schedule.
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="border-[#d7c7ad] bg-white/90 p-8 text-center text-[#6d5a48]">No upcoming matches right now.</Card>
      )}

      {matchGroups.upNext.length > (matchGroups.current ? 1 : 0) && (
        <Card className="border-[#d7c7ad] bg-white/90 p-4">
          <div className="mb-3 text-sm font-semibold text-[#2c2117]">Also coming up</div>
          <div className="grid gap-3 md:grid-cols-2">
            {matchGroups.upNext.slice(matchGroups.current ? 1 : 0).map((match) => renderPlayerCard(match, "upnext"))}
          </div>
        </Card>
      )}

      {matchGroups.later.length > 0 && (
        <Card className="border-[#d7c7ad] bg-white/90 p-4">
          <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setShowLater((value) => !value)}>
            <span className="text-sm font-semibold text-[#2c2117]">Later tonight ({matchGroups.later.length})</span>
            <Badge variant="secondary" className="bg-[#f7efe1] text-[#6d5a48]">{showLater ? "Hide" : "Show"}</Badge>
          </button>
          {showLater ? <div className="mt-4 grid gap-3 md:grid-cols-2">{matchGroups.later.map((match) => renderPlayerCard(match, "later"))}</div> : null}
        </Card>
      )}

      {matchGroups.completed.length > 0 && (
        <Card className="border-[#d7c7ad] bg-white/90 p-4">
          <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setShowCompleted((value) => !value)}>
            <span className="text-sm font-semibold text-[#2c2117]">Completed ({matchGroups.completed.length})</span>
            <Badge variant="secondary" className="bg-[#f7efe1] text-[#6d5a48]">{showCompleted ? "Hide" : "Show"}</Badge>
          </button>
          {showCompleted ? <div className="mt-4 grid gap-3 md:grid-cols-2">{matchGroups.completed.map((match) => renderPlayerCard(match, "completed"))}</div> : null}
        </Card>
      )}
    </div>
  );
};
