# PickleMatch Restart Approved Build Brief

Owner: Henry
Status: Approved for Builder handoff
Date: 2026-03-22

Primary sources:
- `RESTART_RESEARCH.md`
- `RESTART_DESIGN.md`
- prior `APPROVED_BUILD_BRIEF.md`

## 1. Mission
Restart PickleMatch from the product level and rebuild the visible experience as a single, coherent round-robin session runner.

Preserve the best engine behavior.
Replace the experience completely.

## 2. Locked scope
### In scope
- one product path on `/`
- round robin only
- 1 or 2 courts only
- singles / doubles support
- create / join / restore session
- fast setup
- fast player add / roster management
- live courts board
- direct score entry and editing
- waiting / next-up visibility
- leaderboard / recap / share-friendly wrap
- multi-device realtime sync
- future reserved AdSense slots in passive zones only

### Out of scope
- tournament mode
- qualifier mode
- brackets
- seeding
- elimination UX
- legacy multi-mode routing or selection
- alternate product variants as active paths

## 3. Preserve underneath
Keep unless a bug makes change necessary:
- scheduler / rotation logic
- realtime sync
- anonymous auth / session restore
- player identity / player mode
- score history / leaderboard plumbing
- mid-session join / leave support

## 4. Replace visibly
Do not wrap the old product.
Do not preserve old hierarchy.
Do not preserve old repeated intros.
Do not preserve legacy route concepts in the visible experience.

## 5. Information architecture
1. Start
2. Setup
3. Players
4. Courts
5. Wrap

## 6. Screen requirements
### Start
- Create session
- Join with code
- Restore if available
- minimal supporting copy only

### Setup
- open directly on controls
- 1 or 2 courts
- singles / doubles and essential session settings only
- clear continue CTA

### Players
- open directly on roster work
- quick add
- batch add
- player status visibility
- start session CTA

### Courts
- open directly on live board
- current match per court
- next up per court
- waiting / bench
- direct score entry on the live surface
- editing completed scores reachable without admin hunting

### Wrap
- leaderboard
- recap
- share / export style closing moment
- lightweight history

## 7. First-fold law
After Start, every screen must open on its real working surface.
No repeated hero.
No repeated explainer.
No second-screen sales framing.

## 8. Device emphasis
### Mobile
Player-priority by default:
- my status
- quick live state
- compact score and roster interactions

### iPad landscape
Kiosk / venue-priority by default:
- stronger dual-court visibility
- visible waiting queue
- host-operable live controls
- room-readable hierarchy

Both devices must retain full capability.

## 9. Visual direction
Use Playful Club-Night Utility:
- energetic court-sport palette
- friendly confident typography
- polished, finished card system
- restrained glass treatment
- lively but controlled hierarchy

## 10. Implementation directive
Builder should rebuild from screen jobs upward.
Do not keep trimming old screens.
Recompose the product around the five-screen flow.
If older logic helpers are reused, hide that fact behind a fresh interface.

## 11. Explicit anti-failure rules
- no active legacy variant routes
- no duplicated first fold after Start
- no schedule-tool UI dominating Courts
- no roster management split across multiple competing areas
- no visually cleaner but functionally broken flow
- no milestone claimed without external deploy

## 12. Acceptance criteria
This pass only counts if:
- externally deployed link works
- `/` is the single coherent product path
- create → setup → players → start → courts → wrap works end-to-end
- setup is direct
- players is direct
- courts is direct
- score entry is obvious and usable
- next-up / waiting state is obvious
- wrap feels intentional, not leftover
- mobile and iPad emphasis are visibly different in hierarchy
- report includes commit hash + live link + remaining gaps

## 13. Next action
Builder should now execute this restart rebuild on the updated model configuration and deliver a reviewable Vercel deployment.