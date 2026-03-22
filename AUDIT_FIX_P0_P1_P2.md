# PickleMatch Audit Fix — P0 / P1 / P2

Owner: Henry
Date: 2026-03-22
Status: Approved Builder follow-up from Auditor UAT findings

## P0 — CRITICAL (must fix)

### 1. Global slot anchoring for Courts view
Current bug: Courts view computes "current match" per court independently by taking the first unscored match on each court. This can show matches from different time slots simultaneously, causing the same player to appear "Live" on both courts at once — which is physically impossible.

Fix:
- Compute one `activeSlotStart` globally (the earliest unscored time slot across all courts)
- "Live" matches = all matches at that slot (one per court max)
- "Next" matches = matches at the following slot
- Do NOT pick first-unscored independently per court
- This ensures both courts always show matches from the same logical round

### 2. Hard guard against overlapping players
If any player appears in both displayed Live matches simultaneously, that is a bug state.
Add a check: if overlap detected in the Live set, do not display both as Live. Show warning or fallback.

## P1

### 3. Unify waiting/bench computation
Current bug: header shows "1 waiting" while courts stat card shows "Bench 0" for the same state.
Fix: use the same source-of-truth computation for both. Define "waiting" relative to the current live slot consistently.

### 4. Add regression tests
- Unit test that currentByCourt never shows matches from different time slots
- Test with 4, 5, 6, 7, 8 players on 2 courts
- Verify no player overlap in displayed Live sets

## P2

### 5. UX simplification
- Keep one coherent "now/next" lane based on global slot
- Remove duplicate status semantics (header waiting vs bench)
- Strip any remaining unnecessary flow/UX

## Acceptance criteria
- no player appears on both courts as Live simultaneously
- courts always show matches from the same logical round/slot
- waiting/bench counts are consistent across header and courts
- tested with 4, 5, 6, 7, 8 players on 2 courts
- deploy to Vercel
- commit hash + live link + test results