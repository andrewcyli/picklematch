# PickleMatch Hard Reset Pass 8

Owner: Henry
Date: 2026-03-22
Status: Approved Builder follow-up

## User direction
- remove the crossed-out / redundant section from Courts
- the match rail is now the single historical match-history surface
- by default, the rail should anchor at the next match
- users can scroll backward for history and forward for later matches

## Required changes
### 1. Remove redundant section
Delete the extra crossed-out / redundant section from the Courts screen entirely.
Do not replace it with another duplicate block.

### 2. Match rail becomes canonical history/schedule surface
The horizontal match rail should be the single compact place to understand:
- completed matches with scores
- the next relevant match
- later scheduled matches

### 3. Default rail anchor
When the Courts screen loads, the rail should default to the next match card as the focal position.
If implementation is easier, centering the next match card or scrolling it into initial view is acceptable.

### 4. Scroll model
- scroll backward = older completed matches
- scroll forward = upcoming matches

## Acceptance criteria
- redundant crossed-out section removed
- no duplicate history block remains
- match rail is the only history/schedule strip
- rail defaults to the next match position
- deploy to Vercel
- commit hash + live link + remaining gaps