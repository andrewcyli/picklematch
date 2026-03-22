# Quick Court v4 - Flow Refinement Brief

**Goal:** Non-duplicate screens with clear linear flow, optimized for mobile.

---

## Screen Flow (v4 Target)

```
[1. ENTRY] ─→ [2. SETUP] ─→ [3. PLAYERS] ─→ [4. COURTS] ─→ [5. WRAP]
                 ↓              ↓              ↓              ↓
            (join/code)    (add names)    (live boards)   (leader+history)
```

---

## Screen-by-Screen Specification

### 1. ENTRY (Home) - "Join or Create"
**Current:** QuickEntryCard shows both options with explanatory text and 3-step process cards.
**Refinement:**
- Strip to minimum: Two big buttons only
- NO process explanation cards — move that to onboarding or help
- Single-purpose: join (code input) OR create (immediate action)

**Layout:**
```
┌─────────────────────────────┐
│  ⚡ Quick Court             │
│                             │
│  [  CREATE SESSION  ]       │  ← Primary, full-width
│                             │
│  ─────── or ───────        │
│                             │
│  [ Enter code to join ]     │  ← Secondary, collapses to input+button
└─────────────────────────────┘
```

**Action on Create:** Immediately trigger game creation → advance to SETUP (no popup)

---

### 2. SETUP (Round-Robin Config) - "Quick Config"
**Current:** Full GameSetup component with many options.
**Refinement:**
- Round-robin ONLY (remove tournament/doubles format selection)
- Expose only what varies per session:
  - Number of courts (slider: 1-6)
  - Game duration (preset chips: 10/15/20 min)
  - Total session time (preset chips: 1h/1.5h/2h/2.5h)
- Hide court configuration (advanced) under "More options" expandable
- NO "start playing" in this screen — "Generate courts" button

**Layout:**
```
┌─────────────────────────────┐
│  ⚡ Quick Court • Setup     │
│                             │
│  Courts        [1] [2] [3]  │  ← Or slider
│              [4] [5] [6]    │
│                             │
│  Game length    [10] [15]   │
│                  [20] min   │
│                             │
│  Total time     [1.5] [2]   │
│                  [2.5] h    │
│                             │
│  [  Generate Courts  ]      │
└─────────────────────────────┘
```

---

### 3. PLAYERS (Roster) - "Quick Add"
**Current:** Split between QuickAddPlayersCard + CheckInOut. Two different sections.
**Refinement:**
- Single unified card at top: textarea for bulk paste + "Add" button
- Below: compact player chips list (not full table)
- "Generate schedule" button (prominent, bottom-fixed on mobile)
- Walk-in addition stays fast: just type name + Enter

**Layout:**
```
┌─────────────────────────────┐
│  ⚡ Quick Court • Players   │
│                             │
│  [Paste names here...]  [+] │
│  (comma or line separated) │
│                             │
│  Maya • Theo • Jules •     │  ← Chips with × to remove
│  Iris • Sam • Lee •        │
│                             │
│  ──────────────────────    │
│  8 players • Ready         │
│                             │
│  [  Load Courts  ]          │  ← Fixed bottom on mobile
└─────────────────────────────┘
```

**After schedule generated:** Auto-advance to COURTS.

---

### 4. COURTS (Live Board) - "Dual-Court Glance"
**Current:** Shows all courts in a column, plus sidebar with bench/next/leaderboard.
**Refinement for Mobile:**
- Show BOTH courts inline in a single card per court
- Each court card shows: "NOW" (live) + "NEXT" (queued) side by side
- Single scroll — no tabs

**Mobile Layout (Priority):**
```
┌─────────────────────────────┐
│  ⚡ Quick Court • Courts    │
│                             │
│  ┌─────────────────────────┐│
│  │ COURT A          🟢Live ││
│  ├─────────────────────────┤│
│  │ Now: Maya+Theo vs       ││
│  │      Jules+Iris         ││
│  │ ─────────────────────── ││
│  │ Next: Sam+Lee vs        ││
│  │      Zoe+Ben            ││
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│
│  │ COURT B        🟡Next   ││
│  ├─────────────────────────┤│
│  │ Now: (waiting)          ││
│  │ Next: (waiting)         ││
│  └─────────────────────────┘│
│                             │
│  [Score] button per match  │
│                             │
│  Bench: Lee, Sam, Zoe...   │  ← Collapsible "Show waiting"
└─────────────────────────────┘
```

**Desktop:** Side-by-side court cards in 2-column grid, plus right rail for bench/next.

**Key principle:** Organizer sees EVERYTHING at a glance without scrolling or switching tabs.

---

### 5. WRAP (Leaderboard + History) - Combined View
**Current:** Separate leaderboard and history sections.
**Refinement:**
- Merge into single "Wrap Up" screen
- Top: Compact leaderboard (top 5 only)
- Below: Match history (collapsible cards)
- Single "End session" button

**Layout:**
```
┌─────────────────────────────┐
│  ⚡ Quick Court • Wrap Up   │
│                             │
│  🏆 Leaders                 │
│  1. Maya (85%)              │
│  2. Theo (72%)              │
│  3. Jules (68%)             │
│                             │
│  📋 Results                 │
│  ├─ Court A: Maya+Theo >    │
│  │        Jules+Iris 11-9   │
│  ├─ Court B: Sam+Lee vs     │
│  │        Zoe+Ben 11-7      │
│  └─ ...                     │
│                             │
│  [  End Session  ]          │
└─────────────────────────────┘
```

---

## What to REMOVE / MERGE

| Remove | Reason |
|--------|--------|
| "Start" explanation cards (3-step intro) | Duplicates entry — no one reads this |
| FlowTracker component (top stepper) | Adds visual noise, linear flow is clear enough |
| Separate History tab | Merge into Wrap (reduces nav items) |
| "Detailed controls" ScheduleView in Courts | Only show when explicitly expanded |
| Tournament/scheduling type selector | Round-robin only in Quick Court |
| Full bench list on Courts (sidebar) | Move to expandable on mobile |

| Merge | Reason |
|-------|--------|
| Leaderboard + History | Single wrap-up screen |
| QuickAddPlayersCard + CheckInOut | Single player management section |
| Court A + Court B + ... in sidebar | Inline cards with Now/Next |

---

## Navigation Structure (v4)

**Bottom nav items:**
1. **Start** (Setup/Entry)
2. **Players** (Roster)
3. **Courts** (Live board — DEFAULT after game starts)
4. **Wrap** (Leaderboard + History)

**Removed:** "Leaders" and "Done" as separate tabs — merged into Wrap.

---

## Information Hierarchy by Screen

| Screen | Primary Info | Secondary | Tertiary |
|--------|--------------|-----------|----------|
| Entry | Action (Join/Create) | — | — |
| Setup | 3 sliders/chips | — | — |
| Players | Player list | Add field | Generate button |
| Courts | Live + Next per court | Bench count | Score buttons |
| Wrap | Leaderboard | Recent results | End session |

---

## Mobile Considerations

- **Bottom nav:** Fixed, thumb-accessible
- **Courts:** Cards stack vertically, show Now/Next inline
- **Input:** Large touch targets, no hover states
- **Buttons:** Full-width on mobile, bottom-fixed CTAs

---

## Summary

- **5 screens** instead of current complexity
- **No popups** — all actions inline
- **Courts view** is the killer feature: live + next at a glance
- **Leaderboard + History merged** into Wrap
- **Round-robin only** — no format selection friction
