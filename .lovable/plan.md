

## Dynamic Player Changes Test Suite

Add new test cases to `src/lib/scheduler.test.ts` that simulate players leaving and joining mid-game, then validate the same requirements (no conflicts, fairness, rest, randomness) on the combined schedule.

### Approach

The tests will use the existing `regenerateScheduleFromSlot` function to simulate real-world scenarios:

1. Generate an initial schedule with N players
2. "Play" the first K slots (mark them as completed)
3. Modify the player list (add/remove players)
4. Call `regenerateScheduleFromSlot` with the new player list and played matches
5. Combine played + regenerated matches and validate all constraints

### Test Scenarios

**1. Player Leaves Mid-Game**
- Start with 11 players, play 5 slots
- Remove 1 player, regenerate remaining schedule
- Validate: no conflicts, fairness among remaining 10 players, rest constraints

**2. New Player Joins Mid-Game**
- Start with 10 players, play 5 slots
- Add 1 new player (total 11), regenerate remaining schedule
- Validate: no conflicts, new player gets fair play time in remaining matches (within +/-2 of other players' remaining match counts)

**3. Multiple Changes (2 leave, 1 joins)**
- Start with 12 players, play 5 slots
- Remove 2 players, add 1 new player (total 11), regenerate
- Validate all constraints on remaining schedule

**4. Various Player Counts with Mid-Game Changes**
- For player counts 8, 10, 11, 12, 14:
  - Play 5 slots, remove 1 player, add 1 different player
  - Validate conflict-free and fair distribution in remaining matches

**5. Fairness for New Players**
- Start with 10 players, play 8 slots
- Add 2 new players, regenerate remaining ~12 slots
- Verify new players' match count is within 2 of average remaining match count for existing players (from slot 8 onwards only)

### Validation Rules (same as existing tests, applied to combined/remaining schedule)

- **No conflicts**: No player in two matches at the same time slot
- **No duplicates**: No player appears twice in the same match
- **Fairness (remaining matches only)**: For players present in the regenerated portion, max-min match count difference is no more than 2
- **Consecutive play**: No player plays more than 3 consecutive slots
- **Wait time**: No excessive gaps between matches

### Technical Details

**File modified**: `src/lib/scheduler.test.ts`

A new `describe("Dynamic Player Changes")` block will be added containing all the scenarios above. Each test will:

```
1. const initialMatches = generateSchedule(initialPlayers, ...)
2. const playedMatches = initialMatches.filter(m => m.startTime < cutoffSlot * GAME_DURATION)
3. const regenerated = regenerateScheduleFromSlot(
     newPlayers, playedMatches, cutoffSlot * GAME_DURATION,
     GAME_DURATION, TOTAL_TIME, COURTS
   )
4. Validate regenerated matches against all constraints
```

For fairness of new players, only matches from the regeneration point onward are counted, since new players obviously have zero matches before they joined.

