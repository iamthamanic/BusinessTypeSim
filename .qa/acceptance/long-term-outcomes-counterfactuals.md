# Feature: Long-term Outcomes + Counterfactual Comparison

<!-- refined by @implement from issue #7 on 2026-09-13 -->

## Intent
Der Ergebnisbereich zeigt keinen „12 Monate später“-Blick mehr aus Sofortwirkungen. Stattdessen wird der State autoritativ bis zum 365-Tage-Horizont (oder früherem Run-Ende) fortgeschrieben. Vergleichsläufe aus demselben Pre-Decision Snapshot mit reproduzierbaren Seeds liefern Actual, Median/Expected und Outcome-Perzentil — getrennt von Decision Quality. Optionaler Counterfactual-Pfad mit alternativer Action.

## Preconditions
- Branch `feat/long-term-outcomes-counterfactuals` basiert auf main inkl. Economic Time (#4), World State V2 (#5), DQ V2 (#6)
- Pure Domain in `shared/domain/**`; kein LLM schreibt World State oder Outcome-Zahlen
- `advanceTime` / Economic Tick und seeded `drawBps` existieren; Geld bleibt Integer Cent
- Live-Run-Metrics/DQ werden durch Vergleichsläufe nicht mutiert

## Happy Path
- [ ] Immediate Effects sind als „Sofort“ beschriftet; „12 Monate später“ basiert auf Fortschreibung bis `horizonDays` (365) oder klarem früherem Run-Ende.
- [ ] Vergleichsläufe nutzen denselben Pre-Decision Snapshot, reproduzierbare Seeds und mutieren den Live-Run nicht (nur Artifact an `DecisionRecord`).
- [ ] UI (Ergebnis) zeigt Actual, Median/Expected, Actual-Perzentil sowie klare Trennung von Decision Quality bei 320/375/480 px (Summary-Rows + Detail).
- [ ] Optionaler Counterfactual-Pfad (alternative Action) wird als eigener Verlauf ausgewiesen, ohne DQ zu ändern.
- [ ] Replay bleibt an `scenarioVersion` gebunden; Vitest-Fixtures beweisen Determinismus.
- [ ] Touched files: zero type escape hatches (typed-strict / Boy Scout).

## Edge Cases
- [ ] Run endet vor 12 Monaten (`failed` / Cash) → Artifact markiert `endedEarly` + `endedAtDay`.
- [ ] Einzelne Vergleichsläufe fehlschlagen fail-closed (kein Live-Mutation; aus Median ausgeschlossen oder als worst-case gezählt, dokumentiert).
- [ ] Diskrete Verteilung bei wenigen Outcomes → Perzentil bleibt wohldefiniert (bps).
- [ ] Alte ScenarioVersion bleibt über `getScenarioAtVersion` replaybar.
- [ ] Fehlendes Artifact an Legacy-Decisions → Empty-State, kein Crash; DQ unverändert.

## Regression
- [ ] Domain self-check + DQ / Economic-Time / World-State Tests bleiben grün
- [ ] `commitDecision` Idempotenz und Constraint-Blocker unverändert
- [ ] Cloud/local commit ruft dieselbe Domain-API auf

## Security Coverage
| Item | Applicable? | How |
|------|-------------|-----|
| F-02 | Yes | UI rendert nur Domain-Artifact; keine Client-erfundenen Outcome-Zahlen |
| F-03 | n/a | Keine neuen Secrets / Tokens |
| F-05 | n/a | Keine Provider-Keys |
| B-03 | Yes | Cloud commit bleibt auth + revision-geschützt; Outcome ist Domain-Seiteneffekt des Commits |
| B-08 | Yes | Ungültige Inputs / Revision-Mismatch → deny (bestehend) |
| B-09 | Yes | Owner aus Session; keine Client-User-ID |
| Out of scope | Leaderboards, Campaign Authoring, Uploads, neue Rate-Limit-Endpunkte |

## Assumptions
- Horizont = 365 Sim-Tage ab Post-Commit-Tag (`advanceTime(..., 365)` auf Fork), sofern Run nicht früher endet.
- Ranking-Metrik für Perzentil = `cashCents` (Liquidität); UI zeigt zusätzlich Umsatz/EBITDA/Morale.
- Default-Batch = 11 Vergleichs-Seeds (ungerade für Median); konfigurierbar via Options.
- „Expected“ = Median der erfolgreichen Vergleichsläufe (diskret).
- Automatischer Counterfactual = erste Scenario-Action-Rule mit anderem `kind` als die committed Primary-Action (falls vorhanden).
- Vergleichs-Commits setzen `attachLongTermOutcome: false`, um Rekursion zu vermeiden.

## Screenshots
| Step | Filename |
|------|----------|
| 1 | `.qa/evidence/long-term-outcomes-counterfactuals/320-outcome.png` |
| 2 | `.qa/evidence/long-term-outcomes-counterfactuals/375-outcome.png` |
| 3 | `.qa/evidence/long-term-outcomes-counterfactuals/480-outcome.png` |

## Implementation Notes
_(filled after coding)_

## Composition Gate
See `.qa/runs/composition-gate-long-term-outcomes-counterfactuals.md`
