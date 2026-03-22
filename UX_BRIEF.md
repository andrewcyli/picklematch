# PickleMatch UX/UI Strategic Brief
## Significant Overhaul Directions for Dual-Audience Product

**Date:** March 19, 2026  
**Prepared for:** Henry (Designer/Builder Handoff)  
**Status:** Research Synthesis → Design Directions  
**Constraint:** Game logic & feature set remain intact

---

## Executive Summary

Current PickleMatch is a functional tournament scheduler with solid technical foundations (Supabase realtime, game codes, multiple scheduling modes). However, the UX suffers from **organizer-centric bias**—it assumes one person manages everything. This brief addresses two distinct audiences with divergent needs, identifies friction points in the current flow, and presents 3 differentiated UX directions that could fundamentally reposition the product.

---

## Part 1: Audience Analysis & Core User Journeys

### Audience A: Social Players (The 80%)
**Who they are:** Recreational pickleball players, 35-65, play 1-3x/week, join games via invite or community boards  
**Primary goal:** Get on a court with good people, fast  
**Tech comfort:** Moderate—use apps when they remove friction, abandon when it adds steps

#### Core Journey: "I Got an Invite"
```
Receive link/code → Join game (no account) → See my matches → Play → See results
```
**Current friction:**
- Must navigate through organizer views to find "I'm Playing" button
- No sense of "my status" in the session
- Score entry feels like an organizer task, not a player task

#### Core Journey: "Find a Game Nearby"
```
Open app → See nearby sessions → Check skill level → Request to join → Get confirmed → Play
```
**Current gap:** This journey doesn't exist—no discovery, no public sessions

---

### Audience B: Venue Organizers (The 20%)
**Who they are:** Club managers, park district coordinators, regulars who "run" weekly games  
**Primary goal:** Fill courts efficiently, keep regulars happy, minimize management overhead  
**Tech comfort:** Varies widely; some want full control, others want automation

#### Core Journey: "Monday Night Setup"
```
Open app → Load "Monday 6pm template" → See who's coming (RSVPs) → One-click generate schedule → Monitor during play
```
**Current friction:**
- No session templates—must reconfigure every time
- No RSVP/waitlist flow—organizer manually tracks who's coming
- No visibility into "no-shows" until game time

#### Core Journey: "Tournament Day"
```
Set format (bracket) → Players check in → Auto-seed or manual seed → Run bracket → Share results
```
**Current friction:**
- Bracket view is dense and intimidating
- Seeding is random only—no manual override
- No check-in flow to confirm attendance

---

## Part 2: Top Friction Points (Current Product)

| # | Friction Point | Impact | Evidence |
|---|----------------|--------|----------|
| 1 | **Organizer bottleneck** | Single point of failure—if organizer's phone dies, session stalls | No co-host capability observed |
| 2 | **Player self-serve gap** | Players can't join without organizer adding them | PlayerSetup.tsx requires manual entry |
| 3 | **No persistent identity** | Players re-enter name every session | No user accounts (by design), but no persistent player profile either |
| 4 | **Template absence** | Recurring sessions require full re-setup | No session template system |
| 5 | **Bracket intimidation** | TournamentBracketView is information-dense | Visual hierarchy issues—hard to find "current match" |
| 6 | **Score entry ambiguity** | Unclear who should enter scores | No role differentiation in score entry flow |
| 7 | **No waitlist/overflow** | Full sessions turn people away | No waitlist logic in player management |
| 8 | **Skill matching missing** | Random matchups regardless of skill | No rating/skill field in player profiles |

---

## Part 3: Information Architecture Recommendations

### Current IA (Observed)
```
App Shell
├── Game Code Dialog (entry point)
├── Setup (GameSetup.tsx)
├── Players (PlayerSetup.tsx)
├── Matches (ScheduleView.tsx)
├── Leaderboard
└── History
```

**Problem:** Linear flow assumes single-session use. No persistent state, no discovery, no templates.

### Recommended IA (High-Level)
```
PickleMatch
├── FOR EVERYONE (no code needed)
│   ├── Discover (nearby public sessions)
│   ├── My Games (upcoming + history)
│   └── Profile (persistent player identity)
│
├── WITH A CODE (session-specific)
│   ├── Dashboard (what's happening now)
│   ├── My Matches (player view)
│   ├── Court View (live status)
│   └── Results
│
└── ORGANIZE (hosting tools)
    ├── Templates (saved configurations)
    ├── New Session (from template or scratch)
    ├── Manage (players, waitlist, check-in)
    └── Live Control (pause, reschedule, broadcast)
```

