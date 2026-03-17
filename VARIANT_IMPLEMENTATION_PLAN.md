# PickleMatch Multi-Variant Implementation Plan

## Executive Summary

This document outlines a concrete implementation strategy for deploying **3 distinct prototype variants** of PickleMatch from the current monolithic codebase (`src/pages/Index.tsx` ~650 lines). The goal is to enable parallel A/B testing while preserving the legacy application's stability.

---

## 1. Current Baseline Analysis

### Repository Structure (Inspected Files)

```
/Users/drewclaw/.openclaw/workspace/picklematch/
├── src/
│   ├── App.tsx                    # React Router entry (currently single route "/")
│   ├── pages/
│   │   └── Index.tsx              # MONOLITH: ~650 lines, contains ALL state + UI
│   ├── components/
│   │   ├── GameSetup.tsx          # Configuration UI (scheduling type, courts, duration)
│   │   ├── CheckInOut.tsx         # Player roster management wrapper
│   │   ├── PlayerSetup.tsx        # Player CRUD + teammate pairing
│   │   ├── ScheduleView.tsx       # Match scheduling display + scoring (~1000+ lines)
│   │   ├── MyMatchesView.tsx      # Player-centric match view
│   │   ├── Leaderboard.tsx        # Tournament standings
│   │   ├── MatchHistory.tsx       # Completed matches log
│   │   ├── BottomNav.tsx          # Navigation tabs
│   │   ├── GameCodeDialog.tsx     # Join/Create game modal
│   │   └── PlayerIdentitySelector.tsx  # Player self-identification
│   ├── lib/
│   │   ├── scheduler.ts           # Match generation algorithms + Match type
│   │   ├── tournament-scheduler.ts      # Single/Double elimination brackets
│   │   ├── qualifier-tournament-scheduler.ts  # Group stage + knockout
│   │   ├── tournament-progression.ts    # Bracket advancement logic
│   │   ├── qualifier-progression.ts     # Group standings progression
│   │   ├── player-identity.ts     # localStorage identity persistence
│   │   ├── safe-storage.ts        # Storage wrapper with error handling
│   │   └── debug-logger.ts        # Diagnostic logging
│   ├── hooks/
│   │   ├── use-player-identity.ts # Player view state management
│   │   ├── use-player-matches.ts  # Player's match filtering
│   │   ├── use-player-notifications.ts  # Match reminders
│   │   └── use-stopwatch.ts       # Timer functionality
│   └── integrations/supabase/
│       ├── client.ts              # Supabase connection
│       └── types.ts               # Database types
├── package.json                   # React 18 + Vite + react-router-dom@6
└── vite.config.ts                 # Build config with manual chunks
```

### Current State Model (from Index.tsx)

```typescript
type Section = "setup" | "players" | "matches" | "history" | "leaderboard";

// Core state (all in Index.tsx)
- activeSection: Section              // BottomNav current tab
- players: string[]                   // Roster
- matches: Match[]                    // Generated schedule
- gameConfig: GameConfig | null       // Duration, courts, schedulingType
- gameId: string | null               // Supabase game ID
- gameCode: string                    // 6-char join code
- matchScores: Map<string, {team1, team2}>  // Completed match scores
- userId: string | null               // Anonymous auth user
- playerName: string | null           // Self-identified player (from usePlayerIdentity)
- isPlayerView: boolean               // Toggle between organizer/player mode
```

### Key Scheduling Modes (from GameSetup.tsx)

| Mode | Description | Player Count |
|------|-------------|--------------|
| `round-robin` | Social play, everyone plays multiple games | 4+ |
| `qualifier-tournament` | Group stage → knockout (4-24 teams) | 8-48 players |
| `single-elimination` | One loss = out, requires 4/8/16 teams | 4-32 players |
| `double-elimination` | Losers bracket, requires 4/8/16 teams | 4-32 players |

---

## 2. Three Variant Definitions

### Variant A: "QuickMatch" — Minimalist Social Play
**Target Use Case:** Casual pickup games where friends just want to start playing immediately without tournament complexity.

