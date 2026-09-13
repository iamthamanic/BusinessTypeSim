# Feature: Baue eine autoritative Feasibility- und Constraint-Engine

<!-- refined by @implement from issue #3 on 2026-09-13 -->

## Intent
Die Simulation soll freie Entscheidungen nicht blind addieren, sondern vor dem Commit prüfen, ob Budget, Kapazität, Ressourcen, Verträge, Personal und laufende Projekte die vorgeschlagenen Actions überhaupt zulassen. Constraints liefern blockierende Fehler oder klar benannte Trade-off-Warnungen; das LLM darf sie erklären, aber nicht umgehen.

## Happy Path
- [x] Server- und Domain-Layer evaluieren deterministische Preconditions für Budget, Capacity/Team, Entity-Existenz und Konflikte vor jeder State-Mutation (`evaluateConstraints` → `commitDecision` fail-closed; game route maps `CONSTRAINT_VIOLATION`).
- [x] Kombinierte Actions werden als Paket geprüft; Cross-Action-Konflikte sind testbar und verhindern Partial Commits (`PACKAGE_INSUFFICIENT_*`, `ACTION_CONFLICT`; unit fixtures).
- [x] Mobile Review unterscheidet Blocker und Warnungen semantisch bei 320/375/480 px inklusive Loading/Error/Focus/Disabled (`ProposalReviewCard` + e2e).
- [x] Manipulierte Client-Payloads können serverseitige Constraints nicht umgehen; Commit bleibt atomar (domain throw before mutation; server re-validates via same `commitDecision`).
- [x] Touched files: zero type escape hatches (typed-strict / Boy Scout).

## Edge Cases
- [x] SIM-03: Actions einzeln ok, gemeinsam nicht (Paket-Cash / accept+reject).
- [x] Freies Cash nach gebundenen Projektbudgets reicht nicht (explizites `amountCents` → `INSUFFICIENT_FREE_CASH`).
- [x] Ressource/Projekt bereits aktiv gebunden (`PROJECT_ALREADY_ACTIVE`, `RESOURCE_BOUND` warning).
- [x] Warnung erlaubt Commit; Blocker nicht (`CAPACITY_TIGHT` vs `INSUFFICIENT_CASH`).
- [x] Headcount-Floor (`HEADCOUNT_FLOOR`) und Kapazitäts-Exhaustion (`CAPACITY_EXHAUSTED`).

## Regression
- [ ] Feed and topic routes still load *(n/a for this product — Decision/Home/Company nav covered by existing e2e suite)*
- [x] Domain self-check + unit gates remain green after constraint wiring.

## Assumptions
- Explicit `params.amountCents` is authoritative for cash demand; otherwise scenario rule immediate cash drain is used.
- Remaining active project budgets reserve free cash; rule-only (non-explicit) drains warn on free-cash pressure instead of hard-blocking typical scenario defaults.
- Entity checks apply when World modules are populated for the scenario; empty-module industries skip unknown-entity blockers for missing catalogs.

## Screenshots
| Step | Filename |
|------|----------|
| 1 | `01-happy-path.png` |
| 2 | `02-warnings-allowed.png` |

## Implementation Notes
- Domain: `shared/domain/constraints.ts` — `evaluateConstraints`, `ConstraintViolationError`, codes + German `message`.
- Engine: `commitDecision` evaluates before any metric/ledger mutation.
- Server: `server/src/routes/game.ts` returns `CONSTRAINT_VIOLATION` + blockers/warnings on 400.
- UI: `ProposalReviewCard` lists Blocker vs Warnung; commit disabled on blockers only.
- Tests: `tests/constraints.test.ts`, `e2e/feasibility-constraint-engine.spec.ts`.
