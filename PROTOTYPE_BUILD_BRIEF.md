# PickleMatch Prototype Build Brief
## Implementation-Ready Specs for Clubhouse, Arena, and Quick Court

**Date:** March 20, 2026  
**For:** Builder  
**Goal:** Sharp visual/structural differentiation while preserving all game logic

---

## 🎯 Build Strategy Overview

### Recommended Approach: Feature-Flagged Variants in Single Repo

The existing app already uses a variant architecture (`/classic`, `/tournament`, `/qualifier` paths). We'll extend this pattern to create **3 new UX variants** that share the same game logic but expose different UI/shell configurations.

```
/clubhouse/*  → Community-first shell + screens
/arena/*      → Tournament-night shell + screens  
/quickcourt/* → Drop-in minimalist shell + screens
```

**Game logic to preserve (do NOT modify):**
- `src/lib/scheduler.ts` - Round-robin generation
- `src/lib/tournament-scheduler.ts` - Single/double elimination
- `src/lib/qualifier-tournament-scheduler.ts` - Pools → knockout
- `src/lib/qualifier-progression.ts` - Qualifier advancement
- `src/lib/validation.ts` - Match score validation
- `src/hooks/useRealtimeSync.ts` - Supabase sync

---

## 🏠 PROTOTYPE A: "Clubhouse"

