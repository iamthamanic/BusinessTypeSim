# Business Type

Business Type ist eine mobile CEO-Entscheidungssimulation. Spieler führen unterschiedliche Unternehmen durch realistische Situationen, beschaffen Informationen, sprechen mit virtuellen Führungskräften, formulieren freie Entscheidungen und erleben deterministische sowie probabilistische Konsequenzen über die Zeit.

Der Kern ist **Decision Quality statt Quizlogik**: Die Qualität einer Entscheidung wird getrennt vom späteren Ergebnis bewertet.

## MVP-Status

Der erste vollständige MVP-Core-Loop ist implementiert:

- sieben spielbare Unternehmensfälle: SaaS, Produktion, Services, Klinik, Marketplace, Energie, Retail;
- Mobile-first Decision Room mit Company View, Advisors und Timeline;
- Analysen werden angefordert als **Pending** (Dauer sichtbar); Ergebnisse erscheinen erst nach Fortschreiben der Zeit und nicht vorher in der Player-UI;
- freie Texteingabe wird in validierte ManagementActions strukturiert;
- Decision Quality mit sechs Dimensionen, getrennt vom Outcome;
- seeded probabilistische Folgen und verzögerte Events;
- lokaler Demo-Run mit Persistenz im Gerät;
- optionaler Cloud-Run über self-hosted Postgres + Hono API (Hostinger Docker);
- Cloud offline: Entscheidungs-Entwurf lokal speichern, Commit erst online;
- Commit-Idempotenz (`idempotencyKey`) inkl. Reconcile bei Revision-Konflikt;
- rollenbezogene read-only Advisor-Tools (Domain), LLM nur mit freigeschaltetem Kontext;
- Ollama-Cloud-Adapter (`OLLAMA_API_KEY` + OpenAI-kompatibles `https://ollama.com/v1`) mit lokalem Fallback;
- read-only Real-World-Debrief über Tavily Search + LLM-Zusammenfassung;
- Capacitor-Konfiguration für Android und iOS;
- Vitest-Determinismus/AuthZ-Gates und Playwright-Smoke/`test:e2e` im Repo.

Produkt- und Engineering-Verträge:

- PRD: [`docs/PRD.md`](docs/PRD.md)
- Game Design: [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md)
- Simulation: [`docs/SIMULATION_MODEL.md`](docs/SIMULATION_MODEL.md)
- AI Contract: [`docs/AI_CONTRACT.md`](docs/AI_CONTRACT.md)
- Architektur: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- UI Styleguide: [`docs/UI_STYLEGUIDE.md`](docs/UI_STYLEGUIDE.md)
- Agent-Regeln: [`AGENTS.md`](AGENTS.md)

## Stack

- React 19 + TypeScript + Vite
- Capacitor 8 für Android und iOS
- Self-hosted Postgres + Hono API (Docker auf Hostinger KVM2)
- Zod für Runtime-Contracts
- Ollama Cloud als Standard-LLM hinter OpenAI-kompatiblem Serveradapter
- Tavily als austauschbarer Search-Provider für den Real-World-Debrief
- Pure TypeScript Simulation Core

## Architektur

```text
React / Capacitor UI
        |
        +------ local demo ------> pure Simulation Core
        |
        +------ cloud -----------> Hono API (Docker)
                                      |       |       |
                                      |       |       +--> Tavily Search
                                      |       +----------> Ollama Cloud
                                      +------------------> Postgres
                                              |
                                      pure Simulation Core
```

Das LLM darf Spielzustand niemals direkt verändern. Cloud-Mutationen laufen über authentifizierte API-Routen, validierte Action-Schemas, optimistische Run-Revisionskontrolle und den autoritativen Simulation Core.

## Lokale Entwicklung

Voraussetzungen: Node.js 22+, npm und für Native Builds Android Studio bzw. Xcode auf macOS.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Checks:

```bash
npm run checks
npm run test:e2e   # Playwright (startet Vite bei Bedarf)
```

