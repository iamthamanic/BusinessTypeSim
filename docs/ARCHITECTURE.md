# Architecture — Business Type

## Overview

Business Type uses a modular monolith:

```text
React / Capacitor UI
        |
        +--> Application layer
        |
        +--> Simulation core
        |
        +--> Infrastructure adapters
```

## Modules

- `src/app/` — mobile application shell and user flows.
- `src/domain/` — public simulation API.
- `src/infrastructure/` — persistence and external-service adapters.
- `supabase/` — optional cloud persistence and server functions.

## Dependency rules

The simulation core is framework-independent. UI modules may depend on the domain API. The domain must not depend on React or Capacitor.

## Mobile runtime

Capacitor is part of the project from the start. Android and iOS share the same web codebase and keep native integrations behind adapters.

## Delivery strategy

Features are implemented as vertical user-value slices while shared simulation rules remain centralized in the domain core.
