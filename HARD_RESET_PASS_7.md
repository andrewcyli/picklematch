# PickleMatch Hard Reset Pass 7

Owner: Henry
Date: 2026-03-22
Status: Approved Builder follow-up

## User direction
The horizontal scrolling section should become the single lightweight match rail for that court/session.
It should include:
- previous matches with scores
- current/live match
- upcoming matches

Therefore, the separate `Recent finishes` / `Recent matches` section should be removed.

## Required changes
### 1. Replace Up Next strip with unified Match Rail
The horizontal scroller should show a chronological rail of match cards around the selected/featured court context.

Card states:
- **Completed** — show score visibly on card
- **Live** — show current state clearly
- **Upcoming** — show upcoming matchup

Each card should stay compact and horizontally scrollable.

### 2. Completed cards
Completed match cards must show:
- teams/players
- final score
- clear completed visual state

This gives users a lightweight history view without needing a separate section.

### 3. Remove Recent finishes section
Delete the separate recent-finish/recent-match block from the Courts screen.
Do not replace it with another vertical section.
The match rail should absorb that function.

### 4. Keep rail compact
The rail must still be compact enough to avoid breaking the fold.
Use compact card design, not large detailed cards.

## Acceptance criteria
- one horizontal match rail includes completed/live/upcoming matches
- completed cards display scores
- separate recent finishes section removed
- no extra vertical history section added
- deploy to Vercel
- commit hash + live link + remaining gaps