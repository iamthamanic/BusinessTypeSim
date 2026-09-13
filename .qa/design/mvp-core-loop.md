# Design — MVP Core Loop

## Intent
Ein kompletter Business-Type-Run soll auf Mobile vom Szenariostart über Informationsbeschaffung und freie Entscheidung bis zur Simulation, Decision-Quality-Auswertung und verzögerten Folge spielbar sein.

## Recommendation
Modularer Monolith: React/Capacitor UI + pure TypeScript Simulation Core. Lokaler Demo-Modus nutzt denselben Core; Cloud-Runs werden ausschließlich serverseitig über Supabase Edge Functions mutiert. AI interpretiert und erklärt, besitzt aber keine Simulation Authority.

## Architecture boundaries
- UI importiert nur Public Domain API.
- Simulation Core kennt weder React noch Supabase noch LLM Provider.
- Cloud-Mutationen laufen über `game-api` mit Ownership/RLS und Revision Check.
- `ai-orchestrator` und `research-debrief` sind read-only gegenüber Game State.

## Risks
- AI-Interpretation muss gegen ein eigenes deutsches Eval kalibriert werden.
- Scoring-Gewichte sind V1 und benötigen Playtest-Kalibrierung.
- Native Android/iOS Smoke Tests stehen aus, bis Dependencies und SDKs installiert sind.

## Verification plan
- deterministischer Domain Self-Check;
- TypeScript Strict;
- Browser/Capacitor UI Verify nach Dependency-Installation;
- Supabase RLS/Concurrency Integration Test in Staging.
