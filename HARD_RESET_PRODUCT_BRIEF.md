# PickleMatch Hard Reset Product Brief

Owner: Henry
Status: Approved for Builder handoff
Date: 2026-03-22

## 1. What "hard reset" means here
This is a **product hard reset**, not a destructive git wipe.

Keep:
- repo history
- deploy pipeline
- useful engine / scheduler / realtime / session-state logic where reusable

Do NOT use the current visible app as the design baseline.
Do NOT keep trimming or refining the current UI.
Do NOT preserve current screen structure just because it exists.

Builder must treat the current visible product as disposable implementation, not as the thing to polish.

## 2. Mission
Rebuild PickleMatch from a blank user-facing surface into a single coherent round-robin session runner for casual club nights.

The new product must feel like it was designed intentionally from first principles around five screens:
1. Start
2. Setup
3. Players
4. Courts
5. Wrap

## 3. Locked product mandates
- single coherent product on `/`
- round robin only
- 1 or 2 courts only
- preserve strongest underlying logic where useful:
  - scheduling / rotation engine
  - realtime sync
  - anonymous auth / session restore
  - player identity / player mode
  - score / history / leaderboard plumbing
- replace the visible UX/UI completely
- mobile default emphasis = player-priority
- iPad landscape default emphasis = kiosk / venue-priority
- external deploy required for milestone acceptance

## 4. Explicit reset rule
Builder should create **new screen-level components** for the user-facing flow.

Do not treat the current `PlayerSetup`, `ScheduleView`, `CheckInOut`, or existing screen compositions as the default structure to keep.
If useful logic is hidden inside them, extract/reuse logic only.
Their visible UI patterns should not control the rebuild.

## 5. Screen jobs
### Start
Immediate decision only:
- Create session
- Join with code
- Restore recent session if available

Minimal support copy only.

### Setup
Directly show:
- court count
- format essentials
- session length / game target essentials
- continue CTA

No intro layer.

### Players
Directly show:
- roster counts / readiness
- quick add
- batch add
- roster management
- start session CTA

No duplicated setup or explanatory blocks.

### Courts
Directly show:
- current match per court
- next up per court
- waiting / bench
- direct score controls
- clear live session management

This must be the hero of the product.

### Wrap
Directly show:
- leaderboard
- recap
- share/export moment
- lightweight history

## 6. First-fold law
After Start, every screen must open directly on working content.
No hero repetition.
No sales framing.
No “what this page does” block.
No legacy dashboard preamble.

## 7. UX direction
### Mobile
Player-priority by default:
- personal status
- next match clarity
- compact score / roster interactions
- low-friction taps

### iPad landscape
Kiosk / venue-priority by default:
- dual-court visibility
- waiting players visible
- room-readable hierarchy
- host-operable live controls

## 8. Visual direction
Playful Club-Night Utility:
- sporty, social, polished
- energetic court-sport palette
- friendly confident typography
- strong number / score readability
- clean, intentional card hierarchy
- restrained glass treatment where useful
- lively but disciplined motion

## 9. Anti-patterns from previous rebuilds
Builder must avoid:
- wrapping old UI with a new shell
- repeated top-of-screen intro framing after Start
- schedule-tool-first hierarchy
- preserving old dashboard copy because it already exists
- visually cleaner but operationally broken flows
- “same responsive page everywhere” instead of mobile/iPad emphasis

## 10. Implementation approach
Preferred approach:
- create fresh top-level screen components and layouts
- extract only the engine/state/actions needed from existing code
- recompose the visible experience around the five screen jobs
- hide or discard old visible component structures if they conflict

## 11. Acceptance criteria
This build pass only counts if:
- the visible app feels like a fresh rebuild, not a refinement
- `/` is the main product path
- create -> setup -> players -> start -> courts -> wrap works end-to-end
- setup/players/courts/wrap all open directly on their working surfaces
- score entry is obvious
- next-up / waiting visibility is obvious
- mobile and iPad hierarchy feel intentionally different
- externally deployed Vercel link works
- Builder reports commit hash, live link, and honest remaining gaps

## 12. Delivery note
If engine constraints block ideal UX in any specific area, Builder must say so explicitly instead of silently inheriting old UI patterns.