**Key Differences from Baseline:**
- **Remove:** Tournament modes (only Round Robin)
- **Remove:** Leaderboard, Match History sections
- **Remove:** Player identity/self-selection (simpler check-in)
- **Remove:** Teammate pairing constraints
- **Simplify:** Single-page flow (Setup → Players → Live Matches) with no bottom nav
- **Add:** Quick share via native share API (mobile-first)
- **Default:** 10-min games, 2 courts, auto-optimize for max rotations

### Variant B: "TournamentPro" — Competitive Organizer
**Target Use Case:** Club organizers running structured tournaments with brackets, standings, and progression tracking.

**Key Differences from Baseline:**
- **Remove:** Round-robin mode (tournament-only)
- **Enhance:** Full bracket visualization (TournamentBracketView already exists)
- **Enhance:** Real-time standings with point differential tracking
- **Add:** Export results to CSV/JSON
- **Add:** Print-friendly bracket view
- **Add:** Seeding input (manual rank entry before generation)
- **Default:** 15-min games, up to 8 courts
- **UI:** Desktop-optimized with sidebar navigation

### Variant C: "PlayerCompanion" — Participant-First Mobile
**Target Use Case:** Individual players joining games who want to track their personal schedule, results, and stats.

**Key Differences from Baseline:**
- **Remove:** Organizer features (setup, player management, scoring)
- **Remove:** All tournament bracket views
- **Focus:** Personal match schedule only
- **Focus:** "My stats" dashboard (wins, partners played with, court time)
- **Add:** Push notifications when next match is starting
- **Add:** Quick "running late" button to notify organizer
- **Add:** Rate match experience (fun factor)
- **Entry:** QR code scan to join game immediately
- **UI:** Mobile-app style with bottom sheet navigation

---

## 3. Shared-Core Extraction Strategy

### Step 1: Extract Shared Types & Constants

**New File: `src/core/types.ts`**
```typescript
// Extract from src/lib/scheduler.ts
export interface Match { ... }
export interface GameConfig { ... }
export interface CourtConfig { ... }
export interface TournamentMetadata { ... }
export type SchedulingType = 'round-robin' | 'single-elimination' | 'double-elimination' | 'qualifier-tournament';
export type Section = 'setup' | 'players' | 'matches' | 'history' | 'leaderboard';

// Extract from src/components/GameSetup.tsx  
export interface GameSetupProps { ... }
```

**New File: `src/core/constants.ts`**
```typescript
export const DEFAULT_GAME_DURATION = 10;
export const DEFAULT_TOTAL_TIME = 60;
export const MAX_COURTS = 10;
export const GAME_CODE_LENGTH = 6;
```

### Step 2: Extract Supabase Client & Operations

**New File: `src/core/database.ts`**
```typescript
// Consolidate from Index.tsx + supabase/client.ts
export { supabase } from '@/integrations/supabase/client';

// Extract game CRUD operations from Index.tsx lines ~400-600
export const createGame = async (userId: string, config: GameConfig) => ...
export const joinGame = async (code: string, userId: string) => ...
export const updateGameMatches = async (gameId: string, matches: Match[]) => ...
export const updateGamePlayers = async (gameId: string, players: string[]) => ...
export const subscribeToGame = (gameId: string, callback: Function) => ...
```

### Step 3: Extract Scheduling Algorithms

**Already exists in `src/lib/` but consolidate exports:**
```typescript
// src/core/scheduling.ts
export { generateSchedule } from '@/lib/scheduler';
export { generateTournamentSchedule } from '@/lib/tournament-scheduler';
export { generateQualifierTournamentSchedule } from '@/lib/qualifier-tournament-scheduler';
export { advanceWinnerToNextMatch } from '@/lib/tournament-progression';
export { advanceGroupWinnersToKnockout } from '@/lib/qualifier-progression';
```

### Step 4: Extract Shared UI Components

**These remain in `src/components/ui/` (already shared)**

**New Shared Wrappers in `src/core/components/`:**
```
src/core/components/
├── GameProvider.tsx          # React Context for game state (replaces prop drilling)
├── LoadingScreen.tsx         # Extract from Index.tsx lines ~380-390
├── ErrorBoundary.tsx         # New: catch scheduling errors
└── MatchCard.tsx             # Extract common match display from ScheduleView
```

### Step 5: Extract Authentication

**New File: `src/core/auth.ts`**
```typescript
// Extract from Index.tsx lines ~200-250
export const initAnonymousAuth = async () => ...
export const useAuth = () => ...  // Custom hook wrapping supabase auth
```

