# Quick Court Implementation Brief

**Goal:** Evolve Quick Court (ClassicVariant) into the main product — lightweight, casual, fast round-robin pickleball nights. 1-2 courts max.

---

## 1. Information Architecture

### Current Tabs (5)
`Setup` → `Players` → `Matches` → `Standings` → `History`

### Proposed (3-4 tabs max)
- **Play** (replaces "Matches") — the main court view
- **Players** — check-in/out roster
- **Results** (replaces "Leaderboard") — standings + session recap
- **Settings** (replaces "Setup") — quick config

**Rationale:** Collapse Setup into a single-screen "new session" flow. Hide History unless needed.

---

## 2. Session Flow

```
[Landing] → [Quick Start] → [Add Players] → [Court View] → [Session Recap]
               ↓                     ↓              ↓
         Single/Doubles       Check-in/out    Live scores
         Duration/Courts      Auto-queue     Next up
```

### Quick Start Screen
- **Two big buttons:** "Doubles" / "Singles"
- **Sliders:** Duration (30m/1h/90m), Courts (1-2)
- **No hidden complexity:** That's it. No "tournament type" selector.

### Players Screen (Check-in/out)
- **Two columns:** Available | On Court
- **Drag to swap** or tap to toggle
- **Quick add:** Type name → Enter (no modal)
- **"Ready to play" indicator** — show who's next
- **Remove = swipe or long-press** (no confirmation dialog for casual flow)

### Court View (The Core)
- **One visible court** (with "Court 2" toggle for 2-court sessions)
- **Big score buttons:** Tap to increment, hold to set
- **"Next up" preview** — show next 2 teams waiting
- **Auto-advance:** Score 11 → prompt "Next?" → auto-populates
- **Timer** — optional, per-match stopwatch

### Session Recap (End of night)
- **Auto-generated on "End Session":**
  - Winner of the night (highest win %)
  - Most improved / Most games played
  - Shareable image card
- **One-tap share** to Discord/WhatsApp

---

## 3. Court Management UX (1-2 Courts)

### Single Court
- Full-screen score view
- "Who's next?" queue visible below

### Two Courts
- **Tab bar** or **swipe** between courts
- **"All courts" dashboard** showing both scores at once (collapsed)
- Courts are independent — different games can run simultaneously

### Queue Logic
- **Waitlist** (not full schedule): Players opt-in, system auto-queues
- **No pre-generated schedule** — generate next match on the fly
- **Balance by wins** when possible (simple algorithm)

---

## 4. Player Check-in/Check-out Flow

### Check-in
1. Open app → Enter name → Auto-added to queue
2. Or: Organizer adds names as people arrive
3. "I'm here!" toggle for self-check-in

### Check-out
1. Tap name → "Leaving?"
2. Mark as "Done for the night" or "Taking a break"
3. If taking break: auto-pause their queue position (5-10 min)

### Dynamic Reroll
- When player leaves mid-session: auto-rebalance teams
- Preserve in-progress match, regenerate next

---

## 5. Leaderboard / Social Recap Moments

### During Session
- **Minimal leaderboard:** Just top 3, small text below court view
- **No obsessive stats:** Skip point differential, D/G, etc.
- **Show:** Wins, games played, current streak

### End of Session (The "Gram" Moment)
- **Shareable card:**
  - "🏓 Thursday Night Pickleball"
  - Date + duration
  - Leaderboard top 3
  - "Most games: [Name]"
  - QR code to rejoin next time

### Sharing
- Generate image locally (canvas)
- Share to: Discord, WhatsApp, Photos
- Copy text summary

---

## 6. Visual Simplification

### Remove
| Remove | Reason |
|--------|--------|
| TournamentVariant | Discarded — not casual |
| QualifierVariant | Discarded — not casual |
| Bracket view | Overkill for round-robin |
| Double elimination logic | Not relevant |
| Ladder rankings | Too competitive |
| Point differential stats | Too granular |
| Round-by-round schedule preview | Generate on-the-fly |
| "History" tab | Keep only as "past sessions" in settings |

### Simplify
| Simplify | How |
|----------|-----|
| Setup | Single screen, not multi-step wizard |
| Navigation | 4 tabs max, not 5 |
| Score entry | Big tap buttons, not dropdowns |
| Player management | Swipe/tap, not drag-drop modal |
| Court config | Hardcode to 1-2 courts, no "add court" UI |

---

## 7. Technical Notes

### Preserve from Current Codebase
- `ClassicVariant.tsx` — foundation to build on
- `ScheduleView.tsx` — court logic (strip tournament branches)
- `PlayerSetup.tsx` — player management (simplify)
- `Leaderboard.tsx` — reduce stats complexity
- `CheckInOut.tsx` — refine for quick toggle
- Supabase sync — keep for multiplayer

### New Components Needed
- `QuickCourtSession.tsx` — main orchestrator
- `CourtCard.tsx` — reusable court view
- `QueuePanel.tsx` — waitlist management
- `SessionRecap.tsx` — shareable end-of-night card
- `PlayerQuickAdd.tsx` — inline add

### Database
- Keep existing `games` table
- Simplify `matches` — remove tournament/qualifier metadata fields
- Add `sessionType`: 'quick' | 'tournament' (for future)

---

## 8. Quick Wins (MVP)

1. **Strip ClassicVariant to 4 tabs** — remove History, merge Setup into Players
2. **Single-screen setup** — two buttons + sliders
3. **Auto-queue** — replace full schedule with waitlist
4. **Simplified leaderboard** — just wins + games played
5. **Session recap card** — generate on "End Session"

---

## Summary

Quick Court = **Casual drop-in, not competitive tournament.**

- Fewer clicks to first game
- Queue > Schedule
- One court at a time focus
- Fun recap at the end
- No bracket anxiety
