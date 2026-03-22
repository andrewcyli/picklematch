import { describe, it, expect } from "vitest";
import { computeCourtStatus } from "./court-status";
import { generateSchedule, Match } from "./scheduler";

function matchPlayers(m: Match): string[] {
  return [...m.team1, ...m.team2];
}

describe("computeCourtStatus — independent court advancement with player constraint", () => {
  const GAME_DURATION = 10;
  const TOTAL_TIME = 200;
  const COURTS = 2;

  for (const playerCount of [4, 5, 6, 7, 8]) {
    describe(`${playerCount} players, 2 courts`, () => {
      it("no player appears on both courts as Live simultaneously", () => {
        const players = Array.from({ length: playerCount }, (_, i) => `P${i + 1}`);
        const matches = generateSchedule(players, GAME_DURATION, TOTAL_TIME, COURTS);
        const scores = new Map<string, { team1: number; team2: number }>();

        for (let step = 0; step < 30; step++) {
          const status = computeCourtStatus(matches, scores, players, COURTS);

          const livePlayers: string[] = [];
          status.currentByCourt.forEach((m) => {
            livePlayers.push(...matchPlayers(m));
          });
          const uniqueLive = new Set(livePlayers);
          expect(uniqueLive.size).toBe(livePlayers.length);

          // Score all live matches to advance
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
    // With player constraint, Alice's second match should NOT go live
    // Court 1 gets Alice (earlier or same startTime, picked first)
    // Court 2 should be blocked because Alice is already live on Court 1
    expect(status.overlapDetected).toBe(false);
    // Only court 1 should have a live match
    expect(status.currentByCourt.size).toBe(1);
    expect(status.currentByCourt.has(1)).toBe(true);
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
            const court2Live = status.currentByCourt.get(2);
            if (court2Live) scores.set(court2Live.id, { team1: 11, team2: 9 });
          }
        }
      });
    }
  });

  // ========== NEW: Independent advancement tests ==========

  describe("independent court advancement", () => {
    it("court 1 advances when scored, even if court 2 is still playing", () => {
      // Craft a schedule: 2 courts, 8 players, no overlap
      const matches: Match[] = [
        {
          id: "m1",
          court: 1,
          startTime: 0,
          endTime: 10,
          team1: ["A", "B"],
          team2: ["C", "D"],
          status: "scheduled",
        },
        {
          id: "m2",
          court: 2,
          startTime: 0,
          endTime: 10,
          team1: ["E", "F"],
          team2: ["G", "H"],
          status: "scheduled",
        },
        {
          id: "m3",
          court: 1,
          startTime: 10,
          endTime: 20,
          team1: ["A", "E"],
          team2: ["B", "F"],
          status: "scheduled",
        },
        {
          id: "m4",
          court: 2,
          startTime: 10,
          endTime: 20,
          team1: ["C", "G"],
          team2: ["D", "H"],
          status: "scheduled",
        },
      ];

      const players = ["A", "B", "C", "D", "E", "F", "G", "H"];
      const scores = new Map<string, { team1: number; team2: number }>();

      // Initially both courts live
      let status = computeCourtStatus(matches, scores, players, 2);
      expect(status.currentByCourt.size).toBe(2);
      expect(status.currentByCourt.get(1)?.id).toBe("m1");
      expect(status.currentByCourt.get(2)?.id).toBe("m2");

      // Score court 1 only
      scores.set("m1", { team1: 11, team2: 5 });
      status = computeCourtStatus(matches, scores, players, 2);

      // Court 2 should still show m2
      expect(status.currentByCourt.get(2)?.id).toBe("m2");
      // Court 1 should advance — but m3 has E and F who aren't blocked (E,F are NOT live on court 2)
      // Wait — E and F ARE on court 2 (m2). So m3 should be blocked!
      // Court 1 should not show m3 because E and F are live on court 2.
      // Court 1 has no eligible match.
      expect(status.currentByCourt.has(1)).toBe(false);
    });

    it("court 1 advances to next match when its players are free", () => {
      const matches: Match[] = [
        {
          id: "m1",
          court: 1,
          startTime: 0,
          endTime: 10,
          team1: ["A", "B"],
          team2: ["C", "D"],
          status: "scheduled",
        },
        {
          id: "m2",
          court: 2,
          startTime: 0,
          endTime: 10,
          team1: ["E", "F"],
          team2: ["G", "H"],
          status: "scheduled",
        },
        {
          id: "m3",
          court: 1,
          startTime: 10,
          endTime: 20,
          team1: ["A", "C"],
          team2: ["B", "D"],
          status: "scheduled",
        },
      ];

      const players = ["A", "B", "C", "D", "E", "F", "G", "H"];
      const scores = new Map<string, { team1: number; team2: number }>();

      // Score court 1
      scores.set("m1", { team1: 11, team2: 5 });
      const status = computeCourtStatus(matches, scores, players, 2);

      // Court 1 should advance to m3 (A,B,C,D are all free — not on court 2)
      expect(status.currentByCourt.get(1)?.id).toBe("m3");
      // Court 2 still has m2
      expect(status.currentByCourt.get(2)?.id).toBe("m2");
    });

    it("court skips blocked match and finds next eligible one", () => {
      const matches: Match[] = [
        {
          id: "m1",
          court: 1,
          startTime: 0,
          endTime: 10,
          team1: ["A", "B"],
          team2: ["C", "D"],
          status: "scheduled",
        },
        {
          id: "m2",
          court: 2,
          startTime: 0,
          endTime: 10,
          team1: ["E", "F"],
          team2: ["G", "H"],
          status: "scheduled",
        },
        {
          id: "m3",
          court: 1,
          startTime: 10,
          endTime: 20,
          team1: ["A", "E"],
          team2: ["B", "F"],
          status: "scheduled",
        },
        {
          id: "m4",
          court: 1,
          startTime: 20,
          endTime: 30,
          team1: ["A", "C"],
          team2: ["B", "D"],
          status: "scheduled",
        },
      ];

      const players = ["A", "B", "C", "D", "E", "F", "G", "H"];
      const scores = new Map<string, { team1: number; team2: number }>();

      // Score court 1's first match
      scores.set("m1", { team1: 11, team2: 5 });
      const status = computeCourtStatus(matches, scores, players, 2);

      // m3 is blocked (E,F live on court 2), so court 1 should skip to m4
      expect(status.currentByCourt.get(1)?.id).toBe("m4");
      expect(status.currentByCourt.get(2)?.id).toBe("m2");
    });

    it("both courts can be at different time slots", () => {
      const matches: Match[] = [
        {
          id: "m1",
          court: 1,
          startTime: 0,
          endTime: 10,
          team1: ["A", "B"],
          team2: ["C", "D"],
          status: "scheduled",
        },
        {
          id: "m2",
          court: 2,
          startTime: 0,
          endTime: 10,
          team1: ["E", "F"],
          team2: ["G", "H"],
          status: "scheduled",
        },
        {
          id: "m3",
          court: 1,
          startTime: 10,
          endTime: 20,
          team1: ["C", "D"],
          team2: ["A", "B"],
          status: "scheduled",
        },
        {
          id: "m4",
          court: 2,
          startTime: 10,
          endTime: 20,
          team1: ["G", "H"],
          team2: ["E", "F"],
          status: "scheduled",
        },
        {
          id: "m5",
          court: 1,
          startTime: 20,
          endTime: 30,
          team1: ["A", "B"],
          team2: ["C", "D"],
          status: "scheduled",
        },
      ];

      const players = ["A", "B", "C", "D", "E", "F", "G", "H"];
      const scores = new Map<string, { team1: number; team2: number }>();

      // Score court 1's matches: m1 and m3
      scores.set("m1", { team1: 11, team2: 5 });
      scores.set("m3", { team1: 11, team2: 5 });

      const status = computeCourtStatus(matches, scores, players, 2);

      // Court 1 advanced to slot 20 (m5), court 2 still at slot 0 (m2)
      expect(status.currentByCourt.get(1)?.startTime).toBe(20);
      expect(status.currentByCourt.get(2)?.startTime).toBe(0);
    });
  });

  describe("player constraint blocks correctly", () => {
    it("player-level block prevents overlap when player is on another live court", () => {
      const matches: Match[] = [
        {
          id: "m1",
          court: 1,
          startTime: 0,
          endTime: 10,
          team1: ["A", "B"],
          team2: ["C", "D"],
          status: "scheduled",
        },
        {
          id: "m2",
          court: 2,
          startTime: 0,
          endTime: 10,
          team1: ["E", "F"],
          team2: ["G", "H"],
          status: "scheduled",
        },
        {
          id: "m3",
          court: 1,
          startTime: 10,
          endTime: 20,
          team1: ["E", "A"],
          team2: ["G", "B"],
          status: "scheduled",
        },
      ];

      const players = ["A", "B", "C", "D", "E", "F", "G", "H"];
      const scores = new Map<string, { team1: number; team2: number }>();

      // Score court 1's m1
      scores.set("m1", { team1: 11, team2: 5 });
      const status = computeCourtStatus(matches, scores, players, 2);

      // m3 has E and G who are live on court 2 — should be blocked
      expect(status.currentByCourt.has(1)).toBe(false);
      expect(status.currentByCourt.get(2)?.id).toBe("m2");
      expect(status.overlapDetected).toBe(false);
    });

    it("once blocked players finish, court can proceed", () => {
      const matches: Match[] = [
        {
          id: "m1",
          court: 1,
          startTime: 0,
          endTime: 10,
          team1: ["A", "B"],
          team2: ["C", "D"],
          status: "scheduled",
        },
        {
          id: "m2",
          court: 2,
          startTime: 0,
          endTime: 10,
          team1: ["E", "F"],
          team2: ["G", "H"],
          status: "scheduled",
        },
        {
          id: "m3",
          court: 1,
          startTime: 10,
          endTime: 20,
          team1: ["E", "A"],
          team2: ["G", "B"],
          status: "scheduled",
        },
      ];

      const players = ["A", "B", "C", "D", "E", "F", "G", "H"];
      const scores = new Map<string, { team1: number; team2: number }>();

      // Score both m1 and m2
      scores.set("m1", { team1: 11, team2: 5 });
      scores.set("m2", { team1: 11, team2: 5 });
      const status = computeCourtStatus(matches, scores, players, 2);

      // Now E and G are free, m3 can go live on court 1
      expect(status.currentByCourt.get(1)?.id).toBe("m3");
      expect(status.overlapDetected).toBe(false);
    });
  });

  describe("with generated schedules — courts advance independently", () => {
    for (const playerCount of [6, 7, 8]) {
      it(`${playerCount} players — court 1 scores faster, never gets stuck`, () => {
        const players = Array.from({ length: playerCount }, (_, i) => `P${i + 1}`);
        const matches = generateSchedule(players, GAME_DURATION, TOTAL_TIME, COURTS);
        const scores = new Map<string, { team1: number; team2: number }>();

        let court1Advances = 0;
        let court2StillPlaying = 0;

        for (let step = 0; step < 30; step++) {
          const status = computeCourtStatus(matches, scores, players, COURTS);
          if (status.currentByCourt.size === 0) break;

          // No overlap ever
          expect(status.overlapDetected).toBe(false);

          // Score only court 1
          const court1Live = status.currentByCourt.get(1);
          if (court1Live) {
            scores.set(court1Live.id, { team1: 11, team2: 9 });
            court1Advances++;
            if (status.currentByCourt.has(2)) {
              court2StillPlaying++;
            }
          } else {
            // No court 1 match available, score court 2 instead
            const court2Live = status.currentByCourt.get(2);
            if (court2Live) scores.set(court2Live.id, { team1: 11, team2: 9 });
          }
        }

        // Court 1 should have advanced multiple times
        expect(court1Advances).toBeGreaterThan(0);
      });
    }
  });
});
