# PickleMatch Hard Reset Pass 6

Owner: Henry
Date: 2026-03-22
Status: Approved Builder follow-up — URGENT UI FIX

## User feedback
The Up Next horizontal scroll is broken. It does not scroll — the cards overflow and break the layout. The UI is broken, not just imperfect.

## Required fixes

### 1. Up Next scroll strip — BROKEN, fix immediately
The horizontal scroll container is not working. Cards are overflowing and breaking the page layout instead of scrolling.

Fix requirements:
- the container MUST actually scroll horizontally
- cards must NOT overflow the viewport width
- use `overflow-x: auto` or `overflow-x: scroll` on the container
- use `flex-shrink: 0` on each card so they don't collapse
- use `max-width: 100vw` or container width constraint so the strip stays within bounds
- test that swiping/scrolling actually works on mobile touch

Card content fix:
- cards are showing too much text that truncates badly
- simplify card content to: match number + team names only (2 lines max)
- no verbose match detail text

### 2. Recent finishes score layout — broken UX
Score inputs are massive horizontal bars with single digits floating in them. Second score is nearly invisible / cut off.

Fix:
- use a compact inline format: `Team A [score] — [score] Team B`
- score inputs should be small square boxes (e.g. 40x40px), not full-width bars
- both scores must be visible and tappable
- save button inline or as a small icon, not a large bar

### 3. Overall scroll / overflow audit
Since the scroll implementation broke the layout, audit all horizontal scroll containers in the app to ensure none are overflowing the viewport.

## Acceptance criteria
- Up Next horizontal scroll actually scrolls on mobile
- no viewport overflow / broken layout
- cards show simplified content that doesn't truncate badly
- recent finishes use compact inline score format
- deploy to Vercel
- commit hash + live link