**Key shift:** Separate "discovery/participation" from "session management." The current app conflates these.

---

## Part 4: Google Ads Placement Strategy (Trust-Preserving)

### Guiding Principle
Ads must fund the product without undermining the trust required for social coordination. PickleMatch handles **real-world commitments**—ads that feel manipulative or intrusive destroy that trust.

### Recommended Placements

| Location | Format | Rationale |
|----------|--------|-----------|
| **Discover feed** | Native inline (between session cards) | Contextual relevance—players browsing = receptive to gear, lessons, nearby venues |
| **Post-match celebration** | Rewarded interstitial (optional) | Positive emotional moment; user just won—offer "watch ad to unlock detailed stats" or "share highlight" |
| **Between round-robin rotations** | Banner during natural pause | Players are waiting anyway; place below fold, never above "next match" info |
| **Template gallery** | Sponsored template slots | Venue partners can promote "Pro template by [Local Club]"—native, useful |
| **Results/history** | Bottom banner | Low-intent browsing moment; doesn't interrupt action |

### Placement Red Lines (Never)
- Never place ads above "next match" or "check in" CTAs
- Never use interstitials during active gameplay
- Never autoplay video with sound
- Never place ads in modal dialogs (players will mistake them for app UI)

### Trust-Preserving Native Ad Ideas
- **"Featured Venue"** in discover feed (labeled clearly)
- **"Gear Up"** product cards in player profile
- **"Local Leagues"** section in results page

---

## Part 5: Three Differentiated UX Directions

Each direction represents a fundamentally different positioning while keeping the core game logic intact. Think of these as "product personalities" that would attract different user bases.

---

## Direction A: "The Clubhouse" (Community-First)

### Positioning
PickleMatch as a **community platform** for regular groups. Emphasizes recurring play, skill development, and social connection. Think "Strava for pickleball groups."

### Interaction Model
- **Persistent player profiles** with skill ratings (self-reported 1-5 or Beginner/Intermediate/Advanced)
- **Club/Group concept** — join a club, see all club sessions, get notified of new games
- **Ladder system** — challenge-based rankings within clubs
- **Social features** — friend players, see their activity, form "regular crews"

### Key Screens (New/Modified)
| Screen | Purpose |
|--------|---------|
| Club Home | Activity feed of upcoming sessions, announcements, ladder standings |
| Player Card | Skill badge, recent performance, friend status, "invite to game" |
| Ladder View | Rankings, challenge button, challenge history |
| Session Template | Save configurations per club ("Tuesday Advanced Doubles") |

### Monetization Placements
- **Club premium tiers** — more members, advanced stats, custom branding (primary revenue)
- **Sponsored clubs** — local venues sponsor club pages
- **Gear marketplace** — native affiliate placements in player profiles
- Ads: Minimal; focused on discover feed

### Pros
- Creates network effects (more valuable as more friends join)
- High retention—clubs meet weekly
- Differentiation from one-off tournament tools
- Multiple revenue streams beyond ads

### Cons
- Requires persistent accounts (shift from anonymous design)
- More complex to build—social features, notifications, moderation
- Slower viral loop (need critical mass per club)

### Best For
Markets with established pickleball communities (Florida, Arizona, California) where regular play is the norm.

---

## Direction B: "Tournament Central" (Event-First)

### Positioning
PickleMatch as a **tournament operations platform**. Emphasizes professional-grade bracket management, live scoring, and spectator experience. Think "Challonge meets live sports app."

### Interaction Model
- **Brackets as primary UI** — not a tab, the main experience
- **Live score broadcast** — spectators can follow along remotely
- **Seeding tools** — manual seed entry, import from rankings
- **Multi-division support** — run Men's, Women's, Mixed simultaneously
- **Check-in flow** — QR code check-in, automated forfeit handling

### Key Screens (New/Modified)
| Screen | Purpose |
|--------|---------|
| Bracket Hero | Full-screen interactive bracket, tap to score, zoom to division |
| Tournament Dashboard | Organizer control center—check-in status, court assignments, alerts |
| Live Match View | Big score, timer, player stats—designed for spectators |
| Seeding Interface | Drag-and-drop seeding, import from CSV/external ranking |
| Broadcast Mode | Public URL for spectators, real-time updates |

### Monetization Placements
- **Tournament fees** — per-player fee processing (primary revenue)
- **Sponsored tournaments** — branded events
- **Premium features** — live streaming integration, advanced analytics
- Ads: Limited to broadcast mode (spectators expect ads like ESPN)

