# PickleMatch Approved Build Brief

Owner: Henry
Status: Approved for Builder handoff
Date: 2026-03-21

## 1. Product goal
Build a polished, casual, round-robin pickleball night app that feels fast and social while preserving the strongest existing scheduling/rotation logic.

The product is for real recurring play nights, not tournament management.

Primary success outcome:
- a host can set up a session quickly
- players can join/check status easily
- the venue can run 1 or 2 courts smoothly
- the app clearly shows who is playing now, who is next, and who is waiting
- score entry, leaderboard, and wrap-up feel simple and satisfying

## 2. Locked scope
### In scope
- Round robin only
- 1-court or 2-court selection only
- Singles or doubles support
- AI rotation logic preserved
- Player registration / join flow
- Live courts board
- Score entry
- Players joining and leaving during session
- Leaderboard / recap / social sharing moments
- Multi-device synced session behavior
- Reserved AdSense spaces for future use

### Out of scope
- Tournament mode
- Qualifier mode
- Brackets
- Seeding
- Elimination UX
- Legacy multi-mode scheduling chooser
- Tournament/qualifier routes as a primary product path

## 3. Preserve vs replace
### Preserve underneath
Keep these core logic behaviors unless a clear bug requires change:
- round-robin scheduler / rotation engine
- 1-2 court scheduling behavior
- mid-session player join/leave handling
- score syncing
- player identity / player mode support
- real-time synced session state
- leaderboard/stat calculations

### Replace in UX/UI
Do not preserve the old UX in parallel.
Replace the visible experience for the main product flow:
- old duplicated wrappers
- repeated first-fold/hero treatment on non-entry screens
- old schedule-tool-first page hierarchy
- exposed tournament/qualifier framing
- legacy-feeling multi-mode navigation

Rule: keep the logic, replace the experience.

## 4. UX operating principles
### A. One main product path
The app should feel like one coherent product, not multiple variants bolted together.

### B. Each screen has one job
Avoid duplicated-feeling pages.
Each screen should have a distinct purpose.

### C. Fast setup, low friction
The product should optimize for getting a real session running quickly.

### D. The live courts board is the hero
The core value should be visible in the session board:
- who is on now
- who is next
- who is waiting
- what score/state matters now

### E. External review readiness
A frontend milestone is only review-ready when it is externally deployed and the route works.

## 5. Device behavior
Both device classes should retain full capability. The difference is UX emphasis, not hard feature restrictions.

### Mobile default emphasis = player-priority
Prioritize:
- check in / check out
- my status
- my next match
- quick view of live session state
- low-friction interaction

### iPad landscape default emphasis = kiosk / venue-priority
Prioritize:
- shared session control
- player add/remove/update
- live dual-court overview
- score entry and session management
- room-visible clarity

Rule: same session, same data, same capabilities, different emphasis.

## 6. Chosen aesthetic direction
### Playful Club-Night Utility
The visual direction should feel:
- casual
- social
- sporty
- polished
- finished
- welcoming

Not:
- enterprise admin dashboard
- serious tournament software
- generic startup SaaS
- novelty-heavy dribbble fluff

### Visual guidance
- energetic court-sport palette
- friendly but confident typography
- strong score / ranking readability
- intentional card hierarchy
- lively but restrained motion
- memorable live-board experience

## 7. Approved information architecture
Main flow:
1. Start
2. Setup
3. Players
4. Courts
5. Wrap

### Start
Purpose: immediate decision point only.
- Create session
- Join with code
No sales pitch beyond the minimum needed.

### Setup
Purpose: configure a round-robin session quickly.
Should include only:
- 1 or 2 courts
- singles or doubles
- essential scoring/session settings
No tournament/format chooser.

### Players
Purpose: fast roster management.
Should support:
- single add
- batch paste add
- clear in/out status
- visibility of who is active / waiting / absent if relevant

### Courts
Purpose: run the night.
Must clearly show:
- Court 1 current match
- Court 2 current match (if 2-court session)
- next-up per court
- waiting / bench players
- score entry access
- next-match preview / promotion controls

The top-level courts board should be the primary experience, not buried underneath legacy controls.

### Wrap
Purpose: social closure.
Should combine:
- leaderboard
- recap
- shareable result moment
- lightweight history/summary

## 8. Builder directives
### Build order
1. Replace main product entry/start flow
2. Replace setup flow for round-robin-only session creation
3. Replace player management flow
4. Replace live courts/session board
5. Replace leaderboard/wrap experience
6. Hide/retire old visible UX paths that conflict with the new flow

### Technical rule
Builder should not redesign logic unless necessary.
Builder should preserve engine behavior and recompose the interface around it.

### If a legacy component must remain temporarily
It must be:
- visually subordinated
- hidden behind the new UI where possible
- clearly treated as transitional, not the main experience

### Special instruction
The live courts screen must be operationally real:
- starting the session must work
- current matches must be visible
- next matches must be visible
- score editing must be reachable and usable
- the user should not have to hunt through old schedule-tool UI to run the night

## 9. Reserved AdSense spaces
Reserve but do not overemphasize:
- start screen bottom area
- wrap / leaderboard lower section
- possible schedule/recap passive zone

Never place ads:
- above Create/Join CTAs
- in the live courts board
- in score-entry flows
- in interaction-critical modals

## 10. Acceptance criteria for Builder
Builder handoff is only acceptable if it includes:
- commit hash
- summary of what changed
- externally deployed live review link
- note on what still remains

## 11. Acceptance criteria for product milestone
The next rebuild milestone should satisfy all of these:
- Round robin only is the visible main product
- 1/2 court selection is simple
- tournament/qualifier UX is no longer the main experience
- Start screen is direct and low-friction
- Setup is quick and not duplicated
- Players screen is distinct and functional
- Courts screen clearly runs the session
- Wrap/leaderboard provides social closure
- Mobile feels player-priority by default
- iPad landscape feels kiosk-priority by default
- External review link works

## 12. Audit instructions for later
Audit should verify against this brief, not against drifting chat context.
Audit should explicitly assess:
- whether old UX is still leaking into the main flow
- whether screens have distinct jobs
- whether the live courts board is genuinely usable
- whether the design direction feels intentional rather than generic

## 13. Immediate next step
This brief is the approved source of truth for Builder.
Builder should now begin the round-robin rebuild against this document, not against fragmented prior chat history.
