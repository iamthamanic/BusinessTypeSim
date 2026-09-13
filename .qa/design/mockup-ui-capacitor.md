# Design — Mockup UI + Capacitor

## Goal
Native shell + visual parity with the 10-screen mockup board, without changing simulation authority.

## Approach
1. Generate `android/` + `ios/` via Capacitor after production build into `dist/`.
2. Split App shell into `src/features/*` screens; keep domain calls in App/orchestration.
3. Dark-first tokens; SVG charts/gauges (no new chart library).
4. Flow: Onboarding → Scenario → Run shell with bottom nav; Decision as multi-step + sim interstitial.

## Non-goals
Pixel-perfect asset recreation of AI mockup photos; new backend; changing scoring formulas.
