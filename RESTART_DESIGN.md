# PickleMatch Restart Design Blueprint

Owner: Henry
Date: 2026-03-22
Status: Approved internal design blueprint

## 1. Chosen direction
### Playful Club-Night Utility
The app should feel:
- sporty
- social
- fast
- polished
- friendly
- operationally clear

Not:
- enterprise admin dashboard
- tournament control software
- generic startup SaaS
- novelty-heavy concept art

## 2. First-fold rule
Only the Start screen may use a light framing / orientation layer.
Every screen after Start must open directly on its working surface.

That means:
- Setup first fold = controls
- Players first fold = roster
- Courts first fold = live board
- Wrap first fold = recap / leaderboard / share moment

No repeated hero block. No repeated sales copy. No repeated “what this screen does” preamble.

## 3. Screen-by-screen blueprint
### Start
Purpose:
- immediate entry decision

First fold:
- Create session primary CTA
- Join with code secondary CTA
- Restore recent session if available

Layout:
- clean branded top area
- one concise supporting line maximum
- session code join field / restore card
- reserved passive ad slot only at bottom

### Setup
Purpose:
- configure a real round-robin night quickly

First fold contents:
- utility bar with session identity / step progress
- court count selector (1 or 2)
- format selector (singles / doubles where needed)
- game target / session duration controls
- save / continue CTA always visible

Layout rule:
- form controls grouped into 2-4 compact cards max
- no duplicated share / join / explainer sections
- top of screen must be the controls themselves

### Players
Purpose:
- build the roster and start the night

First fold contents:
- roster stats strip (total / ready / waiting if relevant)
- quick add input
- batch paste add block
- visible roster list
- primary Start Session CTA

Layout rule:
- player work happens in one main surface
- side notes are minimized
- roster list should feel alive, not like a form table

### Courts
Purpose:
- run the night in real time

First fold contents:
- live session strip (session name / status / court count)
- Court 1 live card
- Court 2 live card if applicable
- next-up preview per court
- waiting / bench strip
- direct score controls on current match cards

Layout rule:
- current matches dominate the screen
- score entry lives on the cards or in immediately adjacent controls
- deeper history / completed-match editing can sit below the fold or behind clean expandable sections
- no old scheduler-tool hierarchy at the top

### Wrap
Purpose:
- end on social closure rather than admin residue

First fold contents:
- winner / top performers summary
- leaderboard snapshot
- share / export / summary CTA
- short session recap

Layout rule:
- more celebratory and summary-driven than Courts
- history can exist, but must not crowd out the closing moment
- reserved passive ad slot can live lower on the page

## 4. Responsive emphasis rules
### Mobile default = player-priority
Prioritize at top:
- my status
- current match / next match
- quick roster interactions
- compact score controls

Mobile design rules:
- vertical stacking
- strong CTA persistence
- minimal chrome
- compact cards and utility strips
- hide non-critical secondary data lower in flow

### iPad landscape default = kiosk / venue-priority
Prioritize at top:
- dual-court overview
- visible waiting players
- shared controls for host
- room-readable score and queue state

iPad rules:
- wider grid layouts
- simultaneous visibility of multiple live cards
- stronger information density without clutter
- scoreboard readability from distance

## 5. Component hierarchy recommendations
### Shared primitives
- `StepUtilityBar`
- `StatStrip`
- `ActionCard`
- `CourtLiveCard`
- `QueuePreviewCard`
- `RosterList`
- `BatchAddCard`
- `WrapSummaryCard`

### Replace-or-refactor targets
- `PlayerSetup` should become the canonical roster surface
- `ScheduleView` should become a true live courts board, not a generic schedule viewer
- `CheckInOut` should not present as its own visual layer
- `Leaderboard` and `MatchHistory` should be visually retuned to fit Wrap rather than dashboard leftovers

## 6. Visual system guidance
### Typography
- friendly, confident, readable
- strong number treatment for scores, ranks, and counts
- avoid flat generic UI font hierarchy

### Color
- court-inspired green as primary identity
- use warm support tones for highlights and state changes
- keep backgrounds light but not sterile
- use contrast deliberately for live status and score importance

### Cards and surfaces
- rounded cards
- light glass / frosted treatment where it helps hierarchy
- subtle shadow, not heavy depth
- clear spacing and grouping

### Motion
- restrained micro-motion only
- transitions should reinforce state changes:
  - match advancement
  - score saved
  - court state changes
- avoid decorative motion that slows operational use

## 7. Memorable moments vs restrained moments
### Must feel memorable
- start entry moment
- live courts board
- wrap / winning summary moment

### Must stay restrained
- setup controls
- roster editing
- lower-level history views

## 8. Builder guardrails
- do not reintroduce repeated top hero sections after Start
- do not split one job across multiple competing blocks
- do not preserve old dashboard phrasing just because logic is reusable
- do not let detailed controls overshadow the live board
- do not optimize only for desktop-ish responsive layout; explicitly shape mobile and iPad emphasis
