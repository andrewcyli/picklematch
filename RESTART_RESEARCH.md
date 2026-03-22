# PickleMatch Restart Research

Owner: Henry
Date: 2026-03-22
Status: Approved internal restart synthesis

## 1. Product objective
Rebuild PickleMatch as a single, coherent round-robin session product for casual club nights.

The product is not tournament software. It is a practical session runner for real play nights where people need to:
- create or join a session quickly
- set up 1 or 2 courts simply
- add and manage players fast
- run live matches with clear now / next / waiting visibility
- enter scores without hunting through admin-like controls
- end with a satisfying wrap / leaderboard / share moment

## 2. Locked mandates
- One main product path on `/`
- Round robin only
- 1 or 2 courts only in the main flow
- Preserve strongest underlying engine behavior:
  - schedule / rotation logic
  - realtime sync
  - anonymous auth / session restore
  - player identity / player mode
  - score / history / leaderboard plumbing
- Replace the visible UX/UI rather than wrapping the old product
- Mobile default emphasis = player-priority
- iPad landscape default emphasis = kiosk / venue-priority
- Delivery only counts when externally deployed and reviewable

## 3. User jobs by screen
### Start
Primary job:
- start or re-enter a real session fast

Must do:
- Create session
- Join with code
- Restore recent session if available

Must not do:
- re-explain the product at length
- sell multiple modes
- act like a landing page

### Setup
Primary job:
- configure the session with minimum friction

Must do:
- choose 1 or 2 courts
- choose singles / doubles per court or session mode as needed
- set game length / session length / essential rules only
- save and move forward cleanly

Must not do:
- duplicate Join / Share / roster content
- add extra format chooser complexity
- lead with explanation instead of controls

### Players
Primary job:
- build and manage a usable roster quickly

Must do:
- single add
- batch paste add
- check in / out or mark active / waiting status clearly
- show enough player counts to know session readiness
- enforce minimum viable roster before start

Must not do:
- repeat setup content
- bury the start CTA
- split the same roster job across multiple surfaces

### Courts
Primary job:
- run the night live

Must do:
- show current match per court clearly
- show next up per court clearly
- show waiting / bench clearly
- make score entry immediate
- allow score editing for completed matches
- allow advancing / promoting next match without entering an admin maze

Must not do:
- open on explanation or utility chrome before the live board
- bury score controls under old scheduler UI
- make hosts hunt for live session actions

### Wrap
Primary job:
- close the session in a social, satisfying way

Must do:
- show leaderboard / recap
- show session summary / history highlights
- support a shareable closing moment

Must not do:
- feel like a raw dashboard dump
- repeat too much operational UI from Courts

## 4. Failure patterns from the previous rebuilds
1. **Wrapper-not-replacement failure**
   - New shells were layered over old inner components
   - Result: product still felt like the old tool underneath

2. **Repeated first-fold failure**
   - Screens after Start still opened with intro / selling / framing content
   - Result: duplication and wasted vertical space

3. **Legacy route leakage**
   - Old variants, prototypes, and alternative paths remained active or conceptually present
   - Result: product did not feel singular or committed

4. **Operability regression**
   - Visual cleanup sometimes broke core flows like create session or start session
   - Result: polish appeared before reliability

5. **Courts buried under scheduler thinking**
   - Live board experience was not consistently the hero
   - Result: score entry and live running felt inherited instead of purpose-built

6. **Responsive sameness**
   - Mobile and iPad both remained functionally responsive but not meaningfully different in emphasis
   - Result: neither felt fully optimized for its real usage mode

## 5. Recommended simplifications
- Treat the app as one session runner, not a format platform
- Keep only five screens: Start / Setup / Players / Courts / Wrap
- Keep each screen focused on one job only
- Prefer utility bars, stat strips, and live cards over hero sections after Start
- Minimize copy; use labels, counts, and action-first layout
- Prefer direct score entry on the live board over hidden control panels
- Keep settings count low; only expose what materially changes how a real club night runs

## 6. Acceptance criteria for Builder
A Builder pass only counts if all are true:
- `/` is the clear main product path
- visible product is round-robin only
- 1 or 2 court setup is simple and fast
- Start is direct, not a sales page
- Setup opens directly on controls
- Players opens directly on roster work
- Courts opens directly on the live board
- score entry is obvious and usable
- next-up / waiting visibility is clear
- Wrap feels intentional and social, not like leftovers
- mobile feels player-priority by default
- iPad landscape feels kiosk-priority by default
- external Vercel link works
- commit hash and remaining gaps are reported honestly

## 7. Build philosophy for restart
Do not iterate by shaving pieces off the previous UI.
Recompose the product from the screen jobs upward.
Preserve the engine, but rebuild the experience as if the old interface never existed.