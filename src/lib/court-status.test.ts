import { describe, it, expect } from "vitest";
import { computeCourtStatus } from "./court-status";
import { generateSchedule, Match } from "./scheduler";

function matchPlayers(m: Match): string[] {
  return [...m.team1, ...m.team2];
}

describe("computeCourtStatus — P0 global slot anchoring", () => {
  const GAME_DURATION = 10;
  const TOTAL_TIME = 200;
  const COURTS = 2;

  for (const playerCount of [4, 5, 6, 7, 8]) {
    describe(`${playerCount} players, 2 courts`, () => {
      it("live matches are always from the same time slot", () => {
        const players = Array.from({ length: playerCount }, (_, i) => `P${i + 1}`);
        const matches = generateSchedule(players, GAME_DURATION, TOTAL_TIME, COURTS);
        const scores = new Map<string, { team1: number; team2: number }>();

        // Walk through every scoring step
        const unscoredQueue = matches.filter((m) => !scores.has(m.id));

        for (let step = 0; step < Math.min(unscoredQueue.length, 20); step++) {
          const status = computeCourtStatus(matches, scores, players, COURTS);

          // All live matches must share the same startTime
          const liveStartTimes = new Set<number>();
          status.currentByCourt.forEach((m) => liveStartTimes.add(m.startTime));
          expect(liveStartTimes.size).toBeLessThanOrEqual(1);

          // No player overlap in live set
          expect(status.overlapDetected).toBe(false);
          if (status.overlappingPlayers.length > 0) {
            console.log(`  OVERLAP at step ${step}: ${status.overlappingPlayers.join(", ")}`);
          }

          // Score the first live match to advance
          const firstLive = Array.from(status.currentByCourt.values())[0];
          if (firstLive) {
            scores.set(firstLive.id, { team1: 11, team2: 5 });
          } else {
            break;
          }
        }
      });

      it("no player appears on both courts as Live simultaneously", () => {
        const players = Array.from({ length: playerCount }, (_, i) => `P${i + 1}`);
        const matches = generateSchedule(players, GAME_DURATION, TOTAL_TIME, COURTS);
        const scores = new Map<string, { team1: number; team2: number }>();

        // Check initial state and after scoring each slot
        for (let step = 0; step < 30; step++) {
          const status = computeCourtStatus(matches, scores, players, COURTS);

          const livePlayers: string[] = [];
          status.currentByCourt.forEach((m) => {
            livePlayers.push(...matchPlayers(m));
          });
          const uniqueLive = new Set(livePlayers);
          expect(uniqueLive.size).toBe(livePlayers.length);

          // Score all live matches to advance to next slot
          status.currentByCourt.forEach((m) => {
            scores.set(m.id, { team1: 11, team2: 7 });
          });

          if (status.currentByCourt.size === 0) break;
        }
      });

      it("waiting/bench count is consistent", () => {
        const players = Array.from({ length: playerCount }, (_, i) => `P${i + 1}`);
        const matches = generateSchedule(players, GAME_DURATION, TOTAL_TIME, COURTS);
        const scores = new Map<string, { team1: number; team2: number }>();

        const status = computeCourtStatus(matches, scores, players, COURTS);

        // Count occupied (live + next)
        const occupied = new Set<string>();
        status.currentByCourt.forEach((m) =>
          matchPlayers(m).forEach((p) => occupied.add(p))
        );
        status.nextByCourt.forEach((m) =>
          matchPlayers(m).forEach((p) => occupied.add(p))
        );

        const expectedWaiting = players.filter((p) => !occupied.has(p));
        expect(status.waitingPlayers).toEqual(expectedWaiting);
        expect(status.waitingPlayers.length).toBe(expectedWaiting.length);
      });
    });
  }

  it("all scored → no live, all waiting", () => {
    const players = ["A", "B", "C", "D"];
    const matches = generateSchedule(players, GAME_DURATION, TOTAL_TIME, 1);
    const scores = new Map<string, { team1: number; team2: number }>();
    matches.forEach((m) => scores.set(m.id, { team1: 11, team2: 5 }));

    const status = computeCourtStatus(matches, scores, players, 1);
    expect(status.activeSlotStart).toBeNull();
    expect(status.currentByCourt.size).toBe(0);
    expect(status.waitingPlayers.length).toBe(4);
  });

  it("detects overlap if scheduler produced a bad schedule", () => {
    // Fabricate a buggy schedule where same player is on both courts at same time
    const badMatches: Match[] = [
      {
        id: "m1",
        court: 1,
        startTime: 0,
        endTime: 10,
        team1: ["Alice", "Bob"],
        team2: ["Carol", "Dave"],
        status: "scheduled",
      },
      {
        id: "m2",
        court: 2,
        startTime: 0,
        endTime: 10,
        team1: ["Alice", "Eve"], // Alice on both courts!
        team2: ["Frank", "Grace"],
        status: "scheduled",
      },
    ];
    const scores = new Map<string, { team1: number; team2: number }>();
    const players = ["Alice", "Bob", "Carol", "Dave", "Eve", "Frank", "Grace"];

    const status = computeCourtStatus(badMatches, scores, players, 2);
    expect(status.overlapDetected).toBe(true);
    expect(status.overlappingPlayers).toContain("Alice");
  });

  describe("regression: scoring one court at a time does not create overlap", () => {
    for (const playerCount of [6, 7, 8]) {
      it(`${playerCount} players — score court 1 first, then court 2`, () => {
        const players = Array.from({ length: playerCount }, (_, i) => `P${i + 1}`);
        const matches = generateSchedule(players, GAME_DURATION, TOTAL_TIME, COURTS);
        const scores = new Map<string, { team1: number; team2: number }>();

        for (let step = 0; step < 20; step++) {
          const status = computeCourtStatus(matches, scores, players, COURTS);
          if (status.currentByCourt.size === 0) break;

          // Verify no overlap
          expect(status.overlapDetected).toBe(false);

          // Score only court 1's live match (simulates real use)
          const court1Live = status.currentByCourt.get(1);
          if (court1Live) {
            scores.set(court1Live.id, { team1: 11, team2: 9 });
          } else {
            // If no court 1 live, score court 2
            const court2Live = status.currentByCourt.get(2);
            if (court2Live) scores.set(court2Live.id, { team1: 11, team2: 9 });
          }
        }
      });
    }
  });
});
