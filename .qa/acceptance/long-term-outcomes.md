# Feature: Simuliere langfristige Outcomes und Vergleichsverläufe

## Intent
„12 Monate später“ basiert auf tatsächlich bis +365 Sim-Tage fortgeschriebenem State (oder früheres Run-Ende). Vergleichsläufe aus demselben Post-Commit Snapshot zeigen Actual vs Median/Expected und Perzentil — getrennt von Decision Quality.

## Happy Path
- [x] Immediate Effects sind als „sofort“ beschriftet; 12-Monats-Outcome nutzt Fortschreibung bis Horizont.
- [x] Vergleichsläufe: gleicher Snapshot, reproduzierbare Seeds, Live-Run unverändert.
- [x] UI: Actual, Median/Expected, Perzentil + DQ-Trennung bei 320/375/480 px.
- [x] Replay an ScenarioVersion gebunden; deterministische Tests.
- [x] Touched files: zero type escape hatches.

## Edge Cases
- [x] Run endet vor 12 Monaten (`endedEarly` / meta text).
- [x] Einzelne Vergleichsläufe fehlschlagen fail-closed ohne Live-Mutation.
- [x] Diskrete Verteilung bei wenigen Outcomes (percentileRank).

## Composition Gate
See `.qa/runs/composition-gate-long-term-outcomes.md` — CLEAR
