# PickleMatch Hard Reset Pass 3

Owner: Henry
Date: 2026-03-22
Status: Approved Builder follow-up

## User correction
Andrew explicitly clarified the next UI rule using screenshots:
- the repeated stage stack / section navigation block should NOT appear again after Setup
- the repeated summary/hero/explainer area on later tabs should NOT consume the first fold
- maintain a bottom navigation for section switching
- each tab should show only its core feature
- minimize scrolling
- fit each tab's main feature within one fold on mobile where possible

## New product rule
After Setup, the interface should behave more like a compact tabbed app:
- persistent bottom navigation
- each tab = one core working surface
- no repeated stage ladder in page body
- no repeated big hero cards summarizing what the tab already is
- no wasted first-fold vertical space

## Required changes
### 1. Bottom navigation
Implement/keep a clear bottom navigation for the main sections:
- Setup
- Players
- Courts
- Wrap

Start can remain separate as the entry step, but once inside the session flow, navigation should be bottom-oriented rather than repeated in-page stage stacks.

### 2. Remove repeated in-body stage navigation
Remove the large repeated stage list / stage pills / stage stack from the body area on later screens.
That information should not occupy the first fold.

### 3. Remove repeated hero/explainer blocks after Setup
Especially on Courts and Wrap:
- do not lead with a large message card explaining the screen
- do not use valuable first-fold space for summary stats that can live in smaller utility chips or secondary rows
- the first fold should open directly on the real working feature

### 4. One-fold priority by tab
#### Setup
First fold should fit:
- essential setup controls
- save/continue CTA

#### Players
First fold should fit:
- roster counts
- quick add
- batch add access
- key visible roster area
- start session CTA

#### Courts
First fold should fit:
- current live court surface
- direct score inputs
- quick switch between courts if needed
- next-up/waiting visibility in compact form

Do NOT spend the fold on a big intro card.

#### Wrap
First fold should fit:
- winner/leaderboard summary
- recap/share action
- not a large explanatory banner

## Design principle
Compress chrome, not core function.
If space is tight, reduce:
- headings
- descriptive copy
- decorative framing
- repeated stats
before reducing operational visibility.

## Acceptance criteria
This pass only counts if:
- bottom nav is the main within-session navigation pattern
- repeated stage stack is removed from later screens
- big hero/explainer cards no longer consume first fold after Setup
- each main tab opens directly on its core feature
- mobile requires materially less scrolling
- live link updated
- commit hash + remaining gaps reported honestly