### Pros
- Clear value proposition—easiest to monetize per event
- Appeals to serious players/organizers (higher willingness to pay)
- Viral at events—spectators see app, download for their own tournaments
- Less complex than social features

### Cons
- Lower frequency—tournaments are monthly at best for most users
- Competitive space (existing tournament software)
- Requires payment processing (compliance, fees)

### Best For
Markets with active tournament scenes, pickleball clubs that run monthly events, and users seeking a premium bracket experience.

---

## Direction C: "Drop-In" (Spontaneity-First)

### Positioning
PickleMatch as a **spontaneous play enabler**. Emphasizes finding games right now, flexible rosters, and casual drop-in culture. Think "Uber for pickup pickleball."

### Interaction Model
- **"Looking to Play" status** — toggle on, broadcast to nearby players/venues
- **Flexible session capacity** — join waitlist, auto-promote when spots open
- **Quick game creation** — 3-tap start: time, place, skill level
- **Ratings-optional** — can play anonymously or build reputation over time
- **Session discovery** — map view of games happening nearby today

### Key Screens (New/Modified)
| Screen | Purpose |
|--------|---------|
| Play Now | Toggle "looking," see nearby games, request to join |
| Map View | Pins for active/nearby sessions, filter by skill/time |
| Session Card | Status (open/waitlist/full), skill range, player count, request button |
| Flex Roster | Waiting list with auto-promote, check-in confirms spot |
| Quick Score | Minimal score entry—winner only, no detailed stats |

### Monetization Placements
- **Venue subscriptions** — venues pay to list sessions, manage bookings (primary revenue)
- **Player premium** — see more sessions, priority on waitlists
- **Day-pass integration** — partner with venues for payment
- Ads: Heavy in discover/map view (acceptable in browsing context)

### Pros
- Highest viral potential—solves "I want to play now" pain
- Scales to any market, even without established clubs
- Venues become advocates (they need fill rates)
- Lowest barrier to entry for new users

### Cons
- Hardest to monetize from players (expectation of free)
- Requires venue sales/partnerships
- Quality control—need to prevent ghost sessions
- Safety concerns—meeting strangers

### Best For
Urban markets, younger demographics, venues struggling with fill rates, players without regular groups.

---

## Part 6: Recommendation Criteria

| Criteria | Clubhouse | Tournament Central | Drop-In |
|----------|-----------|-------------------|---------|
| **Time to MVP** | 4-6 months | 2-3 months | 3-4 months |
| **Market size** | Medium (established clubs) | Small (tournament organizers) | Large (all casual players) |
| **Monetization clarity** | Medium (freemium clubs) | High (transaction fees) | Medium (venue SaaS) |
| **Competitive moat** | High (network effects) | Low (replaceable) | Medium (venue relationships) |
| **Technical complexity** | High | Medium | Medium |
| **User retention** | High | Low-Medium | Medium |
| **Viral coefficient** | Medium | High at events | High |

---

## Part 7: Concrete Next Steps for Builder

### If Direction A (Clubhouse):
1. Add skill rating field to player profile
2. Design "Club" entity (name, location, members, sessions)
3. Create ladder ranking algorithm
4. Build persistent player identity (even if pseudo-anonymous)

### If Direction B (Tournament Central):
1. Redesign bracket view as primary navigation
2. Build check-in flow with QR codes
3. Create "Tournament Dashboard" for organizers
4. Add manual seeding interface

### If Direction C (Drop-In):
1. Build session discovery with map/list toggle
2. Create "Looking to Play" toggle and status
3. Design waitlist with auto-promote logic
4. Add venue onboarding flow

### Universal (Apply to Any Direction):
- Add session templates
- Separate "player view" from "organizer view" more distinctly
- Improve score entry UX (bigger touch targets, clearer confirmation)
- Add post-match celebration moment (shareable result card)

---

## Appendix: Current Code Assets to Preserve

These files contain core logic that should not be rebuilt:

| File | Purpose |
|------|---------|
| `src/lib/scheduler.ts` | Round-robin generation |
| `src/lib/tournament-scheduler.ts` | Single/double elimination |
| `src/lib/qualifier-tournament-scheduler.ts` | Pools → knockout |
| `src/lib/qualifier-progression.ts` | Qualifier advancement logic |
| `src/lib/validation.ts` | Match score validation |
| `src/hooks/useRealtimeSync.ts` | Supabase realtime sync |
| `src/hooks/useAnonymousAuth.ts` | Anonymous auth flow |

---

*End of Brief*
