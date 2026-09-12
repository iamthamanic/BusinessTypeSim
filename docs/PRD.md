# Product Requirements Document — Business Type

## Status

Implementation readiness: READY WITH ASSUMPTIONS

## Product vision

Business Type is a mobile CEO decision simulation. Players enter persistent company scenarios, gather information, speak with virtual advisors, make free-form decisions and see immediate as well as delayed consequences.

## Core principles

1. Decision Quality and Outcome are separate.
2. There is no hidden single correct answer.
3. The simulated world is structured and replayable.
4. Free text is interpreted before it becomes a structured game action.
5. Uncertainty is visible instead of being hidden behind confident narration.
6. The narrative layer is not the authority for simulation state.

## MVP

The MVP contains:

- three materially different company scenarios;
- mobile scenario selection;
- company overview;
- Decision Room;
- information requests that consume simulated time;
- advisor conversations;
- free-form decision composer with interpretation review;
- six-dimensional Decision Quality review;
- seeded delayed consequences;
- Decision Ledger / timeline;
- local demo persistence;
- optional cloud persistence;
- Capacitor setup for Android and iOS.

## Primary journey

```text
Choose scenario
→ inspect situation
→ gather information
→ consult team
→ compose decision
→ review interpretation
→ commit decision
→ simulate consequences
→ review decision quality
→ continue timeline
```

## Decision Quality dimensions

- Framing
- Information
- Alternatives
- Objectives
- Reasoning
- Execution

## UX

The visual direction is an Executive Decision Room rather than a casual tycoon. The primary mobile navigation is Home, Company, Decision, Team and Timeline.

## Architecture constraints

- React + TypeScript + Vite frontend.
- Capacitor is present from project start.
- Shared simulation rules live in a framework-independent domain core.
- Supabase is the preferred cloud persistence layer.
- External AI/search providers remain behind adapters.

## Explicit non-goals

- multiplayer;
- 3D world;
- global real-time economy;
- thousands of individually simulated employees;
- fixed A/B/C quiz logic;
- one model instance per virtual executive.

## Open validation

Before production release, the product still requires playtest calibration of Decision Quality, an evaluation of structured interpretation quality and native Android/iOS smoke tests.
