# PickleMatch Research Packet

**Date:** 2026-03-17  
**Prepared for:** Builder & Auditor  
**Context:** Baseline prototype assessment + competitive research → 3 prototype directions

---

## 1. Repo-Grounded Baseline Assessment

### Current State (What Exists)

**Scheduling Modes:**

| Mode | Implementation | File |
|------|---------------|------|
| Round-robin | Full | `src/lib/scheduler.ts` |
| Single-elimination | Full | `src/lib/tournament-scheduler.ts` |
| Double-elimination | Full | `src/lib/tournament-scheduler.ts` |
| Qualifier-tournament (pools → knockout) | Full | `src/lib/qualifier-tournament-scheduler.ts`, `src/lib/qualifier-progression.ts` |

**Core Features Observed:**

- **GameSetup.tsx**: Config UI for duration, courts, scheduling type, singles/doubles
- **ScheduleView.tsx**: Live match tracking, court timers, score entry, match editing
- **TournamentBracketView.tsx**: Visual bracket display with tabs for qualifier/knockout stages
- **Leaderboard.tsx**: Player rankings based on wins/points
- **MatchHistory.tsx**: Past match results
- **CheckInOut.tsx**: Player availability management
- **PlayerSetup.tsx**: Add/remove players, define teammate pairs

**Key Architectural Patterns:**

- Supabase-backed realtime sync (via `useRealtimeSync`)
- Game code join system (`?join=CODE`)
- Anonymous auth flow (`useAnonymousAuth`)
- Timer tracking per court (`courtTimers` Map)
- Match score validation (`src/lib/validation.ts`)

### What's Missing (Gap Analysis)

| Gap | Evidence | Priority |
|-----|----------|----------|
| Ladder system | No ladder logic in `lib/` | HIGH |
| Social/recurring scheduling | Static session only, no recurrence | HIGH |
| Self-serve player join | Setup flow requires organizer | HIGH |
| Matchup diversity scoring | Basic matchup tracking exists but no "fairness" score | MEDIUM |
| Bracket seeding | No seed input UI, random by default | MEDIUM |
| Waiting list | No waitlist or overflow queue | HIGH |

---

## 2. Competitor Patterns Worth Adopting

### Patterns to Adopt (Implementation Priority)

1. **Social Ladder Mode**
   - Players self-register with skill rating (1-5 or beginner/intermediate/advanced)
   - Weekly ladder updates based on match results
   - Challenge system (lower rank challenges higher)
   - Why: Unstructured social play is huge in pickleball communities

2. **Recurring Session Templates**
   - Save "Monday Night 6-8pm @ Courts 1-2" as template
   - One-click spawn new session from template
   - Copy player list from last session
   - Why: Most annoying friction is re-entering same players/courts

3. **Simplified Bracket View**
   - Current bracket UI is functional but dense
   - Add "tap match to score" - full-screen score entry
   - Highlight current/next match prominently

4. **Player Self-Registration**
   - Share game link → players add themselves (name + optional rating)
   - Organizer approves/removes
   - Waitlist when over capacity

---

## 3. Recommended Product Changes

### Quick Wins (Low Effort, High Impact)

| Change | File to Modify | Description |
|--------|---------------|-------------|
| Add "Save as Template" button | `GameSetup.tsx` | Persist game config to localStorage |
| Add player rating field | `PlayerSetup.tsx` | Simple 1-5 or Beginner/Int/Adv selector |
| Add waiting list | `PlayerSetup.tsx` | Mark overflow players as "waiting" |
| Show matchup history | `ScheduleView.tsx` | Show "last played: X vs Y" |
| Bracket seeding input | `GameSetup.tsx` | Allow drag-to-set seeds |

### Medium Effort Changes

| Change | New File | Description |
|--------|----------|-------------|
| Ladder scheduling | `src/lib/ladder-scheduler.ts` | Rank-based challenge matching |
| Recurring sessions | `src/lib/session-templates.ts` | CRUD for session templates |
| Self-serve player view | `src/components/PlayerSelfServe.tsx` | Limited view for non-organizers |

---

## 4. Three Prototype Directions

### Prototype A: "Social Ladder"

**Focus:** Casual Recurring Play

**Experience:**
- Players join with self-reported skill level
- Each session generates round-robin that prioritizes new matchups
- "Ladder board" shows rankings
- Challenge system: lower-ranked can challenge up

**Files to Create/Modify:**
- New: `src/components/LadderView.tsx`
- New: `src/lib/ladder-scheduler.ts`
- Modify: `src/components/PlayerSetup.tsx` (add rating)
- Modify: `src/lib/scheduler.ts` (add ladder mode)

**Success Metric:** Return rate

---

### Prototype B: "Tournament Night"

**Focus:** Bracket-Heavy Experience

**Experience:**
- Setup asks: "How many teams?" → spawns bracket immediately
- Visual bracket is primary UI (not schedule table)
- Auto-advance on score entry
- "Champion" celebration on final win

**Files to Create/Modify:**
- New: `src/components/BracketMatchModal.tsx`
- New: `src/components/SeedSetup.tsx`
- Modify: `src/components/TournamentBracketView.tsx` (improve UX)
- Modify: `src/components/ScheduleView.tsx` (tournament mode = bracket-first)

**Success Metric:** Tournament completion rate

---

### Prototype C: "Drop-In Drop-Out"

**Focus:** Flexible Session Management

**Experience:**
- Session has max capacity (e.g., 12 players)
- Players check in via game code
- When someone leaves, next in queue auto-promotes
- Waiting list visible to all

**Files to Create/Modify:**
- New: `src/components/WaitingListView.tsx`
- Modify: `src/components/CheckInOut.tsx` (promote to full component)
- Modify: `src/lib/scheduler.ts` (add dynamic roster support)
- New: `src/hooks/useActiveRoster.ts`

**Success Metric:** Session capacity utilization

---

## Summary

| Prototype | Target User | Core Problem Solved | Complexity |
|-----------|-------------|---------------------|------------|
| Social Ladder | Regulars at club | Skill matching, recurring community | Medium |
| Tournament Night | Event organizers | Bracket experience, seeding | Low-Medium |
| Drop-In Drop-Out | Social players | Flexible roster, waitlist | Medium |