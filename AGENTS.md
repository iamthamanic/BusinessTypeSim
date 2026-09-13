# AGENTS.md — Business Type

Dieses Dokument ist die verbindliche Projektkarte für Menschen und KI-Agenten. Lies es zuerst, bevor du Code oder Produktverhalten änderst.

## Was ist dieses Projekt?

Business Type ist eine mobile, branchenübergreifende CEO-Entscheidungssimulation. Spieler untersuchen einen persistenten Unternehmenszustand, beschaffen Informationen, treffen freie Managemententscheidungen und erleben reproduzierbare deterministische sowie probabilistische Folgen. Die Qualität des Entscheidungsprozesses wird getrennt vom zufälligen Ergebnis bewertet.

**PRD:** [docs/PRD.md](docs/PRD.md)

### Was dieses Repo ist

- Mobile-first Produkt mit Web-Codebasis und Capacitor-Targets für Android/iOS.
- Modularer Monolith mit purem autoritativem Simulation Core.
- AI-gestütztes Interface mit strikt begrenzter Autorität.
- MVP-Core-Loop implementiert; neue Features folgen weiterhin Spezifikation/Acceptance vor Code.

### Was dieses Repo nicht ist

- Kein A/B/C-Quiz mit versteckter korrekter Antwort.
- Kein LLM, das Finanzwerte oder Game State frei erfindet.
- Keine globale Wirtschaftssimulation, kein Multiplayer und keine 3D-Welt im MVP.
- Keine Multi-Agent-Architektur pro virtuellem C-Level-Rollenprofil.

## Tech Stack (verbindlicher Zielstand)

| Bereich | Technologie | Notiz |
|---|---|---|
| Frontend | React + Vite + TypeScript strict | Mobile-first |
| Mobile Runtime | Capacitor | Android + iOS ab dem ersten Slice |
| Backend | Self-hosted Postgres + Hono API (Docker) | Auth, Persistenz, Game/AI; optional neben n8n auf Hostinger KVM2 |
| AI | Ollama Cloud hinter Provider-Adapter | API key server-only |
| Validation | Zod 4 | alle externen/LLM-Payloads |
| Tests | Vitest + deterministischer Node Self-Check; Playwright via verify-ui | Domain zuerst deterministisch testen |
| Deployment | Web build + native Android/iOS builds | Cloud Backend separat |

**Nicht verwenden ohne explizite Architekturentscheidung:** Next.js, React Native, Flutter, Microservices, Kafka, separate Python-Simulation, zustandsverändernde LLM-Calls außerhalb der Action-Pipeline. Supabase (managed oder self-hosted) ist für den Hostinger-Pfad nicht vorgesehen (siehe ADR-0002).

## Architektur

```text
src/
├── app/             # App shell, navigation, providers
├── features/        # vertical UI/application slices
├── domain/          # public re-exports of shared pure simulation APIs
├── ai/              # contracts, tools, prompts, orchestration
├── infrastructure/  # self-host API client, local run, AI/debrief adapters
└── shared/          # UI primitives and truly generic helpers
shared/domain/       # pure authoritative simulation and business rules
server/              # Hono API (auth, game, AI, debrief) for Hostinger Docker
deploy/              # docker compose: web + api + postgres
```

### Schichtenregeln

1. `shared/domain/**` importiert niemals React, Capacitor, DB-Client, LLM SDK oder Search SDK; `src/domain/**` re-exportiert nur diese pure API.
2. Nur die Simulation Engine mutiert autoritativen `WorldState`.
3. LLM-Ausgaben sind untrusted und werden vor jeder Verwendung schema-validiert.
4. `features/**` dürfen Domain-Public-APIs verwenden, aber keine Domain-Interna importieren.
5. `infrastructure/**` implementiert Adapter; Domain kennt keine Provider-IDs oder Cloud-Semantik.
6. Geld = Integer Minor Units; Prozentwerte/Basis Points = Integer, wo relevant.
7. Probabilistische Simulation ist seeded und replaybar.
8. Kein Business Rule Code in React-Komponenten.
9. Server-only Secrets bleiben server-only; keine Provider-Secrets in `VITE_*`.
10. Scenario- und Action-Schemas sind versioniert; laufende Runs bleiben an ihre Scenario-Version gebunden.

## Sprache & Naming

| Bereich | Sprache |
|---|---|
| UI, Fehlermeldungen, Demo-Szenarien | Deutsch im MVP |
| Code, Typen, APIs, Commits | Englisch |
| Persistierte maschinenlesbare Enum-Werte | Englisch, stabil, nicht lokalisiert |

