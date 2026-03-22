# PickleMatch UX/UI Concept Pack

**For:** Henry  
**Date:** 2026-03-19  
**Goal:** 3 distinct prototype directions for PickleMatch redesign

---

## Current State Summary

- **Navigation:** Bottom nav (Setup → Players → Matches → History → Leaders)
- **Theme:** Green tennis-court palette, gradient backgrounds, Lucide icons
- **Structure:** 3 variants (Classic/Tournament/Qualifier), game-code join system
- **Ads:** Desktop-only sidebars (Google AdSense)

---

## 🏆 Prototype A: "The Clubhouse"

### Community-First Social Experience

**Rename:** PickleMatch → **Clubhouse** (or Keep PickleMatch, add tagline "Your Home Court")

**Theme & Feel:**
- Warm, inviting, wood-panel aesthetic (like a real sports club)
- Color: Warm amber/walnut tones, deep forest green, cream
- Typography: Serif headers (elegant), sans-serif body
- Mood: "Friday night at the club" — social, welcoming, familiar

**Screen Structure:**

| Screen | New Structure |
|--------|---------------|
| **Landing** | "Welcome back to the club" + today's sessions + quick join |
| **Player Cards** | Avatar + skill rating (1-5 paddles) + win rate + "last played with" |
| **The Ladder** | Visual ranking board — who's playing tonight, challenge system |
| **Match View** | "Who's on next" prominent, court assignments, social feed style |
| **History** | Personal match log, rivalry indicators (you vs. [player]) |

**Navigation Model:**
- **Tab-based:** Home | Ladder | Sessions | My Profile
- Contextual: Tapping a session shows court/player list, not full scheduler

**Key Differences from Current UX:**

1. **Player identity is front-and-center** — not just a name list, but player cards with ratings, history, connections
2. **Ladder replaces generic leaderboard** — ongoing rankings, challenge up/down mechanic
3. **Sessions are recurring events** — "Monday Night" has memory, players return week after week
4. **Social signals** — "3 of your regulars are playing tonight" — drives attendance

**Google Ads Placement:**
- Banner between session list items (native-looking, "Sponsor: Local Pro Shop")
- No sidebars — feels too commercial for club vibe
- Interstitial: "Book your next session" between matches

**Why Choose This:**
- Best for **recurring club play**, building community, retention
- Appeals to **social players** who want familiarity and recognition
- Differentiates from generic scheduling tools — feels like a **product for a club**, not just a scheduler

---

## ⚡ Prototype B: "Arena"

### Tournament-Night Intensity

**Rename:** PickleMatch → **Arena** (or "Match Night")

**Theme & Feel:**
- Bold, dramatic, sports broadcast aesthetic
- Color: Stark black/white with neon accent (electric green or hot orange)
- Typography: Bold condensed headers (like sports scores), mono numbers
- Mood: "Championship night" — high energy, competitive, exciting

**Screen Structure:**

| Screen | New Structure |
|--------|---------------|
| **Landing** | Big "START TOURNAMENT" button, upcoming brackets visible |
| **Bracket View** | Full-screen bracket — tap match to score, auto-advance winner |
| **Live Scoreboard** | Court-by-court scores, "NOW PLAYING" highlight reel |
| **Seeding** | Drag-to-seed interface before bracket generates |
| **Results** | Winner celebration animation, final standings |

**Navigation Model:**
- **Single-flow:** Setup → Bracket → Score → Champion
- No bottom nav during match — full immersion
- Floating "Back to bracket" button

**Key Differences from Current UX:**

1. **Bracket is the primary view** — not schedule table, tournament feels like a bracket from first tap
2. **Tap-to-score** — any match on bracket opens score modal, winner auto-advances
3. **Seeding UI** — drag players to set seeds before generation (currently random)
4. **Winner celebration** — confetti, "CHAMPION" banner, shareable results
5. **Scoreboard mode** — dark theme, large numbers, broadcast feel

**Google Ads Placement:**
- Pre-tournament: "Powered by [Sponsor]" banner
- Between rounds: "Next match in X minutes" — hold attention
- Results page: "Tournament sponsored by [local business]"
- Keep it minimal — don't interrupt the intensity

**Why Choose This:**
- Best for **tournament organizers** running events
- Feels **premium and professional** — could charge for tournament mode
- **Differentiates sharply** from casual schedulers — this is for serious play
- Great for **venue promotion** — "Host your tournament on Arena"

---

## 🎯 Prototype C: "Quick Court"

### Drop-In Minimalist

**Rename:** PickleMatch → **Quick Court** (or "Just Play")

**Theme & Feel:**
- Ultra-clean, almost clinical
- Color: Neutral grays, single accent color, high contrast
- Typography: System fonts, generous whitespace
- Mood: "Get in, play, get out" — functional, fast, frictionless

**Screen Structure:**

| Screen | New Structure |
|--------|---------------|
| **Landing** | Single question: "Start a game?" → Yes → Quick add players |
| **Add Players** | Massive input field, comma-separated names, instant list |
| **Court View** | One court = one card, swipe to mark complete |
| **Waiting List** | Simple queue — next player highlighted, one-tap promote |
| **Done** | Summary: who played, scores, duration |

**Navigation Model:**
- **Linear flow:** Start → Players → Courts → Done
- No persistent nav — guided experience
- Bottom progress indicator (step 1 of 3)

**Key Differences from Current UX:**

1. **Fastest path to play** — 3 taps max to start matching
2. **Waiting list built-in** — queue management, auto-promote when someone leaves
3. **No modes selection** — algorithm picks best format (round-robin, bracket, whatever fits)
4. **Minimal UI** — everything collapses, only active match/court visible
5. **Single-court default** — expand to multi-court only if needed (toggle)

**Google Ads Placement:**
- End-of-session: "Thanks for playing! [Local venue ad]"
- Idle timeout: "Starting in 5... view nearby courts" (geolocation hook)
- Keep it to **end-of-flow** — never interrupt play

**Why Choose This:**
- Best for **drop-in play**, community centers, casual players
- **Fastest to adopt** — no learning curve, explain in one sentence
- Appeals to **venue operators** who just need "something that works now"
- Lowest dev complexity — simpler components, faster build

---

## Comparison Matrix

| Aspect | Clubhouse (A) | Arena (B) | Quick Court (C) |
|--------|--------------|-----------|------------------|
| **Target User** | Regular club players | Tournament organizers | Drop-in players |
| **Primary Goal** | Community & recurrence | Competition & spectacle | Just play |
| **Vibe** | Warm, social, familiar | Bold, dramatic, exciting | Fast, minimal, functional |
| **Key Feature** | Ladder & player cards | Bracket-first scoring | 3-tap start |
| **Ads Model** | Native sponsor banners | Minimal, between rounds | End-of-session only |
| **Complexity** | Medium | Medium-low | Low |
| **Retention Driver** | Social connections | Competition | Convenience |

---

## Recommendation for Henry

**If you want to build the "future of pickleball community" → A (Clubhouse)**
- Long-term vision, subscription potential, venue partnerships

**If you want the most usable tournament tool today → B (Arena)**
- Clear gap in market, immediate value, "pro" positioning

**If you want fastest path to market with lowest dev cost → C (Quick Court)**
- MVP approach, viral for drop-in venues, simple to maintain

**Hybrid option:** Start with **C** (lowest lift), then add **B** tournament mode as v2, then **A** community features as v3.

---

## Next Steps

1. Henry picks a direction
2. We build one high-fidelity prototype (Figma or code)
3. User testing with 3-5 real players/organizers
4. Iterate before full build

---

*End of Concept Pack*
