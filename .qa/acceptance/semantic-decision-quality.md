# Feature: Ersetze Keyword-DQ durch semantische Decision-Quality-Bewertung

## Intent
Decision Quality bleibt vom Outcome getrennt, soll aber nicht mehr primär über einzelne Schlüsselwörter bewertet werden. Das Modell extrahiert strukturierte Hinweise zu Framing, Informationen, Alternativen, Zielen, Annahmen, Risiken und Execution; die eigentliche Bewertung bleibt deterministisch und scenario-spezifisch kalibrierbar.

## Happy Path
- [x] `DecisionContextSnapshot` speichert Knowledge, Analysen, Deadline/Constraints, finale Actions und semantische Evidence beim Commit.
- [x] Die sechs DQ-Subscores basieren auf deterministischen Rubrics statt einzelnen Keyword-Counts; Gesamt bleibt geometrisches Mittel.
- [x] Tests zeigen, dass reine Begriffsnennung keinen hohen Score erzeugt und alternative rationale Strategien bewertet werden können.
- [x] Mobile Review zeigt Evidence je Dimension bei 320/375/480 px und hält Outcome klar getrennt.
- [x] Touched files: zero type escape hatches (typed-strict / Boy Scout).

## Edge Cases
- [x] Sehr kurze Entscheidung ohne Begründung bleibt niedrige DQ.
- [x] Keyword-Stuffing ohne Struktur erhält Penalty.
- [x] Später freigeschaltete Analysen ändern den gespeicherten Snapshot/Score nicht.

## Regression
- [x] Determinism / commit idempotency / economic soft deadline self-check remain green.

## Assumptions
- Semantic extraction for MVP is deterministic (schema-validated); LLM may later fill the same evidence schema but never writes the final 0–100 score.

## Screenshots
| Step | Filename |
|------|----------|
| 1 | `320-dq-evidence.png` |
| 2 | `375-dq-evidence.png` |
| 3 | `480-dq-evidence.png` |

## Implementation Notes
- `shared/domain/decision-quality.ts` — evidence extraction, rubrics, Zod schemas
- `commitDecision` persists `contextSnapshot` + `quality.evidence`
- `LedgerView` DecisionQualityCard shows per-dimension evidence + outcome separation note
- `Card` forwards `data-testid` for verify-ui selectors

## Composition Gate
See `.qa/runs/composition-gate-semantic-decision-quality.md` — CLEAR