---

## 4. Variant-Specific Component Architecture

### Directory Structure After Refactor

```
src/
├── core/                           # SHARED: types, db, auth, scheduling
│   ├── types.ts
│   ├── constants.ts
│   ├── database.ts
│   ├── auth.ts
│   ├── scheduling.ts
│   └── components/
│       ├── GameProvider.tsx
│       ├── LoadingScreen.tsx
│       └── MatchCard.tsx
├── components/                     # SHARED UI: shadcn + custom
│   ├── ui/                         # shadcn components (unchanged)
│   ├── GameCodeDialog.tsx          # Shared across variants
│   ├── ShareButton.tsx             # Shared share functionality
│   └── Leaderboard.tsx             # Used by Variant B, optional A
├── hooks/                          # SHARED hooks (most remain)
│   ├── use-player-identity.ts
│   ├── use-player-matches.ts
│   └── use-stopwatch.ts
├── lib/                            # SHARED utilities
│   ├── scheduler.ts
│   ├── tournament-scheduler.ts
│   ├── player-identity.ts
│   └── safe-storage.ts
├── integrations/                   # EXTERNAL: supabase
│   └── supabase/
├── variants/                       # VARIANT-SPECIFIC
│   ├── quickmatch/                 # Variant A
│   │   ├── QuickMatchApp.tsx       # Main entry (replaces Index.tsx)
│   │   ├── pages/
│   │   │   ├── QuickSetup.tsx      # Simplified GameSetup
│   │   │   ├── QuickPlayers.tsx    # Streamlined CheckInOut
│   │   │   └── QuickMatches.tsx    # Live matches only
│   │   └── components/
│   │       └── SimpleNav.tsx       # Minimal navigation
│   ├── tournament/                 # Variant B
│   │   ├── TournamentApp.tsx
│   │   ├── pages/
│   │   │   ├── BracketSetup.tsx    # Enhanced GameSetup
│   │   │   ├── Seeding.tsx         # New: manual seed entry
│   │   │   ├── BracketView.tsx     # TournamentBracketView wrapper
│   │   │   └── Standings.tsx       # Enhanced Leaderboard
│   │   └── components/
│   │       ├── BracketExport.tsx   # CSV/JSON export
│   │       └── PrintBracket.tsx    # Print-friendly view
│   └── companion/                  # Variant C
│       ├── CompanionApp.tsx
│       ├── pages/
│       │   ├── JoinGame.tsx        # QR scan entry
│       │   ├── MySchedule.tsx      # Personal match view
│       │   ├── MyStats.tsx         # Personal stats dashboard
│       │   └── RateMatch.tsx       # Post-match rating
│       └── components/
│           ├── QRScanner.tsx       # QR code scanning
│           ├── LateButton.tsx      # "Running late" notify
│           └── NotificationManager.tsx
└── App.tsx                         # Route switcher (host detection)
```

---

## 5. Routing Strategy

### Option A: Subdomain Routing (Recommended for Parallel Testing)

```typescript
// vite.config.ts (per-variant builds)
export default defineConfig(({ mode }) => ({
  // ... base config
  build: {
    outDir: `dist/${process.env.VITE_VARIANT || 'baseline'}`,
  }
}));

// Build commands
"build:baseline": "vite build",
"build:quickmatch": "VITE_VARIANT=quickmatch vite build",
"build:tournament": "VITE_VARIANT=tournament vite build", 
"build:companion": "VITE_VARIANT=companion vite build"
```

**Deployment URLs:**
- `https://app.pickleballmatch.fun/` → Baseline
- `https://quick.pickleballmatch.fun/` → Variant A
- `https://tournament.pickleballmatch.fun/` → Variant B
- `https://play.pickleballmatch.fun/` → Variant C

### Option B: Path-Based Routing (Single Deploy)

```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BaselineApp from './pages/Index';
import QuickMatchApp from './variants/quickmatch/QuickMatchApp';
import TournamentApp from './variants/tournament/TournamentApp';
import CompanionApp from './variants/companion/CompanionApp';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BaselineApp />} />
        <Route path="/quickmatch/*" element={<QuickMatchApp />} />
        <Route path="/tournament/*" element={<TournamentApp />} />
        <Route path="/companion/*" element={<CompanionApp />} />
      </Routes>
    </BrowserRouter>
  );
};
```

