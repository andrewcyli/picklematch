# PickleMatch Hard Reset Pass 2

Owner: Henry
Date: 2026-03-22
Status: Approved Builder follow-up

## Goal
Continue the hard reset by fully replacing the remaining visibly borrowed sub-surfaces in **Courts** and **Wrap**.

The previous hard reset pass created a real new top-level product structure, but Builder reported that these internal surfaces still partially inherit from reused legacy components:
- `ScheduleView`
- `Leaderboard`
- `MatchHistory`

This pass should make Courts and Wrap feel native to the new product, not like older dashboard/scheduler layers inside a new shell.

## Scope
### 1. Courts reset continuation
Rebuild the visible Courts internals so the live session feels purpose-built.

Must prioritize:
- Court 1 live card
- Court 2 live card (if applicable)
- direct score controls on or immediately adjacent to current match cards
- next-up preview per court
- waiting / bench visibility
- clear live action controls

Should avoid:
- scheduler-tool hierarchy
- generic schedule table feel
- controls hidden behind old detail surfaces
- explanatory/dashboard copy

If older logic from `ScheduleView` is reused, it should be fully hidden behind a new visual structure.

### 2. Wrap reset continuation
Rebuild the visible Wrap internals so the session close feels intentional and social.

Must prioritize:
- leaderboard summary
- session recap
- clear share/export/closing moment
- lightweight history below the primary wrap surface

Should avoid:
- raw dashboard dump feel
- old leaderboard/history visual styling
- overly dense analytics-first layout

If older logic from `Leaderboard` / `MatchHistory` is reused, it should be fully hidden behind a new wrap-specific surface.

### 3. Mobile vs iPad emphasis improvement
Improve the visible hierarchy split further:
- mobile = compact player-priority flow
- iPad landscape = more obvious kiosk / venue-priority layout

This does not need to be perfect final art direction, but it should be visibly more intentional than the prior pass.

## Acceptance criteria
This pass only counts if:
- Courts no longer visibly feels like reused `ScheduleView`
- Wrap no longer visibly feels like reused leaderboard/history leftovers
- score entry remains operational and easy to reach
- next-up / waiting remain obvious
- mobile/iPad hierarchy difference becomes more visible
- live link is updated
- commit hash and remaining gaps are reported honestly
