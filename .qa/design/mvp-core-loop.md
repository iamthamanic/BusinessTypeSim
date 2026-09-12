# Design — MVP Core Loop

## Intent
Ein kompletter Business-Type-Run soll auf Mobile vom Szenariostart über Informationsbeschaffung und freie Entscheidung bis zur Simulation, Decision-Quality-Auswertung und verzögerten Folge spielbar sein.

## Recommendation
Modularer Monolith: React/Capacitor UI plus pure TypeScript Simulation Core. Lokaler Demo-Modus nutzt denselben Core; Cloud-Runs werden serverseitig über Supabase mutiert. AI interpretiert und erklärt, besitzt aber keine Simulation Authority.

## Architecture boundaries
- UI importiert nur die öffentliche Domain-API.
- Simulation Core kennt weder React noch Supabase noch LLM Provider.
- Cloud-Mutationen laufen über einen authentifizierten Game-Endpunkt.
- Research/AI sind read-only gegenüber dem autoritativen Game State.

## Risks
- AI-Interpretation benötigt ein eigenes Eval.
- Scoring-Gewichte benötigen Playtest-Kalibrierung.
- Native Android/iOS Smoke Tests folgen nach Installation der Plattformtoolchains.