TypeScript strict. Kein `any`, kein `@ts-ignore`, kein `@ts-nocheck`, keine impliziten Escape Hatches.

## Validation

Nach dem App-Scaffold:

- Checks: `npm run checks`
- Dev: `npm run dev` → `http://localhost:5173`
- E2E: `npm run test:e2e`

Kein „done“-Claim ohne passenden Test-Gate-Nachweis. Domain-Regeln benötigen deterministische Fixtures.

## UI / Design

- Styleguide: [docs/UI_STYLEGUIDE.md](docs/UI_STYLEGUIDE.md)
- Leitidee: **Executive Decision Room**, nicht Casual-Tycoon.
- Hauptnavigation: Home, Unternehmen, Entscheidung, Team, Verlauf.
- Jede interaktive Oberfläche braucht relevante Loading-, Empty-, Error-, Disabled-, Focus- und Offline-Zustände.
- UI darf nicht zu einem reinen Chat-Interface degenerieren; Unternehmensdaten brauchen echte Tabellen, Charts, Listen und Timeline-Views.

## AI Contract

Verbindlich: [docs/AI_CONTRACT.md](docs/AI_CONTRACT.md)

Das LLM darf Nutzerintention interpretieren, Tools auswählen und Ergebnisse erklären. Es darf weder World State direkt schreiben noch Zahlen/Wahrscheinlichkeiten außerhalb der Engine als Spielwahrheit setzen.

## Issue Template

Alle Issues folgen dem kanonischen `@issue-contract`. Projektwerte liegen in `.qa/project.yaml`.

## Security Checklist (Secure by Default)

### Frontend Security

| # | Maßnahme | Fail if |
|---|---|---|
| F-01 | HTTPS überall | Prod läuft mit Mixed Content oder unsicheren externen Calls |
| F-02 | Input-Validierung & sichere Ausgabe | Unvalidierter Freitext erreicht gefährliche Render-/Action-Pfade |
| F-03 | Keine sensiblen Daten im Browser | Tokens/Secrets/Passwörter werden unsicher persistiert |
| F-04 | Session-/Request-Schutz | State-changing Requests können ohne gültige Auth-/Ownership-Prüfung laufen |
| F-05 | API-Keys nie im Frontend | Provider-Secrets landen in Client-Bundle oder `VITE_*` |

### Backend Security

| # | Maßnahme | Fail if |
|---|---|---|
| B-01 | Standard-Auth | Eigenbau-Auth oder schwache Credential-Speicherung |
| B-02 | Authorization/RLS | Run/Scenario-Ressource ohne Owner-/Role-Prüfung |
| B-03 | Endpoint-Schutz | geschützte Mutation ohne Auth |
| B-04 | SQL-Injection-Prävention | User-Input wird in SQL zusammengesetzt |
| B-05 | Basis Security Headers | riskante Header/CSP-Konfiguration ohne Plan |
| B-06 | Rate Limiting | AI-/Auth-Endpunkte ungeschützt gegen Kosten-/Abuse-Spikes |
| B-07 | Least privilege | Client kann Service-Role-Rechte oder fremde Ownership erlangen |
| B-08 | Deny by default | unbekannte privilegierte Operation fällt auf „allow“ zurück |
| B-09 | Trust boundary identity | User-ID/Rollen werden aus untrusted Client-Feldern übernommen |

### Practical Security Habits

| # | Maßnahme | Fail if |
|---|---|---|
| P-01 | Dependency audit | offene High/Critical Findings vor Ship |
| P-02 | Fehlerbehandlung | Stacktrace, Prompt, Secret oder interne Pfade im Client |
| P-03 | Secure session handling | Session-Material unsicher gespeichert |
| P-04 | File safety | spätere Uploads ohne Type/Size/Path-Validation |
| P-05 | Rate limiting | kostenrelevante Endpunkte ohne Limits |

## QA Pipeline

```text
@pingpong-solution -> @implement -> @verify-ticket -> @verify-ui -> @review-ticket -> @ecc-check
```

- Design: `.qa/design/`
- Acceptance: `.qa/acceptance/`
- Projektkonfiguration: `.qa/project.yaml`
- Cross-cutting Edge Cases: `.qa/edge-cases.md`

## Living documentation

Nach materiellen Änderungen `@memory-live-doc` anwenden. Keine Features als verifiziert dokumentieren, bevor Tests/Runtime-Evidenz existieren. Speicherort ist `.project-memory/`; Human-Dokumente bleiben unter `docs/`.

## README

README, PRD, Architecture, Game Design, Simulation Model und AI Contract müssen bei Änderungen an ihren jeweiligen Verträgen synchron gehalten werden.
