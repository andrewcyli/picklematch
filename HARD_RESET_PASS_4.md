# PickleMatch Hard Reset Pass 4

Owner: Henry
Date: 2026-03-22
Status: Approved Builder follow-up

## User feedback (4 items)

### 1. Visual consistency — club theme
Some UI elements are still too light / too bright and break the dark club-night feel.
Fix: audit all surfaces, cards, inputs, buttons, and backgrounds. Ensure consistent dark/green club-night palette throughout. No bright white panels or washed-out elements that break the aesthetic.

### 2. Live Courts — score + team/player layout alignment
The current score and team/player name layout mixes parallel and vertical alignment inconsistently.
Fix: pick ONE consistent layout for the live court cards:
- either both teams displayed in parallel columns (side by side) with scores aligned
- or both teams stacked vertically with scores next to each team
Whichever is chosen, it must be consistent across Court 1 and Court 2 and feel intuitive at a glance.

### 3. Coming up matches — horizontal scroll to save vertical space
The upcoming/next matches list currently takes too much vertical space.
Fix: implement a horizontal scrolling container for coming-up matches. This saves vertical fold space and keeps the live court surface dominant.

### 4. Player names — multilingual support (Chinese etc.)
Player names currently don't render Chinese characters properly.
Fix: ensure player name input, storage, display, and all roster/court/wrap surfaces support multilingual text including Chinese, Japanese, Korean, emoji, etc. This means:
- input fields must accept Unicode
- display must not truncate or break on CJK characters
- font stack must include CJK-capable fallbacks

## Acceptance criteria
- no bright/light UI elements breaking the dark club-night theme
- live court score + team layout is consistently aligned (parallel or vertical, not mixed)
- coming-up matches use horizontal scroll instead of vertical list
- Chinese player names work end-to-end: input → roster → courts → wrap
- deploy to Vercel
- commit hash + live link + remaining gaps