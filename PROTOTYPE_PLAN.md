# PickleMatch Multi-Prototype Implementation Plan

## Executive Summary
Transform the monolithic Index.tsx into a modular architecture supporting 3 prototype variants in a single codebase. The core insight: the existing code already has 3 scheduling modes (round-robin, single/double-elimination tournament, qualifier-tournament) but they're all crammed into one UI. This plan separates them into distinct user experiences while maximizing code reuse.

---

## 1. Route Strategy

### URL Structure
```
/                        → Variant selector / landing (new)
/classic/*               → Round-robin scheduler (current behavior)
/tournament/*            → Bracket tournament experience
/qualifier/*             → Group stage + knockout qualifier
```

### Route Implementation
```typescript
// App.tsx - New routing structure
<BrowserRouter>
  <Routes>
    <Route path="/" element={<VariantSelector />} />
    <Route path="/classic/*" element={<ClassicLayout />}>
      <Route index element={<ClassicIndex />} />
      <Route path="game/:gameId" element={<ClassicGame />} />
    </Route>
    <Route path="/tournament/*" element={<TournamentLayout />}>
      <Route index element={<TournamentIndex />} />
      <Route path="bracket/:gameId" element={<TournamentBracket />} />
    </Route>
    <Route path="/qualifier/*" element={<QualifierLayout />}>
      <Route index element={<QualifierIndex />} />
      <Route path="stage/:gameId" element={<QualifierStage />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
</BrowserRouter>
```

### Navigation Preservation
- Deep linking via `?join=CODE` continues to work
- Each variant handles its own join parameter
- LocalStorage keys namespaced: `teamup_game_id` → `{variant}_game_id`

---

## 2. Shared Core Extraction

### Directory Restructure
```
src/
├── core/                    # NEW: Extracted shared logic
│   ├── auth/
│   │   ├── AuthProvider.tsx
│   │   ├── useAnonymousAuth.ts
│   │   └── sessionRestore.ts
│   ├── game/
│   │   ├── GameContext.tsx
│   │   ├── useGameState.ts
│   │   ├── useRealtimeSync.ts
│   │   └── gameMutations.ts
│   ├── types/
│   │   └── index.ts         # All shared types
│   └── utils/
│       ├── debug-logger.ts
│       └── safe-storage.ts
├── variants/                # NEW: Variant-specific code
│   ├── classic/
│   ├── tournament/
│   └── qualifier/
├── components/              # Existing UI primitives
├── lib/                     # Scheduling algorithms (unchanged)
└── pages/                   # Deprecated, migrate to variants/
```

### Core Extraction Priorities

#### Phase A: Types & Utilities (No Risk)
- Move `Match`, `GameConfig`, `CourtConfig` types to `core/types/`
- Keep `debug-logger.ts`, `safe-storage.ts` as-is, just relocate

#### Phase B: Auth Module (Low Risk)
Extract from Index.tsx lines ~160-220:
```typescript
// core/auth/useAnonymousAuth.ts
export const useAnonymousAuth = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const authInitializedRef = useRef(false);
  
  // All the auth logic, initialization, and cleanup
  return { userId, isReady: userId !== null };
};
```

#### Phase C: Game State Core (Medium Risk)
Extract state management (lines ~50-150, ~300-400):
```typescript
// core/game/useGameState.ts
export const useGameState = (variant: VariantType) => {
  const [gameId, setGameId] = useState<string | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  
  // Namespaced storage keys
  const storageKey = `${variant}_game_id`;
  
  return {
    gameId, players, matches, gameConfig,
    createGame, joinGame, updatePlayers, updateMatches
  };
};
```

#### Phase D: Realtime Sync (Medium Risk)
Extract Supabase subscription logic (lines ~400-500):
```typescript
// core/game/useRealtimeSync.ts
export const useRealtimeSync = (gameId: string | null, onUpdate: Function) => {
  const subscriptionRef = useRef<any>(null);
  
  useEffect(() => {
    if (!gameId) return;
    // Subscription setup with retry logic
    return () => { /* cleanup */ };
  }, [gameId]);
};
```

---

