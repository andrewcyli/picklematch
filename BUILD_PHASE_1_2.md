# PickleMatch Build Brief — Phase 1+2
# Compiled by Henry | 2026-03-22
# Source of truth: APPROVED_BUILD_BRIEF.md + gap analysis + user feedback

## Context
The approved brief says "replace, not wrap." But the current codebase still has all old routes, old variants, old prototypes, and old inner components active. The product still structurally looks like a multi-mode app with a new shell on top. User feedback confirms screens still feel duplicated and old UI still leaks through.

This phase fixes that.

## Phase 1: Strip legacy routes and code

### Remove from App.tsx routing
Delete or comment out these routes:
- `/start` (old VariantSelector)
- `/prototypes` (old prototype hub)
- `/clubhouse/*` (old prototype)
- `/arena/*` (old prototype)
- `/classic/*` (old ClassicVariant)
- `/tournament/*` (old TournamentVariant)
- `/qualifier/*` (old QualifierVariant)
- `/quick-court/prototype` (old prototype reference)
- `/play` redirect
- `/game` redirect
- `/new` redirect

### Keep only
- `/` → main product (Index.tsx)
- `/quick-court/*` → only if it IS the main product; otherwise merge its best code into `/` and remove the separate route

### Decision: merge Quick Court into root
The main product path should be `/` only.
If `/quick-court/*` has useful code that `/` doesn't, merge it into Index.tsx.
Then remove `/quick-court/*` as a separate route.

Result: one product, one route tree, rooted at `/`.

### Archive old code
Move these directories out of active src:
- `src/variants/classic/`
- `src/variants/tournament/`
- `src/variants/qualifier/`
- `src/prototypes/`

They can go to `src/_archived/` or be deleted. They must not be importable from active routes.

Keep `src/variants/quickcourt/` only if it's being merged into the main flow. Otherwise archive it too.

### Clean up imports
After removing routes and archiving code, remove any now-dead imports from App.tsx and other files.

### Verify
After Phase 1:
- only `/` should serve the product
- no other route should load old variants or prototypes
- `npm run build` must still pass

---

## Phase 2: Replace inner components

The three shared components that still carry old UI patterns need replacement with new Quick Court-native versions.

### 2A: Replace PlayerSetup
Current problem: PlayerSetup still looks and feels like legacy admin UI.

New PlayerSetup should:
- match the club-night green/glassy aesthetic
- focus on fast player entry (single add + batch paste)
- show roster count and player status clearly
- support mid-session join/leave
- have a clear "Start Session" CTA with minimum-player enforcement
- no explanatory copy or feature-selling text
- be the ONLY player management surface (no duplicate roster views)

### 2B: Replace ScheduleView / Courts board
Current problem: ScheduleView is the old detailed schedule tool. It works but looks like legacy admin software.

New Courts board should:
- be the hero screen of the product
- show per-court status clearly:
  - Court 1: current match (teams + score)
  - Court 2: current match (teams + score) — if 2-court session
  - Next up per court
  - Waiting / bench players
- make score entry direct and obvious (not buried under "detailed controls")
- support scrolling through matches
- support advancing to next match
- support editing completed scores
- match the club-night aesthetic
- work well on mobile (compact, clear hierarchy)
- work well on iPad landscape (more spatial, kiosk-like)

The old ScheduleView can remain as an internal engine/data source, but its UI should not be the visible courts experience anymore.

### 2C: Replace CheckInOut
Current problem: CheckInOut is a legacy wrapper that adds unnecessary framing.

Either:
- absorb its useful logic into the new PlayerSetup
- or slim it to a transparent pass-through with no visible UI of its own

### Aesthetic requirement
All replaced components must use:
- the green/glassy palette
- rounded cards with subtle shadow
- clean typography hierarchy
- compact utility bars instead of big hero sections
- consistent with the Start screen's visual language

### Functional requirement
After Phase 2, the full flow must work end-to-end:
1. Create session → lands on Setup
2. Setup → configure courts + format → save
3. Players → add players → start session
4. Courts → see live matches, enter scores, advance matches, scroll through schedule
5. Wrap → leaderboard + recap

Every step must be functional, not just visual.

---

## What is NOT in this phase
- Device-mode specialization (mobile vs iPad) — Phase 3
- AdSense placeholder insertion — Phase 5
- Social sharing / export moment — later
- Automated testing — later

---

## Delivery requirement
Builder must return:
- commit hash
- what was removed / archived
- what was replaced
- externally deployed Vercel link
- confirmation that the full flow works end-to-end
- note on any remaining legacy areas

## Acceptance criteria
- `/` is the only working product route
- no old variants or prototypes are routable
- PlayerSetup is visually replaced
- Courts board is visually replaced with functional score entry
- CheckInOut framing is gone or absorbed
- the aesthetic is consistent across Start → Setup → Players → Courts → Wrap
- `npm run build` passes
- external Vercel link works
