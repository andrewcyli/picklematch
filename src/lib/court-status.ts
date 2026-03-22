/**
 * court-status.ts — Single source of truth for live/next/waiting court state.
 *
 * Each court advances independently to its next unscored match.
 * Player-level constraint: a match cannot go live if any of its players
 * are currently live on another court.
 */

import type { Match } from './scheduler';

export interface CourtStatus {
  /** The earliest live match start time, or null if all scored */
  activeSlotStart: number | null;
  /** Live matches keyed by court number — each court advances independently */
  currentByCourt: Map<number, Match>;
  /** Next matches keyed by court number — next unscored after the live one */
  nextByCourt: Map<number, Match>;
  /** Players not in any live or next match */
  waitingPlayers: string[];
  /** If true, a player appears in multiple live matches — should not happen */
  overlapDetected: boolean;
  /** Names of overlapping players (for diagnostics) */
  overlappingPlayers: string[];
}

/**
 * Derive court status from matches, scores, and player list.
 *
 * Algorithm:
 * 1. Group unscored matches by court, sorted by startTime.
 * 2. Build candidates: each court's earliest unscored match.
 * 3. Greedily assign live matches (earliest startTime first).
 *    A match can go live only if none of its players are already live elsewhere.
 *    If a court's first candidate is blocked, try its next unscored matches.
 * 4. For each court, "next" = next unscored match after the live one.
 * 5. Waiting = players not in any live or next match.
 * 6. Hard guard: detect player overlap in live set.
 */
export function computeCourtStatus(
  matches: Match[],
  matchScores: Map<string, { team1: number; team2: number }>,
  allPlayers: string[],
  courtCount: number,
): CourtStatus {
  const unscoredMatches = matches.filter((m) => !matchScores.has(m.id));

  if (unscoredMatches.length === 0) {
    return {
      activeSlotStart: null,
      currentByCourt: new Map(),
      nextByCourt: new Map(),
      waitingPlayers: [...allPlayers],
      overlapDetected: false,
      overlappingPlayers: [],
    };
  }

  // 1. Group unscored matches by court, sorted by startTime
  const unscoredByCourt = new Map<number, Match[]>();
  for (const m of unscoredMatches) {
    if (!unscoredByCourt.has(m.court)) {
      unscoredByCourt.set(m.court, []);
    }
    unscoredByCourt.get(m.court)!.push(m);
  }
  for (const [, courtMatches] of unscoredByCourt) {
    courtMatches.sort((a, b) => a.startTime - b.startTime);
  }

  // 2. Build candidate courts sorted by their earliest unscored match startTime
  const courtCandidates = Array.from(unscoredByCourt.entries())
    .map(([court, courtMatches]) => ({ court, matches: courtMatches }))
    .sort((a, b) => a.matches[0].startTime - b.matches[0].startTime);

  // 3. Greedily assign live matches — player-level constraint
  const livePlayers = new Set<string>();
  const currentByCourt = new Map<number, Match>();

  for (const { court, matches: courtMatches } of courtCandidates) {
    for (const match of courtMatches) {
      const players = [...match.team1, ...match.team2];
      const blocked = players.some((p) => livePlayers.has(p));
      if (!blocked) {
        currentByCourt.set(court, match);
        players.forEach((p) => livePlayers.add(p));
        break;
      }
    }
  }

  // 4. Next match per court = next unscored match after the live one
  const nextByCourt = new Map<number, Match>();
  for (const { court, matches: courtMatches } of courtCandidates) {
    const liveMatch = currentByCourt.get(court);
    const startIdx = liveMatch
      ? courtMatches.findIndex((m) => m.id === liveMatch.id) + 1
      : 0;
    for (let i = startIdx; i < courtMatches.length; i++) {
      // Next is informational — no player constraint needed
      nextByCourt.set(court, courtMatches[i]);
      break;
    }
  }

  // 5. Waiting = not in live and not in next
  const occupied = new Set<string>();
  currentByCourt.forEach((m) => [...m.team1, ...m.team2].forEach((p) => occupied.add(p)));
  nextByCourt.forEach((m) => [...m.team1, ...m.team2].forEach((p) => occupied.add(p)));
  const waitingPlayers = allPlayers.filter((p) => !occupied.has(p));

  // 6. Hard guard — detect player overlap in live set
  const livePlayerCounts = new Map<string, number>();
  currentByCourt.forEach((m) => {
    [...m.team1, ...m.team2].forEach((p) => {
      livePlayerCounts.set(p, (livePlayerCounts.get(p) || 0) + 1);
    });
  });
  const overlappingPlayers = Array.from(livePlayerCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([name]) => name);

  // activeSlotStart = earliest live match startTime (for backward compat)
  const liveStartTimes = Array.from(currentByCourt.values()).map((m) => m.startTime);
  const activeSlotStart = liveStartTimes.length > 0 ? Math.min(...liveStartTimes) : null;

  return {
    activeSlotStart,
    currentByCourt,
    nextByCourt,
    waitingPlayers,
    overlapDetected: overlappingPlayers.length > 0,
    overlappingPlayers,
  };
}
