# PickleMatch: Redesign IA/Screen-Flow Brief
## Build-Ready UX/UI Specification for Casual Social Play

**Date:** March 21, 2026  
**Version:** 2.0 (Complete Restart)  
**Focus:** Casual/social play nights — no tournament complexity  
**Core Logic Preserved:** Round-robin scheduler (`scheduler.ts`)

---

## 1. Design Philosophy

### The "Play Night" Mental Model
One person opens the app → creates a session → shares a code → everyone joins → plays → done. That's the entire experience. Anything that doesn't serve this 30-minute flow is cut.

### What We're Building
A **drop-in doubles session manager** for 4-16 players on 1-2 courts. Think "Friday night at the local court" — not "regional championship."

### What We're Deleting
- Tournament bracket views
- Qualifier/pool progression logic  
- Double elimination, single elimination
- Complex seeding interfaces
- Multi-division support
- Check-in/QR workflows
- Ladder/ranking systems
- Club/group entities

---

## 2. New Information Architecture

```
PickleMatch (SPA)
├── Landing → "Start or Join"
│   ├── Create Session (host flow)
│   └── Join with Code (player flow)
│
├── Session Home (shared by host + players)
│   ├── Court Status (live view)
│   ├── Roster (who's here)
│   ├── Schedule (round-robin matches)
│   └── Leaderboard (live stats)
│
└── Session Settings (host only)
    ├── Quick Config (courts, games to, score to)
    ├── Add/Remove Players
    └── End Session
```

**Key Shift:** Single screen per view, no tabs. Bottom navigation for session views.

---

## 3. Screen-by-Screen Specification

### 3.1 Landing Page (`/`)
**Purpose:** Entry point — decide what to do

**Layout:**
- Large "Start a Game" button (primary)
- "Join with Code" input field + button
- Recent sessions (if any, localStorage)

**Elements:**
- App logo + tagline: "Pickleball, Simplified"
- Bottom banner: AdSense (see Section 5)

**User Flow:**
1. Host taps "Start a Game" → Create Session
2. Player enters code → Join Session

---

### 3.2 Create Session (`/create`)
**Purpose:** Host configures the session in <30 seconds

**Layout:** Single card, scrollable if needed

**Fields:**
| Field | Type | Default | Notes |
|-------|------|---------|-------|
| Session Name | text | "Friday Night" | Auto-generated with date |
| # of Courts | toggle | 1 | 1 or 2 only (keep simple) |
| Games per match | picker | 2 | Best of 1, 2, or 3 games to 11 |
| Score to win | picker | 11 | 11 or 15 (no other options) |
| Rotation style | toggle | "Rotate all" | "Rotate all" or "Winners stay" |
| Session passcode | auto | 4-char | Editable, shown after creation |

**UX Micro-interactions:**
- Toggle switches for binary choices (smooth 200ms transition)
- Picker uses native iOS-style wheel
- Passcode shows in large monospace font, tap to copy

**Host Only:** After creation, host sees "Share Code: XXXX" screen with big QR code + copy button

---

### 3.3 Join Session (`/join`)
**Purpose:** Player enters a session

**Layout:** Centered card with code input

**Fields:**
- 4-character code input (auto-uppercase, auto-advance)
- "Your Name" text input (autocomplete from localStorage history)

**UX Micro-interactions:**
- Code input: 4 separate character boxes, keyboard auto-advances
- On success: Smooth transition to Session Home, player added to roster
- On failure: Shake animation + "Session not found" toast

---

### 3.4 Session Home (`/session/:id`)
**Purpose:** The main experience — what's happening now

**Layout:** Full-screen, no scrolling during active play. Bottom tab bar.

**Tabs:**
1. **Courts** (default) — Live court status
2. **Roster** — Who's playing, join/leave
3. **Schedule** — Match order
4. **Leaderboard** — Standings

---

### 3.4.1 Courts Tab (`/session/:id/courts`)
**Purpose:** "What game is on now?"

**Layout:** Card per court (1 or 2 cards stacked)