## 3. Prototype-Specific Presentation Layers

### 3A. Classic Variant (Round-Robin)
**Target:** Preserve existing UX exactly

```
src/variants/classic/
├── ClassicLayout.tsx        # Shell with nav
├── ClassicIndex.tsx         # Main page (refactored from Index.tsx)
├── components/
│   ├── ClassicGameSetup.tsx
│   ├── ClassicPlayerSetup.tsx
│   ├── ClassicScheduleView.tsx
│   └── ClassicBottomNav.tsx
└── hooks/
    └── useClassicScheduling.ts
```

**Key Differences from Current:**
- Round-robin only (remove tournament branches from UI)
- Keep "match preservation" logic for live editing
- Maintain current "check in/out" player flow

### 3B. Tournament Variant (Single/Double Elimination)
**Target:** Bracket-centric experience

```
src/variants/tournament/
├── TournamentLayout.tsx
├── TournamentIndex.tsx
├── components/
│   ├── TournamentSetup.tsx      # Simplified: singles/doubles, team count
│   ├── BracketView.tsx          # Visual bracket (exists, enhance)
│   ├── TournamentMatchCard.tsx  # Score entry within bracket
│   └── TournamentNav.tsx        # Bracket / Matches / Standings
└── hooks/
    └── useTournamentProgression.ts
```

**Key UX Differences:**
- Setup requires 4/8/16 teams upfront (enforced)
- Visual bracket is primary navigation
- Match completion advances bracket automatically
- No "regeneration" concept - bracket is fixed

### 3C. Qualifier Variant (Groups + Knockout)
**Target:** Two-phase experience

```
src/variants/qualifier/
├── QualifierLayout.tsx
├── QualifierIndex.tsx
├── components/
│   ├── QualifierSetup.tsx       # Group size, advancement count
│   ├── GroupStageView.tsx       # Round-robin groups
│   ├── KnockoutStageView.tsx    # Bracket for group winners
│   └── StandingsView.tsx        # Combined group standings
└── hooks/
    └── useQualifierProgression.ts
```

**Key UX Differences:**
- Phase indicator: "Group Stage" → "Knockout Stage"
- Group size configurable (3 or 4 teams)
- Auto-progression when group matches complete
- Standings sorted by wins, then point differential

---

## 4. Shared Component Inventory

### Keep in `components/` (All Variants)
- `ui/*` - shadcn primitives (unchanged)
- `PlayerIdentitySelector.tsx`
- `ShareButton.tsx`
- `GameCodeDialog.tsx`
- `Leaderboard.tsx` - May need variant-specific wrappers
- `MatchHistory.tsx`

### Create Variant-Specific Wrappers
- `ScheduleViewClassic.tsx` - Current ScheduleView, renamed
- `ScheduleViewTournament.tsx` - Bracket-integrated
- `ScheduleViewQualifier.tsx` - Group-aware

---

## 5. Branch/Deploy Strategy

### Branch Strategy: Feature Branch per Variant

```
main
├── extract-core (shared foundation)
│   ├── variant/classic (PR to extract-core)
│   ├── variant/tournament (PR to extract-core)
│   └── variant/qualifier (PR to extract-core)
```

### Deployment Strategy: Subdomain or Path-Based

**Option A: Path-Based (Recommended)**
- Single build, single deploy
- `pickleballmatch.fun/classic`
- `pickleballmatch.fun/tournament`
- `pickleballmatch.fun/qualifier`

**Option B: Subdomain (Future)**
- Separate builds if variant divergence grows
- `classic.pickleballmatch.fun`
- `tournament.pickleballmatch.fun`

### Environment Variables per Build
```bash
# .env.classic
VITE_VARIANT=classic
VITE_DEFAULT_SCHEDULING_TYPE=round-robin
VITE_ENABLE_TOURNAMENT_MODES=false

# .env.tournament
VITE_VARIANT=tournament
VITE_DEFAULT_SCHEDULING_TYPE=single-elimination
VITE_ENABLE_TOURNAMENT_MODES=true
```

---

## 6. Safest Build Sequence