Deterministischer Domain-Self-Check ohne installierte App-Dependencies:

```bash
npm run test:domain:self
```

Native Projekte initialisieren, sobald Dependencies installiert sind:

```bash
npm run native:setup
```

Danach stehen `npm run cap:android` und `npm run cap:ios` zur Verfügung.

## Cloud (Hostinger)

### Hostinger self-host (primär)

Siehe [`docs/DEPLOY_VPS.md`](docs/DEPLOY_VPS.md) und Produktionsbetrieb [`docs/KVM2_OPS.md`](docs/KVM2_OPS.md):

```bash
cd deploy
cp .env.example .env   # POSTGRES_PASSWORD, JWT_SECRET, OLLAMA_API_KEY
./bootstrap-vps.sh     # compose up + auth SQL + smoke-verify
```

Client-Build braucht `VITE_API_URL=/api` (Compose setzt das). Auth ist E-Mail + Passwort gegen die eigene API.

Service-/Secret-Keys dürfen nie in `VITE_*` oder den Client gelangen.

## Projektstruktur

```text
src/
  app/              App-Shell und Run-Orchestrierung
  features/         vertikale Nutzerflows
  domain/           Public Re-Exports des puren Simulation Core
  ai/               Runtime-Schemas und lokaler AI-Fallback
  infrastructure/   Cloud-API-Client, lokaler Run, AI und Debrief
  shared/           UI-Primitives
shared/domain/      Pure Simulation Engine + Szenarien
server/             Hono API (Auth, Game, AI, Debrief)
deploy/             Docker Compose: web + api + postgres
docs/               Produkt-, Architektur- und Design-Dokumentation
.qa/                Design-, Acceptance- und Gate-Konfiguration
```

## Aktuelle Umgebungsgrenze

Native Android/iOS-Ordner entstehen über `npm run native:setup`. Hostinger-Deploy: `deploy/docker-compose.yml` (web + api + postgres).

## Lizenz

Noch nicht festgelegt. Die Sichtbarkeit des GitHub-Repositories ersetzt keine Lizenzentscheidung.

## Recent changes

- **2026-09-13** — Nexora 36-month SaaS campaign pack (≥35 families, state-driven paths) (Closes #10)
- **2026-09-13** — Nordkern Foods 36-month campaign pack (≥35 families, state-driven paths) (Closes #9)
- **2026-09-13** — Campaign runtime: situation eligibility/priority/cooldown/exclusion, player-safe Campaign panel (Closes #8)
- **2026-09-13** — GLM-5.3-Flash default + repair/escalation routing (Closes #11)
- **2026-09-13** — Long-term outcomes + seeded comparison batch; Sofortwirkung vs 12-Monats-Horizont getrennt von DQ (Closes #7)
- **2026-09-13** — Semantic Decision Quality: structured evidence, DecisionContextSnapshot, deterministic rubrics (Closes #6)
- **2026-09-13** — KVM2 production ops: Compose limits/health/logs, Postgres backup/restore, smoke-verify, ops runbook (`feat/kvm2-production-ops`)
- **2026-09-13** — PRD-MVP Integrity: Pending-Analysen, Hidden Info Read-Model, Advisor-Tools, Commit-Idempotenz, Cloud-Offline-Draft, Vitest + Playwright (`feat/prd-mvp-integrity-gaps`)
- **2026-09-13** — GitHub Actions Deploy-Pipeline für Hostinger (`docs/GITHUB_SECRETS.md`)
- **2026-09-12** — Domain nach `shared/domain/` verschoben; `supabase/`-Ordner entfernt
- **2026-09-12** — Hostinger thin stack: Postgres + Hono API + nginx; E-Mail/Passwort-Auth
- **2026-09-12** — Ollama Cloud LLM, sieben Szenarien, Capacitor-Setup
- **2026-09-12** — Spielbarer MVP-Core-Loop mit Decision Quality und seeded Simulation