**Deployment URL:**
- `https://pickleballmatch.fun/` → Baseline
- `https://pickleballmatch.fun/quickmatch` → Variant A
- `https://pickleballmatch.fun/tournament` → Variant B
- `https://pickleballmatch.fun/companion` → Variant C

**Recommendation:** Use Option B for initial testing (simpler), then migrate to Option A for full parallel deployment.

---

## 6. Safest Build Sequence (Non-Breaking)

### Phase 1: Foundation (Week 1) — No UI Changes

**Goal:** Establish shared core without touching existing UI.

| Day | Task | Files Modified | Risk |
|-----|------|----------------|------|
| 1 | Create `src/core/types.ts` extract Match, GameConfig interfaces | New file only | Zero |
| 1 | Create `src/core/constants.ts` | New file only | Zero |
| 2 | Create `src/core/database.ts` extract Supabase operations | New file, Index.tsx unchanged | Zero |
| 2 | Create `src/core/auth.ts` extract auth logic | New file only | Zero |
| 3 | Create `src/core/components/GameProvider.tsx` | New file only | Zero |
| 4-5 | Add comprehensive tests for core functions | Test files only | Zero |

**Validation:** All existing tests pass, app behaves identically.

### Phase 2: Refactor Index.tsx (Week 2) — Internal Only

**Goal:** Make Index.tsx use shared core (still single variant).

| Day | Task | Files Modified | Risk |
|-----|------|----------------|------|
| 6 | Update Index.tsx to import types from `core/types` | Index.tsx only | Low |
| 7 | Update Index.tsx to use `core/database` operations | Index.tsx only | Medium |
| 8 | Update Index.tsx to use `core/auth` | Index.tsx only | Low |
| 9 | Wrap Index.tsx with GameProvider | Index.tsx, main.tsx | Medium |
| 10 | Full regression testing | All | — |

**Validation:** Manual QA of all flows (create game, join, score matches, view history).

### Phase 3: Variant A — QuickMatch (Week 3)

| Day | Task | Files |
|-----|------|-------|
| 11 | Create `src/variants/quickmatch/` directory structure | New |
| 12 | Build QuickMatchApp.tsx (simplified router) | New |
| 13 | Build QuickSetup.tsx (GameSetup fork with reduced options) | New |
| 14 | Build QuickPlayers.tsx (simplified CheckInOut) | New |
| 15 | Build QuickMatches.tsx (ScheduleView fork) | New |

**Validation:** Deploy to `/quickmatch` path, test all flows.

### Phase 4: Variant B — TournamentPro (Week 4)

| Day | Task | Files |
|-----|------|-------|
| 16-17 | Build TournamentApp.tsx + BracketSetup.tsx | New |
| 18 | Build Seeding.tsx (new feature) | New |
| 19 | Build BracketExport.tsx | New |
| 20 | Integration testing | — |

### Phase 5: Variant C — PlayerCompanion (Week 5)

| Day | Task | Files |
|-----|------|-------|
| 21-22 | Build CompanionApp.tsx + JoinGame.tsx | New |
| 23 | Build MyStats.tsx | New |
| 24 | Build RateMatch.tsx + LateButton.tsx | New |
| 25 | Integration testing | — |

### Phase 6: Parallel Deployment (Week 6)

| Day | Task |
|-----|------|
| 26 | Set up Vercel project with path-based routing |
| 27 | Deploy all variants to staging |
| 28-30 | User acceptance testing on all 3 variants |

---

## 7. Deployment Approach for 3 Testable Links

### Recommended: Vercel with Path-Based Routing

**Why Vercel:**
- Native React/Vite support
- Preview deployments for every PR
- Path-based routing built-in
- Free tier sufficient for prototype testing
- Analytics included

**Vercel Configuration (`vercel.json`):**
```json
{
  "routes": [
    { "src": "/quickmatch/(.*)", "dest": "/quickmatch/$1" },
    { "src": "/tournament/(.*)", "dest": "/tournament/$1" },
    { "src": "/companion/(.*)", "dest": "/companion/$1" },
    { "src": "/(.*)", "dest": "/$1" }
  ]
}
```

**Testable Links After Deployment:**