**Each Court Card Shows:**
```
┌─────────────────────────────────────┐
│ 🏟️ Court 1                         │
│ ─────────────────────────────────── │
│ 👥 Alex + Sarah  vs  Mike + Jamie  │
│                                     │
│ 📊 8 - 6                           │
│                                     │
│ ⏱️ Game 2 of 2                     │
│ 🎯 Match 4 of 12                   │
└─────────────────────────────────────┘
```

**States:**
- **Waiting:** "Waiting for players" + court number
- **On Court:** Current match with score
- **Between Matches:** "Next up in X min" + next players

**Score Entry (tap court card to expand):**
```
┌─────────────────────────────────────┐
│ Score: [8] - [6]                    │
│                                     │
│  +  +  +  +                        │
│  1  2  3  4                        │
│                                     │
│ [Save Score] [Undo Last Point]     │
└─────────────────────────────────────┘
```

**Host Power:** Only host (or designated scorekeeper) can edit score

---

### 3.4.2 Roster Tab (`/session/:id/roster`)
**Purpose:** Manage who's playing

**Layout:** List of player cards

**Player Card:**
```
┌─────────────────────────────────────┐
│ 👤 Alex                              │
│    Playing • 3 matches done         │
│                           [✕ Remove]│
└─────────────────────────────────────┘
```

**Features:**
- **Host only:** Can remove players (with confirmation)
- **Any player:** Can tap "Leave Session" (with confirmation)
- **Any player:** Can tap "+ Add Player" to invite by name (host + players can add)
- **Waiting list:** If session full (max 16), new players go to waitlist
- **Waitlist card:** Shows position, can tap to leave waitlist

**Mid-Session Join:**
- New player opens app → enters code → sees "Join [Session]?" → enters name → added to roster
- Automatically added to end of rotation
- If currently "waiting," gets queued for next round

---

### 3.4.3 Schedule Tab (`/session/:id/schedule`)
**Purpose:** See match order (round-robin)

**Layout:** Vertical list, grouped by round

**Each Match Row:**
```
┌─────────────────────────────────────┐
│ Round 1 • Match 3                   │
│ ─────────────────────────────────── │
│ Alex + Sarah vs Mike + Jamie        │
│ Court 1 • Completed ✓               │
└─────────────────────────────────────┘
```

**States:**
- **Pending:** Gray text, "Court TBD"
- **On Now:** Highlighted border (accent color), "Court 1"
- **Completed:** Shows score, checkmark

**UX Detail:** Tap match row → shows full match details (players, times, scores if multiple games)

---

### 3.4.4 Leaderboard Tab (`/session/:id/leaderboard`)
**Purpose:** See standings in real-time

**Layout:** Sorted table, auto-updates

**Columns:**
| Rank | Team | W | L | Pts For | Pts Against | +/- |
|------|------|---|---|---------|-------------|-----|
| 1 | Alex+Sarah | 4 | 0 | 44 | 28 | +16 |
| 2 | Mike+Jamie | 3 | 1 | 41 | 32 | +9 |

**Tiebreakers:** Point differential → Points for → Head-to-head

**UX Detail:** Tap any row → expands to show individual match results

---

### 3.5 Session Settings (`/session/:id/settings`)
**Purpose:** Host-only configuration

**Layout:** List of setting groups

**Groups:**
1. **Session Info** — Name, code, passcode
2. **Game Settings** — Courts, games per match, score to (changes apply next match)
3. **Advanced** — "Reset current round," "Regenerate schedule"
4. **End Session** — "Finish early" with confirmation

---

### 3.6 End-of-Session View (`/session/:id/results`)
**Purpose:** Celebration + shareable summary

**Layout:** Hero card + share button + stats

**Hero Card:**
```
┌─────────────────────────────────────┐
│         🏆 Friday Night Winners     │
│                                     │
│         Alex + Sarah                │
│           5-0 record                │
│                                     │
│         +88 point differential      │
└─────────────────────────────────────┘
```

**Below Hero:**
- Full leaderboard (collapsible)
- "Rematch?" button → starts new session with same players
- "Share Results" → generates image + copies to clipboard

**Bottom:** AdSense banner (see Section 5)

