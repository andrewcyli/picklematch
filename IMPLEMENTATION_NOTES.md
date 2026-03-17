# PickleMatch UX/UI Prototype Foundation - Implementation Notes

## What Was Implemented

### 1. Core Type System (`src/core/types/index.ts`)
- Centralized type definitions shared across all variants
- Match, GameConfig, CourtConfig interfaces
- VariantType union ('classic' | 'tournament' | 'qualifier')
- ViewportSize for responsive design

### 2. Shell Foundation (`src/shell/`)

#### ShellContext.tsx
- Global state management for navigation, player view mode, UI state
- Provider pattern for accessing shell state throughout the app
- Actions: resetToSetup, enterPlayerView, exitPlayerView

#### AppShell.tsx
- Responsive layout foundation that adapts to viewport
- Handles ad sidebars (desktop), background decorations
- Content area sizing with appropriate padding
- Safe area support for mobile devices

#### ResponsiveNavigation.tsx
- **MobileBottomNav**: Fixed bottom tab bar with 5 sections
- **DesktopSidebar**: Fixed left sidebar with navigation
- **PlayerViewHeader**: Shows current player identity with exit button
- Active state highlighting and smooth transitions

#### VariantSelector.tsx
- Landing page for choosing between game modes
- 3 variant cards with descriptions and features
- Responsive grid: 1 col mobile portrait, 3 cols desktop
- Hover effects and modern card design

#### useViewport.ts
- Detects viewport size: mobile-portrait, mobile-landscape, tablet, desktop
- Window resize and orientation change listeners
- Helper booleans for responsive conditions

### 3. Routing Structure (`src/App.tsx`)
```
/                        → Legacy Index (existing behavior)
/start                   → New VariantSelector landing page
/classic/*               → Classic Round-Robin variant
/tournament/*            → Tournament Bracket variant (placeholder)
/qualifier/*             → Qualifier Stage variant (placeholder)
```

### 4. Classic Variant (`src/variants/classic/`)

#### ClassicVariant.tsx
- Complete round-robin game flow using new shell
- Game state management with useClassicGameState hook
- Player identity integration
- Realtime sync with Supabase
- All 5 sections: setup, players, matches, leaderboard, history

#### View Components
- **ClassicSetupView**: Wraps existing GameSetup component
- **ClassicPlayersView**: Wraps existing CheckInOut component
- **ClassicMatchesView**: Wraps existing ScheduleView component
- **ClassicLeaderboardView**: Wraps existing Leaderboard component
- **ClassicHistoryView**: Wraps existing MatchHistory component
- **ClassicMyMatchesView**: Wraps existing MyMatchesView component

### 5. Placeholder Variants
- **TournamentVariant**: Shows "coming soon" for bracket mode
- **QualifierVariant**: Shows "coming soon" for group+knockout mode

## Build Verification

```bash
npm run build     ✅ Success
npx tsc --noEmit  ✅ No errors
```

## File Structure Created

```
src/
├── core/
│   ├── types/
│   │   └── index.ts              # Shared TypeScript types
│   └── hooks/
│       └── useViewport.ts        # Responsive viewport detection
├── shell/
│   ├── ShellContext.tsx          # Global shell state
│   ├── AppShell.tsx              # Responsive layout shell
│   ├── ResponsiveNavigation.tsx  # Adaptive navigation
│   ├── VariantSelector.tsx       # Landing page
│   └── index.ts                  # Shell exports
├── variants/
│   ├── classic/
│   │   ├── ClassicVariant.tsx    # Main classic variant
│   │   └── components/
│   │       ├── ClassicSetupView.tsx
│   │       ├── ClassicPlayersView.tsx
│   │       ├── ClassicMatchesView.tsx
│   │       ├── ClassicLeaderboardView.tsx
│   │       ├── ClassicHistoryView.tsx
│   │       ├── ClassicMyMatchesView.tsx
│   │       └── index.ts
│   ├── tournament/
│   │   └── TournamentVariant.tsx # Placeholder
│   └── qualifier/
│       └── QualifierVariant.tsx  # Placeholder
└── App.tsx                       # Updated routing
```

## What Was Preserved (Engine Layer)

- ✅ All scheduler algorithms in `src/lib/scheduler.ts`
- ✅ Tournament scheduler in `src/lib/tournament-scheduler.ts`
- ✅ Qualifier scheduler in `src/lib/qualifier-tournament-scheduler.ts`
- ✅ All progression logic (tournament-progression.ts, qualifier-progression.ts)
- ✅ Supabase integration and client
- ✅ All existing UI components in `src/components/ui/`
- ✅ All existing feature components (GameSetup, ScheduleView, etc.)
- ✅ Player identity system
- ✅ Match scoring and history
- ✅ Realtime sync with Supabase

## Legacy Behavior Preservation

- Root `/` still routes to existing `Index.tsx` (no breaking change)
- All existing URLs and game codes continue to work
- LocalStorage keys remain unchanged for existing sessions
- Supabase schema unchanged - no migrations needed

## Responsive Design Features

### Mobile Portrait (< 640px, portrait)
- Bottom navigation bar
- Full-width content with safe area padding
- Compact header
- Touch-optimized tap targets

### Mobile Landscape (< 640px, landscape)
- Bottom or side navigation (can be configured)
- Wider content area
- Adjusted spacing

### Tablet (640px - 1024px)
- 2-column variant selector grid
- Optional side navigation
- Increased padding

### Desktop (> 1024px)
- Left sidebar navigation
- Ad sidebars on both sides
- 3-column variant selector grid
- Max-width content container

## Next Steps (Remaining Work)

### Phase 1: Classic Variant Polish
1. Implement proper `handlePlayersUpdate` with round-robin regeneration
2. Wire up match score updates to Supabase
3. Add proper error handling and loading states
4. Test end-to-end flow

### Phase 2: Tournament Variant
1. Create TournamentSetup component (simplified from GameSetup)
2. Build BracketView component
3. Implement tournament progression UI
4. Add winner advancement flow

### Phase 3: Qualifier Variant
1. Create QualifierSetup component
2. Build GroupStageView component
3. Build KnockoutStageView component
4. Implement auto-progression logic

### Phase 4: Integration
1. Add transition animations between variants
2. Implement URL-based game sharing per variant
3. Add variant switching from within game
4. A/B test different UX flows

### Phase 5: Cleanup
1. Remove legacy Index.tsx when ready
2. Migrate all users to new routes
3. Update documentation
4. Performance optimization

## Testing Checklist

- [ ] Classic flow works on mobile portrait
- [ ] Classic flow works on mobile landscape
- [ ] Classic flow works on tablet
- [ ] Classic flow works on desktop
- [ ] Navigation works on all viewports
- [ ] Player view mode works correctly
- [ ] Session restoration works
- [ ] Game code dialog displays properly
- [ ] Realtime updates sync correctly
- [ ] Build completes without errors
- [ ] No console errors

## Notes

- The existing Index.tsx remains untouched at `/` for backwards compatibility
- New routes are additive - users can opt-in to new UX
- Shell pattern allows for consistent UX across variants
- Code splitting via React.lazy reduces initial bundle size
- TypeScript strict mode not enabled - should be considered for production
