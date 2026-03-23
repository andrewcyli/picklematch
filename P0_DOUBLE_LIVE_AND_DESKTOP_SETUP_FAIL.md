# PickleMatch P0 Bugs — Double Live in Rail + Desktop Setup Save Failure

Owner: Henry
Date: 2026-03-22
Status: Approved Builder urgent fix

## User-reported regressions

### 1. Match timeline shows 2 live sessions
User screenshot shows the match rail contains two cards labeled `Live` at once.
This is wrong for the current selected timeline context and is causing confusion.

Important nuance:
- The app may legitimately have 2 courts live at once,
- but the rail/timeline presentation must not create confusing duplicate-live semantics.
- The rail should represent the current state clearly and consistently with the selected/featured context.

Investigate whether:
- the rail is showing both courts as `Live` when it should instead anchor to the selected court lane,
- or whether the rail should have only one primary live focal card + other context represented differently,
- or whether the previous fixes reintroduced conflicting rail semantics.

Fix the rail so the presentation is unambiguous and consistent.

### 2. Desktop setup save failure
On desktop, clicking `Continue to Players` reports `Failed to save setup`.
On mobile, the same flow works.

This means there is likely a desktop-specific interaction/state bug in setup save:
- desktop-only control state not serializing correctly
- select/radio values not persisting correctly
- invalid payload produced by desktop layout path
- UI event handler divergence between breakpoints

## Required work
1. Reproduce desktop setup save failure locally and identify root cause
2. Fix desktop `Continue to Players` so it saves consistently
3. Revisit match rail logic/presentation so it no longer shows confusing duplicate `Live` states
4. Ensure fixes do not break mobile flow

## Acceptance criteria
- desktop setup save works reliably
- mobile setup save still works
- match rail no longer presents confusing double-live state
- deploy to Vercel
- commit hash + live link + root cause summary