# PickleMatch Hard Reset Pass 5

Owner: Henry
Date: 2026-03-22
Status: Approved Builder follow-up

## User feedback (3 items)

### 1. Coming up matches scroll — too wide, occupies whole screen
The horizontal scroll implementation made each card too wide, so the "coming up" section takes a whole horizontal screen instead of feeling like a compact scrollable strip.
Fix: make the coming-up match cards much more compact (narrower cards, smaller text, denser layout). The scroll container should show 2-3 cards visible at once on mobile so it actually feels like a scrollable list, not a single full-width card per swipe.

### 2. Merge "Queue" and "Up Next" into one section
"Queue" and "Up Next" serve the same purpose — showing what's coming.
Fix: collapse them into a single "Up Next" section. One compact horizontal scroll strip showing upcoming matches in order. No separate queue and up-next areas.

### 3. Player view — dark theme still inconsistent
The player view (MyMatchesView) still has bright/light cards for "Playing Now", "Up Next", and the player status card at top.
Fix: audit the entire player view and apply the same dark club-night theme. All cards, backgrounds, text colors must match the host/organizer view darkness. No remaining bright white or light-toned cards.

## Additional observations to fix
### 4. Score input visibility
Score input fields on the Courts live cards are dark-on-dark and hard to see.
Fix: add visible borders, subtle background contrast, or placeholder text so users can clearly see where to tap and what value is entered.

### 5. Recent finishes — compress
The recent finishes / completed matches editing area takes too much vertical space with large empty-looking score edit bars.
Fix: compress completed match cards to be much smaller. Score editing for completed matches can use inline compact inputs, not full-height bars.

## Acceptance criteria
- coming-up matches show 2-3 compact cards visible at once in the scroll strip
- queue and up-next merged into one "Up Next" section
- player view fully dark-themed, no bright cards remaining
- score inputs are clearly visible with adequate contrast
- recent finishes are vertically compact
- deploy to Vercel
- commit hash + live link + remaining gaps