| Variant | URL | Test Focus |
|---------|-----|------------|
| **Baseline** | `https://pickleballmatch.fun/` | Control group - all features |
| **QuickMatch** | `https://pickleballmatch.fun/quickmatch` | Speed to first match, mobile UX |
| **TournamentPro** | `https://pickleballmatch.fun/tournament` | Bracket management, export features |
| **PlayerCompanion** | `https://pickleballmatch.fun/companion` | Player engagement, notification CTR |

### Alternative: Netlify with Subdomain Routing

For true parallel testing with isolated analytics:

| Variant | Subdomain | Build Command |
|---------|-----------|---------------|
| Baseline | `app.pickleballmatch.fun` | `npm run build` |
| QuickMatch | `quick.pickleballmatch.fun` | `VITE_VARIANT=quickmatch npm run build` |
| TournamentPro | `tournament.pickleballmatch.fun` | `VITE_VARIANT=tournament npm run build` |
| PlayerCompanion | `play.pickleballmatch.fun` | `VITE_VARIANT=companion npm run build` |

---

## 8. Files to Inspect for Implementation

### Core Files (Referenced in this Plan)

1. **`src/pages/Index.tsx`** (lines ~1-650)
   - Main monolith to refactor
   - Contains all state management, game CRUD, Supabase subscriptions

2. **`src/components/GameSetup.tsx`** (lines ~1-300)
   - Configuration UI with scheduling type selector
   - GameConfig interface definition

3. **`src/components/ScheduleView.tsx`** (lines ~1-1000+)
   - Match display and scoring logic
   - Timer/stopwatch integration

4. **`src/lib/scheduler.ts`** (lines ~1-1000+)
   - Match type definitions
   - Round-robin generation algorithm
   - CourtConfig interface

5. **`src/lib/tournament-scheduler.ts`**
   - Single/double elimination bracket generation

6. **`src/lib/qualifier-tournament-scheduler.ts`**
   - Group stage + knockout generation

7. **`src/hooks/use-player-identity.ts`**
   - Player view mode management
   - localStorage persistence

8. **`src/integrations/supabase/client.ts`**
   - Database connection and types

---

## 9. Risk Mitigation

### Low-Risk Approach Guarantees

1. **Zero Breaking Changes for 2 Weeks**
   - Only new files created, existing files unchanged
   - Baseline remains deployable at any point

2. **Feature Flag Safety**
   - Each variant behind `/path` route
   - Can disable instantly by removing route

3. **Database Compatibility**
   - All variants use same Supabase schema
   - No migrations required

4. **Rollback Strategy**
   - If variant fails: remove route, traffic falls back to baseline
   - Database data persists, no data loss

---

## 10. Success Metrics for Each Variant

| Variant | Primary KPI | Target | Measurement |
|---------|-------------|--------|-------------|
| **QuickMatch** | Time to first match | <2 min | Analytics event: "matches_generated" |
| **QuickMatch** | Mobile completion rate | >80% | Games started / Games created |
| **TournamentPro** | Bracket export usage | >30% | Export button clicks |
| **TournamentPro** | Seeding feature usage | >50% | Manual seed entry rate |
| **PlayerCompanion** | Player identity claim rate | >70% | Players claiming identity |
| **PlayerCompanion** | Late notification usage | >20% | Late button clicks |

---

## Summary

This implementation plan provides a **6-week, non-breaking path** from the current monolithic Index.tsx to 3 deployable prototype variants. The approach:

1. **Extracts shared core** (types, database, auth, scheduling) first
2. **Builds variants in parallel** directories without touching baseline
3. **Uses path-based routing** for immediate testable links
4. **Preserves all existing functionality** throughout the process

**Cited Repository Files:**
- `src/pages/Index.tsx` - State monolith
- `src/components/GameSetup.tsx` - Configuration UI
- `src/components/ScheduleView.tsx` - Match display
- `src/components/CheckInOut.tsx` - Player management
- `src/lib/scheduler.ts` - Match types and generation
- `src/lib/tournament-scheduler.ts` - Bracket logic
- `src/hooks/use-player-identity.ts` - Player view state
- `src/integrations/supabase/client.ts` - Database layer
- `src/App.tsx` - Router configuration
- `vite.config.ts` - Build configuration

