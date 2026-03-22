# PickleMatch Fix — Court Blocking Bug

Owner: Henry
Date: 2026-03-22
Status: Approved Builder follow-up — URGENT

## Problem
The P0 global slot anchoring fix (commit 110639c) introduced a new blocking issue:
- Court 1 finishes its match and scores it
- Court 2 is still playing
- Court 1 is now stuck showing "Court ready next / No live match on this court yet"
- Court 1 cannot advance to its next match until Court 2 also finishes

This is wrong. In real life, courts finish at different speeds. A faster court should be able to start its next match immediately.

## Root cause
The global slot anchoring forces both courts to stay in the same logical round. This prevents the original overlap bug but creates a blocking dependency between courts.

## Correct behavior
Courts should advance **independently**, but with a **player-level constraint**:
- Court 1 can advance to its next match as soon as its current match is scored
- Court 2 can advance independently
- BUT: if Court 1's next scheduled match contains a player who is currently live on Court 2, Court 1 must skip or wait for that specific match only
- The constraint is "no player on two courts at once", NOT "both courts must be in the same round"

## Required fix
1. Remove the rigid global slot anchoring
2. Let each court advance independently to its next unscored match
3. Add a player-availability check: before showing a match as "Live" on a court, verify none of its players are currently live on another court
4. If a match can't start because a player is occupied, skip to the next eligible match for that court OR show "waiting for player X"
5. Keep the overlap detection hard guard as defense-in-depth

## Acceptance criteria
- Court 1 can advance independently when its match is scored
- Court 2 can advance independently when its match is scored
- No player ever appears live on both courts simultaneously
- Bench/waiting counts remain consistent
- Test with 4, 5, 6, 7, 8 players on 2 courts
- Deploy to Vercel
- commit hash + live link