### Theme & Identity
- **Vibe:** Warm, wood-panel sports club aesthetic
- **Colors:** Amber/walnut (#B8860B), forest green (#228B22), cream (#FFFDD0)
- **Typography:** Serif headers (Playfair Display), sans body (Inter)
- **Iconography:** Racket/paddle icons, wooden textures

### Screen Structure

| Route | Screen | Description |
|-------|--------|-------------|
| `/clubhouse/` | Landing | "Welcome back" + today's sessions card list |
| `/clubhouse/players` | Player Cards | Avatar grid with skill ratings (1-5 paddles) |
| `/clubhouse/ladder` | Ladder View | Visual ranking board with challenge buttons |
| `/clubhouse/sessions` | Session List | Recurring sessions, "Monday Night" memory |
| `/clubhouse/matches` | Match View | "Who's on next" prominent, court assignments |
| `/clubhouse/profile` | My Profile | Personal stats, match history, rivals |

### Navigation Model
- **4-tab bottom nav:** Home | Ladder | Sessions | Profile
- Tab icons: Home (house), Ladder (bar-chart-2), Sessions (calendar), Profile (user)
- Each tab shows contextual content (not full page loads)

### Component Hierarchy (New + Modified)

**New Components (create in `src/variants/clubhouse/components/`):**
- `ClubhouseLanding.tsx` - Hero + session cards
- `PlayerCard.tsx` - Avatar + skill badge (1-5 paddles) + win rate + "last played with"
- `LadderBoard.tsx` - Rankings list with challenge-up button
- `SessionCard.tsx` - Recurring session preview
- `RivalIndicator.tsx` - "You vs. [Player]" rivalry badge

**Shell Modifications:**
- Replace `AppShell` header with club-style wood texture
- New nav theme: warm amber/green instead of green/white
- Background: subtle wood grain pattern overlay

### Page-Level Changes (vs. Classic)

| Current (Classic) | Clubhouse |
|-------------------|-----------|
| Setup → Players → Matches flow | Landing → contextual drill-down |
| Generic leaderboard | Ladder with challenge mechanic |
| Player names only | Player cards with avatars + ratings |
| Sessions are one-off | Sessions have memory/recurrence |
| No social signals | "3 regulars playing tonight" badges |

### Ad Placement Zones

| Location | Format | Spec |
|----------|--------|------|
| Between session cards | Native banner | "Sponsored: [Local Pro Shop]" |
| Player card footer | Affiliate tiny | "Gear: [Paddle]" (optional) |
| Post-session interstitial | Rewarded | "Share to unlock stats" |
| Ladder sidebar (desktop) | 160x600 | Keep minimal - club vibe |

**Red lines:**
- No sidebars on mobile (breaks club intimacy)
- No interstitials between matches (breaks flow)

---

## ⚡ PROTOTYPE B: "Arena"

### Theme & Identity
- **Vibe:** Tournament-night sports broadcast
- **Colors:** Black (#000), white (#FFF), neon accent electric green (#39FF14) or hot orange (#FF6B35)
- **Typography:** Bold condensed headers (Oswald), mono numbers (JetBrains Mono)
- **Iconography:** Trophy, spotlight, brackets

### Screen Structure

| Route | Screen | Description |
|-------|--------|-------------|
| `/arena/` | Landing | Big "START TOURNAMENT" button, visible brackets |
| `/arena/setup` | Quick Setup | Minimal: players + bracket type → generate |
| `/arena/bracket` | Bracket Hero | Full-screen interactive bracket |
| `/arena/score` | Live Scoreboard | Court-by-court scores, "NOW PLAYING" highlight |
| `/arena/seeding` | Seeding UI | Drag-to-seed before generation |
| `/arena/results` | Winner Celebration | Confetti, champion banner, shareable |

### Navigation Model
- **Single-flow linear:** Setup → Bracket → Score → Champion
- No bottom nav during active match
- Floating "Back to Bracket" pill button (always visible)
- Progress stepper at top: ① Players ② Bracket ③ Live ④ Results

### Component Hierarchy (New + Modified)

**New Components (create in `src/variants/arena/components/`):**
- `ArenaLanding.tsx` - Hero with tournament start CTA
- `BracketView.tsx` - Full-screen interactive bracket, tap to score
- `MatchNode.tsx` - Single bracket match card with score inputs
- `LiveScoreboard.tsx` - Dark theme, large numbers, broadcast style
- `SeedingDrag.tsx` - Drag-and-drop seeding interface
- `WinnerCelebration.tsx` - Confetti animation + champion card
- `CourtPill.tsx` - "Court 1 - NOW PLAYING" floating badge

**Shell Modifications:**
- Dark mode only (black background, white text)
- Neon accent on all interactive elements
- Remove decorative blurs - stark, high-contrast
- Remove standard header - custom hero header

### Page-Level Changes (vs. Classic)

| Current (Classic) | Arena |
|-------------------|-------|
| Bottom nav (Setup/Players/Matches/History/Leaders) | Single-flow, no nav during play |
| Schedule table view | Full-screen bracket as primary |
| Tap match → modal | Tap match → inline score, auto-advance |
| Random seed only | Drag-to-seed interface |
| Simple results | Winner celebration + shareable card |
| Green/white theme | Black/neon theme |

### Ad Placement Zones

| Location | Format | Spec |
|----------|--------|------|
| Pre-tournament hero | Sponsor banner | "Powered by [Local Business]" |
| Between rounds | Countdown | "Next match in X:00" (hold attention) |
| Results page | Sponsor card | "Tournament sponsored by [X]" |
| Broadcast mode (spectator) | Standard banner | Similar to ESPN - expected |

**Red lines:**
- Never interrupt active scoring
- Keep ads minimal during bracket - don't break immersion

---

## 🎯 PROTOTYPE C: "Quick Court"

### Theme & Identity
- **Vibe:** Ultra-clean, functional, clinical
- **Colors:** Neutral grays (#F5F5F5, #E0E0E0), single accent (pickleball green #7CB342)
- **Typography:** System fonts (SF Pro, Roboto), generous whitespace
- **Iconography:** Minimal - only action icons

### Screen Structure

| Route | Screen | Description |
|-------|--------|-------------|
| `/quickcourt/` | Landing | Single question: "Ready to play?" |
| `/quickcourt/players` | Quick Add | Massive input field, comma-separated |
| `/quickcourt/court` | Court View | One card per court, swipe to complete |
| `/quickcourt/queue` | Waiting List | Simple queue, next highlighted, one-tap promote |
| `/quickcourt/done` | Summary | Who played, scores, duration |

### Navigation Model
- **Linear 3-step flow:** Start → Players → Courts → Done
- No persistent navigation - guided experience
- Bottom progress bar: ●○○ (step 1 of 3)
- "Exit" X button top-right only

### Component Hierarchy (New + Modified)

**New Components (create in `src/variants/quickcourt/components/`):**
- `QuickStartLanding.tsx` - Full-screen CTA "Start a Game"
- `QuickPlayerInput.tsx` - Giant textarea, auto-parse names
- `QuickCourtCard.tsx` - Single court, swipe-complete
- `QuickWaitlist.tsx` - Queue with auto-promote
- `QuickMatchDone.tsx` - Minimal summary card

**Shell Modifications:**
- Remove header entirely - full-bleed content
- Remove bottom nav - progress stepper only
- Whitespace: double current padding
- Collapse all cards to minimum viable

### Page-Level Changes (vs. Classic)

| Current (Classic) | Quick Court |
|-------------------|-------------|
| Game mode selection (Round Robin/Tournament/Qualifier) | Auto-detect best format |
| Full setup form | 3 taps to start |
| Multi-court toggle | Single court default, expand if needed |
| Comprehensive history | Just "done" summary |
| Standard leaderboard | Skip - not relevant for drop-in |

### Ad Placement Zones

| Location | Format | Spec |
|----------|--------|------|
| End of session | Thank you + venue ad | "Thanks for playing! [Local Venue]" |
| Idle timeout | Geo hook | "Starting in 5... view nearby courts" |
| Session list (if expands) | Minimal banner | Bottom only |

**Red lines:**
- NEVER interrupt play
- No sidebars - breaks minimalist flow
- No pre-session ads - kills drop-in spontaneity

---

## 🔧 Implementation Route Strategy

### Option 1: Preview All 3 with URL Params (Recommended for MVP)

Use query parameter to switch prototypes in same build:

```
/?prototype=clubhouse  → Clubhouse shell
/?prototype=arena      → Arena shell  
/?prototype=quickcourt → Quick Court shell
```

**Pros:** Single deploy, easy A/B testing, shareable links
**Cons:** Some code branching in shared components

### Option 2: Separate Routes (Recommended for Production)

```
/clubhouse/*    → Full Clubhouse variant
/arena/*       → Full Arena variant  
/quickcourt/*  → Full Quick Court variant
```

**Pros:** Clean separation, each variant fully independent
**Cons:** More initial setup, 3x the routing

### Recommended for This Build:

**Start with Option 1 (URL params)** for rapid prototyping, then migrate to Option 2 (routes) for final product. This gives you:
1. All 3 prototypes in one repo
2. Easy preview sharing (send link with `?prototype=X`)
3. Shared game logic preserved
4. Clear shell/theme switching

---

## 📋 Implementation Checklist

### Phase 1: Shell Skeleton (All 3)
- [ ] Create `src/variants/clubhouse/ClubhouseVariant.tsx`
- [ ] Create `src/variants/arena/ArenaVariant.tsx`
- [ ] Create `src/variants/quickcourt/QuickCourtVariant.tsx`
- [ ] Add prototype param to App.tsx routing

### Phase 2: Clubhouse
- [ ] Clubhouse-themed AppShell
- [ ] Landing + Session cards
- [ ] Player cards with skill badges
- [ ] Ladder view
- [ ] Ad placements (banners)

### Phase 3: Arena
- [ ] Dark/neon AppShell
- [ ] Full-screen bracket component
- [ ] Tap-to-score match nodes
- [ ] Winner celebration
- [ ] Ad placements (minimal)

### Phase 4: Quick Court
- [ ] Minimal AppShell (no header/nav)
- [ ] Giant player input
- [ ] Single-court card view
- [ ] End-of-session summary
- [ ] Ad placements (end-only)

### Phase 5: Integration
- [ ] All prototypes route-able
- [ ] Game logic verified working
- [ ] Ad zones verified
- [ ] Mobile responsive check

---

## 📦 Deliverable Files

```
src/
├── variants/
│   ├── clubhouse/
│   │   ├── ClubhouseVariant.tsx
│   │   └── components/
│   │       ├── ClubhouseLanding.tsx
│   │       ├── PlayerCard.tsx
│   │       ├── LadderBoard.tsx
│   │       └── ...
│   ├── arena/
│   │   ├── ArenaVariant.tsx
│   │   └── components/
│   │       ├── ArenaLanding.tsx
│   │       ├── BracketView.tsx
│   │       └── ...
│   └── quickcourt/
│       ├── QuickCourtVariant.tsx
│       └── components/
│           ├── QuickStartLanding.tsx
│           ├── QuickPlayerInput.tsx
│           └── ...
```

---

## 🎯 Success Criteria

- [ ] All 3 prototypes render correctly
- [ ] Navigation works as specified per prototype
- [ ] Game logic (scheduler, scoring) unchanged
- [ ] Ad placements visible in correct zones
- [ ] Sharp visual differentiation between all 3
- [ ] Shareable preview links work

---

*End of Build Brief*