---

## 4. State Machine

```
[Create Session] → [Host Share Screen] → [Session Active]
                                              ↓
                   [Player Joins] ───────────→ [Session Active + Players]
                                              ↓
                   [Live Play] ─────────────→ [Round in Progress]
                                              ↓
                   [All Rounds Complete] ───→ [Results View]
                                              ↓
                   [Session Ended]
```

**Mid-Session Transitions:**
- Player joins → Added to end of rotation
- Player leaves → If currently queued, removed; if on court, marked "forfeit" for that match
- Court count changes → Schedule regenerates (preserves completed matches)

---

## 5. Google AdSense Placement Strategy

### Guiding Principle
Ads appear during **natural pause points** — never during active gameplay or decision-making moments. Trust preservation is paramount.

### Placement Map

| Screen | Placement | Format | Size |
|--------|-----------|--------|------|
| Landing | Bottom banner | Banner | 320x50 or 320x100 |
| Session Home → Roster | None | — | — |
| Session Home → Schedule | Bottom banner | Banner | 320x50 |
| Results | Top banner + bottom banner | Banner | 320x50 each |
| Join (failure) | None | — | — |

### Red Lines (Never)
- ❌ Never ads on Courts tab (active gameplay)
- ❌ Never interstitials between rounds
- ❌ Never video/animated ads (distracting)
- ❌ Never ads that look like app UI (trust violation)
- ❌ Never above "Start," "Join," or "Share" CTAs

### Visual Treatment
- Ads styled with subtle "Ad" label, grayed background
- Never match app accent colors
- Always allow "X" close on any interactive ad unit

---

## 6. Technical Notes

### Preserve from Current Codebase
| File | Purpose |
|------|---------|
| `src/lib/scheduler.ts` | Round-robin generation (keep intact) |
| `src/hooks/useRealtimeSync.ts` | Supabase realtime |
| `src/hooks/useAnonymousAuth.ts` | Player identity |
| `src/lib/validation.ts` | Score validation |

### Refactor Required
- `ClassicVariant.tsx` → Split into screen components above
- `PlayerSetup.tsx` → Simplify to name-only, inline add flow
- `ScheduleView.tsx` → Strip tournament features, keep round-robin display

### Delete Entirely
- `TournamentVariant.tsx`
- `QualifierVariant.tsx`
- `QuickCourtVariant.tsx`
- All bracket-view related components
- Seed management UI

### Data Model (Simplified)
```typescript
interface Session {
  id: string;
  code: string;
  hostId: string;
  name: string;
  settings: {
    courts: 1 | 2;
    gamesPerMatch: 1 | 2 | 3;
    scoreToWin: 11 | 15;
    rotationStyle: 'rotate-all' | 'winners-stay';
  };
  status: 'setup' | 'active' | 'completed';
  createdAt: number;
}

interface Player {
  id: string;
  sessionId: string;
  name: string;
  joinedAt: number;
  status: 'playing' | 'waiting' | 'left';
}

interface Match {
  id: string;
  sessionId: string;
  round: number;
  matchNumber: number;
  court: number | null;
  team1: [string, string];
  team2: [string, string];
  scores: { team1: number; team2: number }[];
  status: 'pending' | 'on-court' | 'completed';
}
```

---

## 7. Acceptance Criteria

- [ ] Host can create session in <30 seconds
- [ ] Players can join via 4-char code in <10 seconds
- [ ] Live score visible on Courts tab within 1 second of entry
- [ ] New players joining mid-session appear in rotation within 5 seconds
- [ ] Leaving players removed from schedule within 2 seconds
- [ ] Leaderboard updates in real-time
- [ ] Results screen generates shareable image
- [ ] Works fully offline (local state) with sync when online
- [ ] AdSense loads on Landing, Schedule (collapsed), Results only

---

## 8. Post-MVP Considerations (NOT in scope)

- Player skill ratings
- Session templates
- History/persistence across sessions
- Multiple venues
- Waitlist with auto-promote
- Map-based session discovery
- In-app chat

---

*End of Brief — Ready for Build*
