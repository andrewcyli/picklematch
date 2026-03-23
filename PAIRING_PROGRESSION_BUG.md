# PickleMatch P0 Bug — Pairing breaks game progression

Owner: Henry
Date: 2026-03-22
Status: Approved Builder urgent fix

## User-reported bug
After pairing players in the session, game progression breaks:
- scores can be entered
- confirm score can be pressed
- but games do not advance to the next match

## Context
Recent fixes changed court progression logic:
- removed rigid global slot anchoring
- added player-level availability constraints
- added independent court advancement

Pairing now appears to interact badly with progression.

## Required investigation
1. Reproduce with paired players in a real session
2. Identify whether the block is caused by:
   - pairing lock state
   - next eligible match derivation
   - player-availability constraint falsely blocking advancement
   - schedule update persistence after scoring
3. Fix so that:
   - paired players can still progress through the session
   - score confirm advances correctly
   - no player appears live on both courts simultaneously
   - pairing does not deadlock the queue

## Acceptance criteria
- paired session can progress after score confirmation
- unpaired session still progresses correctly
- no dual-court overlap introduced
- deploy to Vercel
- commit hash + live link + root cause summary