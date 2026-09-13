# Feature: Simuliere echte Wirtschaftszeit und Soft Deadlines

<!-- refined by @implement from issue #4 on 2026-09-13 -->

## Intent
Zeit soll eine echte Managementressource sein. `advanceTime()` schreibt wiederkehrende Economic-Tick-Effekte (Revenue/Cash, Payroll/Burn, Projektfortschritt, Vertragsdaten, Hiring-Verzögerungen) deterministisch fort. Soft Deadlines erzeugen bei Verpassen World-State-/Ledger-Konsequenzen statt künstlichem Game Over. Roadmap: Simulation V2 Epic (Stufe A) — nach World State V2 (#5) und Feasibility (#3).

## Preconditions
- Branch `feat/economic-time-soft-deadlines` basiert auf main inkl. #2/#3/#5/#12
- Pure Domain in `shared/domain/**`; Server-Advance ruft dieselbe `advanceTime`-API
- `RunState` hat `deadlineDay`, World State V2 Module (projects/contracts), Constraint Engine aktiv
- Geld bleibt Integer Cent; Advances sind revisionsgeschützt (kein Client-Ergebniswert)

## Happy Path
- [ ] `advanceTime(days)` wendet pro Simulations-Tag einen Economic Tick an: Cash aus Netto-Betrieb (`ebitda/365`), Payroll-Sichtbarkeit, Projekt-`progressBps`, Contract-Renewal an `renewalDay`, Hiring-Pipeline-Last bei offenen Hiring-Delayed-Events — deterministisch und seeded/replaybar.
- [ ] Soft Deadline: Überschreiten von `deadlineDay` ohne Decision erzeugt definierte Ledger-/World-Konsequenzen (Board Confidence, geplante Customer-/Offer-Events); Run bleibt `active`, solange kein echter Failure (`cashCents < 0`).
- [ ] Am selben Tag gilt stabile Reihenfolge: Economic Tick → Analysen (id) → Scheduled Events (id) → Soft-Deadline-Trigger; Retry/Revision verhindert Doppelbuchungen (stabile Ledger-/Event-IDs).
- [ ] Decision Room und Verlauf zeigen verbleibende Tage, Analysen die erst nach der Deadline fertig werden (Warnung), und Deadline-Folgen im Ledger bei 320/375/480 px inkl. Empty/Error/Offline/Disabled.
- [ ] Touched files: zero type escape hatches (typed-strict / Boy Scout).

## Edge Cases
- [ ] SIM-01: Gleicher Seed + gleiche Advances → identische Metrics/World/Ledger-IDs
- [ ] SIM-04: Delayed events und Economic Tick werden nicht doppelt angewandt
- [ ] SIM-05: Mehrere Fälligkeiten am selben Tag — dokumentierte stabile Sortierung
- [ ] SIM-06: Alle Geldbuchungen integer (trunc), kein Float
- [ ] Deadline und Scheduled Event fallen auf denselben Tag — Deadline-Trigger nach Event-Resolve; neue Deadline-Events erst an ihrem `dueDay`
- [ ] Advance über Deadline ohne Decision → Konsequenzen genau einmal
- [ ] Decision vor/at Deadline → keine Miss-Konsequenzen
- [ ] Cash-Failure bleibt einziger hartes Game-Over aus diesem Slice

## Regression
- [ ] Domain self-check + Integrity-/Constraint-/World-State-Tests bleiben grün
- [ ] Cloud/local Advance nutzt weiterhin Domain `advanceTime` (Revision Conflict unverändert)
- [ ] Decision/Team/Company-Navigation und Constraint-Review unverändert bedienbar

## Security Coverage
| Item | Applicable? | How |
|------|-------------|-----|
| F-02 | Yes | UI zeigt nur Domain-Ergebnisse; keine Client-seitigen Tick-Zahlen als Wahrheit |
| F-03 | n/a | Keine neuen Secrets |
| F-05 | n/a | Keine Provider-Keys |
| B-03 | Yes | Advance bleibt auth-geschützt (`requireAuth`); Client sendet nur `days` + revision |
| B-08 | Yes | Unbekannte Ops / Revision-Mismatch → deny (`REVISION_CONFLICT` / `INVALID_INPUT`) |
| B-09 | Yes | Owner aus Session; keine Client-User-ID |
| Out of scope | Auth harden (#12) bereits merged; keine neuen Upload-/Rate-Limit-Endpunkte |

## Assumptions
- Soft-Deadline gilt für die initiale Situation (`decisions.length === 0`); spätere Campaign-Situationen kommen in späteren Tickets.
- Netto-Cash-Tick = `trunc(ebitdaAnnualCents / 365)` (Payroll/Revenue als erklärende Komponenten im Tick-Result/Ledger).
- Hiring-Zeit: offene Delayed-Events aus Hiring-/Headcount-Decisions erzeugen bis zur Fälligkeit eine deterministische Kapazitätslast; Headcount-Sprünge bleiben Action-/Event-getrieben.
- `getNextPendingEventDay` berücksichtigt Deadline-Überschreitung und nächste Contract-Renewals, damit Vorspulen Economic+Deadline erreichen kann.

## Screenshots
| Step | Filename |
|------|----------|
| 1 | `.qa/evidence/economic-time-soft-deadlines/01-deadline-days-left.png` |
| 2 | `.qa/evidence/economic-time-soft-deadlines/02-analysis-after-deadline.png` |
| 3 | `.qa/evidence/economic-time-soft-deadlines/03-ledger-consequences.png` |

## Implementation Notes
<!-- filled after coding -->

## Composition Gate
- HEAD_SHA: pending
- Verdict: pending
- Proof: `.qa/runs/composition-gate-economic-time-soft-deadlines.md`
- Skip reason: n/a
