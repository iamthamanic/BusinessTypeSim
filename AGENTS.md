# AGENTS.md — Business Type

Read this file before changing code or product behavior.

## Product

Business Type is a mobile CEO decision simulation. Product requirements live in `docs/PRD.md` and visual rules in `docs/UI_STYLEGUIDE.md`.

## Stack

- React + Vite + TypeScript
- Capacitor for Android/iOS
- Supabase for optional cloud persistence
- framework-independent TypeScript simulation core

## Architecture rules

1. The simulation core must not import React, Capacitor or infrastructure clients.
2. UI code must not contain simulation rules.
3. External services stay behind adapters.
4. Structured input is validated at trust boundaries.
5. Mobile safe areas, loading, empty and error states are mandatory for user-facing flows.
6. Do not introduce microservices, multiplayer or speculative abstractions without a proven need.

## Language

UI copy may be German. Code, identifiers and commits use English.

## Delivery

Features are implemented as vertical user-value slices. Shared simulation rules remain centralized in the domain layer.

## Documentation

Keep README, PRD, architecture and styleguide aligned with material behavior changes.
