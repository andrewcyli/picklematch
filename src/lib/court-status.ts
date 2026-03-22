/**
 * court-status.ts — Single source of truth for live/next/waiting court state.
 *
 * P0 fix: compute ONE global activeSlotStart (the earliest unscored time slot),
 * then derive live/next/waiting from that anchor. This prevents the same player
 * appearing "Live" on two courts simultaneously.
 */

import type { Match } from './scheduler';

export interface CourtStatus {
  /** The global active slot start time (earliest unscored slot), or null if all scored */
  activeSlotStart: number | null;
  /** Live matches keyed by court number — all from the same time slot */
  currentByCourt: Map<number, Match>;
  /** Next matches keyed by court number — all from the next time slot */
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
 * 1. Find all unscored matches.
 * 2. activeSlotStart = min(startTime) across all unscored matches.
 * 3. Live = unscored matches at activeSlotStart (one per court max).
 * 4. Next slot = min(startTime) across unscored matches with startTime > activeSlotStart.
 * 5. Next = unscored matches at nextSlotStart (one per court max).
 * 6. Waiting = allPlayers minus players in live + next.
 * 7. Hard guard: detect if any player appears in multiple live matches.
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

  // 1. Global active slot = earliest unscored startTime
  const activeSlotStart = Math.min(...unscoredMatches.map((m) => m.startTime));

  // 2. Live matches = unscored at activeSlotStart
  const currentByCourt = new Map<number, Match>();
  for (const m of unscoredMatches) {
    if (m.startTime === activeSlotStart && !currentByCourt.has(m.court)) {
      currentByCourt.set(m.court, m);
    }
  }

  // 3. Next slot = next distinct startTime after activeSlotStart among unscored
  const nextSlotCandidates = unscoredMatches
    .filter((m) => m.startTime > activeSlotStart)
    .map((m) => m.startTime);
  const nextSlotStart = nextSlotCandidates.length > 0 ? Math.min(...nextSlotCandidates) : null;

  const nextByCourt = new Map<number, Match>();
  if (nextSlotStart !== null) {
    for (const m of unscoredMatches) {
      if (m.startTime === nextSlotStart && !nextByCourt.has(m.court)) {
        nextByCourt.set(m.court, m);
      }
    }
  }

  // 4. Waiting = not in live and not in next
  const occupied = new Set<string>();
  currentByCourt.forEach((m) => [...m.team1, ...m.team2].forEach((p) => occupied.add(p)));
  nextByCourt.forEach((m) => [...m.team1, ...m.team2].forEach((p) => occupied.add(p)));
  const waitingPlayers = allPlayers.filter((p) => !occupied.has(p));

  // 5. Hard guard — detect player overlap in live set
  const livePlayerCounts = new Map<string, number>();
  currentByCourt.forEach((m) => {
    [...m.team1, ...m.team2].forEach((p) => {
      livePlayerCounts.set(p, (livePlayerCounts.get(p) || 0) + 1);
    });
  });
  const overlappingPlayers = Array.from(livePlayerCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([name]) => name);

  return {
    activeSlotStart,
    currentByCourt,
    nextByCourt,
    waitingPlayers,
    overlapDetected: overlappingPlayers.length > 0,
    overlappingPlayers,
  };
}
