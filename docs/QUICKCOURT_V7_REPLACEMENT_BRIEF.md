# Quick Court Replacement Redesign v7 - Implementation Brief

**Critical Correction:** The requirement is to overhaul UX/UI while keeping core logic — **old UX must be replaced, not wrapped**.

---

## Current Problem

QuickCourtVariant.tsx has **5 tabs** with significant UX duplication:
- `setup` → entry + config mixed together
- `players` → check-in/out + pair locking + match generation
- `matches` → live courts + ScheduleView (dual rendering)
- `leaderboard` → standalone stats page
- `history` → separate recap screen

**The Flow Tracker shows progress, but the underlying screens still wrap old components:**
- `QuickEntryCard` / `GameSetup` overlap
- `CheckInOut` + `QuickAddPlayersCard` + `PlayerSetup` overlap
- `QuickCourtBoard` + `ScheduleView` render simultaneously (duplicative)

---

## Target Information Architecture

### 5 Distinct Screens (No Duplication)

| Screen | Purpose | Old Component to Replace |
|--------|---------|------------------------|
| **1. Entry** | Join/Create session | `QuickEntryCard` (simplify) + code entry |
| **2. Setup** | Round-robin config only | `GameSetup` (strip to essentials) |
| **3. Players** | Roster management only | `CheckInOut` + `QuickAddPlayersCard` (merge) |
| **4. Courts** | Live session board | `QuickCourtBoard` + `ScheduleView` (pick ONE) |
| **5. Recap** | End-of-session summary | `Leaderboard` + `MatchHistory` (merge) |

---

## Replacement Screen Definitions

### Screen 1: Entry (Join/Create)
**Route:** `/quickcourt` (unstarted state)

**Components:**
- `EntryCard` — Create session (single button)
- `JoinCard` — Enter 6-char code
- No config here — move straight to Setup after create

**Remove from this screen:**
- Any "Quick Start" options (duration/courts sliders) — those go to Setup
- Hero stats (Code/Players/Courts) — show after session created

---

### Screen 2: Setup
**Route:** `/quickcourt/setup` (after create, before players set)

**Components:**
- `RoundRobinConfig` — simplified GameSetup:
  - Doubles/Singles toggle
  - Duration: 1h / 90m / 2h (no 30m)
  - Courts: 1 or 2 (hardcoded, no "add court")
  - No tournament type selector
- "Continue to Players" button

**Remove:**
- Teammate pairs UI (that's Players screen)
- Scheduling type selector (always round-robin)
- Advanced court configs

---

### Screen 3: Players
**Route:** `/quickcourt/players`

**Components:**
- `PlayerRoster` — single list with check-in toggle
- `QuickAddBar` — inline text input (no modal)
- `PairLockToggle` — optional doubles pairing
- "Generate Matches" button (one-time action)

**Remove from this screen:**
- `QuickAddPlayersCard` as separate card — merge into inline
- `CheckInOut` complexity — simplify to toggle + remove
- Match generation UI — auto-redirect to Courts after generation

---

### Screen 4: Courts (Live Session Board)
**Route:** `/quickcourt/courts` — **this is the main screen**

**Components:**
- `LiveCourtView` — one court visible, swipe/tab for second
- `NextUpQueue` — compact queue for each court
- `ScoreEntryModal` — tap match → big buttons for scoring
- `BenchPanel` — waiting players (collapsible sidebar)

**This is the ONLY screen for running the session.**
- No parallel `ScheduleView` rendered
- No dual-court dashboard (too cluttered) — use tab/swipe

**Remove:**
- `ScheduleView` from main view (keep as modal for editing)
- Live leaderboard snapshot card (move to Recap)
- "Next around the room" section (move to Recap or hide)

---

### Screen 5: Recap
**Route:** `/quickcourt/recap` (triggered on "End Session")

**Components:**
- `SessionSummary` — winner, most games, participation
- `FinalLeaderboard` — wins + games played (simplified)
- `MatchHistory` — all completed matches (compact)
- `ShareCard` — generate image for Discord/WhatsApp

**Remove:**
- Separate "History" tab entirely — merge into Recap
- Detailed stats (point differential, D/G) — not relevant for casual
- Tournament-style ceremony — keep it lightweight

---

## UX Elements to Remove Entirely

| Element | Status | Reason |
|---------|--------|--------|
| FlowTracker | **Remove** | Replaced by clear screen flow |
| Hero stat cards on every screen | **Remove** | Show only on Entry, then in Courts header |
| `ScheduleView` inline | **Replace** | Keep as modal only |
| `MatchHistory` standalone | **Merge** | Into Recap screen |
| `Leaderboard` standalone | **Merge** | Into Recap screen |
| 5-tab bottom nav | **Replace** | With 4-tab: Start / Players / Courts / Recap |
| Dual-court dashboard | **Simplify** | Tab/swipe between courts |

---

## UX Elements to Preserve (Logic Only)

| Component | Preserve As | Notes |
|-----------|-------------|-------|
| `generateSchedule()` | Core logic | Round-robin only, no tournament branches |
| `CheckInOut` logic | `usePlayerRoster` hook | Check-in/out state management |
| Supabase sync | Keep | `games` table, realtime |
| Game code join | Keep | Same 6-char flow |
| Match scoring | Keep | Score entry modal, not inline |
| Queue management | Keep | Waitlist logic, auto-advance |

---

## Implementation Order

1. **Week 1:** New 4-tab navigation + Entry screen (no old wrapper)
2. **Week 2:** Setup screen (simplified GameSetup)
3. **Week 3:** Players screen (merge CheckInOut + QuickAdd)
4. **Week 4:** Courts screen (replace QuickCourtBoard + ScheduleView dual)
5. **Week 5:** Recap screen (merge Leaderboard + History + share card)
6. **Week 6:** Cleanup — remove FlowTracker, old wrapper components

---

## Success Criteria

- [ ] No screen renders both old + new component side-by-side
- [ ] Each screen has ONE primary function
- [ ] Navigation is 4 tabs max (Start → Players → Courts → Recap)
- [ ] Entry → Setup → Players → Courts is a linear flow
- [ ] "End Session" triggers Recap, not History tab
- [ ] No duplication between Courts header stats and sidebar widgets