### Phase 0: Preparation (Zero Risk)
1. Create backup branch: `git checkout -b pre-extraction-backup`
2. Add comprehensive E2E tests for current flow (Playwright/Cypress)
3. Verify build outputs identical before/after each step

### Phase 1: Code Movement (Low Risk)
1. **Create new directories** without changing imports
2. **Copy (don't move)** files to new locations
3. **Update tsconfig.json** paths if needed
4. **Verify:** `npm run build` passes

### Phase 2: Type Extraction (Low Risk)
1. Move types to `core/types/`
2. Update imports in existing files to use new paths
3. **Verify:** No TypeScript errors, build passes

### Phase 3: Hook Extraction (Medium Risk)
1. Extract `useAnonymousAuth` → test in isolation
2. Extract `useRealtimeSync` → test with mock Supabase
3. Extract `useGameState` → test state transitions
4. **Verify:** Unit tests pass, no runtime errors

### Phase 4: Classic Variant (Medium Risk)
1. Create `variants/classic/ClassicIndex.tsx`
2. Copy Index.tsx content, refactor imports to use core/
3. Remove tournament/qualifier branches (clean up dead code)
4. Update App.tsx to route `/classic/*` to ClassicIndex
5. **Verify:** Classic flow works end-to-end

### Phase 5: Tournament Variant (Higher Risk)
1. Create `variants/tournament/` structure
2. Build TournamentIndex with bracket-first UX
3. Test tournament scheduling logic (already exists in lib/)
4. **Verify:** Tournament flow works, bracket advances correctly

### Phase 6: Qualifier Variant (Higher Risk)
1. Create `variants/qualifier/` structure
2. Build two-phase UI (groups → knockout)
3. Test progression logic
4. **Verify:** Groups complete, winners advance

### Phase 7: Landing Page & Polish
1. Build `VariantSelector` landing page
2. Add variant cards with descriptions
3. Update root route `/` to show selector
4. **Verify:** All three variants accessible

### Phase 8: Cleanup
1. Remove old `pages/Index.tsx`
2. Remove unused components
3. Final build verification
4. Merge to main

---

## 7. Risk Mitigation

### Legacy Behavior Preservation
- **Keep existing URL working:** `/` redirects to `/classic` initially
- **LocalStorage migration:** On first load, migrate `teamup_game_id` → `classic_game_id`
- **Supabase schema:** No changes needed - game rows have `game_config` which already stores `schedulingType`

### Rollback Plan
Each phase is a commit. If issues found:
```bash
git revert HEAD~N..HEAD  # Revert to last known good state
```

### Testing Checklist per Phase
- [ ] Build passes (`npm run build`)
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] Unit tests pass (`npm test` if available)
- [ ] Classic flow: Create game → Add players → Generate schedule → Enter scores
- [ ] Tournament flow: Create bracket → Advance winners → Complete tournament
- [ ] Qualifier flow: Groups → Advancement → Knockout

---

## 8. Implementation Estimate

| Phase | Risk | Time Estimate |
|-------|------|---------------|
| 0. Preparation | Zero | 2 hours |
| 1. Code Movement | Low | 1 hour |
| 2. Type Extraction | Low | 2 hours |
| 3. Hook Extraction | Medium | 4 hours |
| 4. Classic Variant | Medium | 6 hours |
| 5. Tournament Variant | High | 8 hours |
| 6. Qualifier Variant | High | 8 hours |
| 7. Landing Page | Low | 3 hours |
| 8. Cleanup | Low | 2 hours |
| **Total** | | **~36 hours** |

---

## 9. Success Criteria

1. **Legacy preservation:** Existing `/classic` URL works identically to current `/`
2. **Three testable routes:** Each variant accessible via unique path
3. **No code duplication:** Shared logic in `core/`, not copy-pasted
4. **Build integrity:** Single `npm run build` produces all variants
5. **Supabase compatibility:** No schema migrations required

---

## 10. Next Steps

1. **Review this plan** with stakeholders
2. **Create `extract-core` branch** from main
3. **Execute Phase 0** (backup + tests)
4. **Proceed through phases** with verification at each step
