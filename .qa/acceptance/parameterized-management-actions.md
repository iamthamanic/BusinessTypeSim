# Feature: Parametrisiere freie ManagementActions und Review-UI

## Intent
Freie CEO-Entscheidungen bleiben Freitext-first, werden aber nicht länger nur auf grobe Action-Kinds reduziert. Das Modell interpretiert den Text in schema-validierte, typisierte Actions mit Parametern (Betrag, Ziel, Scope, Timing, Bedingungen, Fallback). Vor dem Commit sieht der Nutzer auf Mobile eine strukturierte, editierbare Interpretation („Wir haben dich so verstanden“).

## Preconditions
- Local demo run startbar ohne Cloud
- Domain Core bleibt autoritativ; LLM schreibt keinen World State
- Zod 4 Contracts für AI-Payloads

## Happy Path
- [ ] Mindestens `allocate_capital`, `renegotiate_customer`, `change_headcount_plan`, `set_pricing_policy`, `start_project` und `restructure_organization` besitzen validierte, versionierte Parameter-Schemas mit deterministischen Tests.
- [ ] Decision Interpretation liefert parameterisierte Actions; relevante Ambiguitäten werden explizit ausgewiesen und niemals still ergänzt.
- [ ] Mobile Review zeigt und korrigiert Parameter bei 320, 375 und 480 CSS px ohne horizontales Scrollen; Loading/Error/Offline/Focus/Disabled sind abgedeckt.
- [ ] Vor Commit kann der Nutzer die strukturierte Interpretation ändern; erst der bestätigte Payload wird autoritativ verarbeitet.
- [ ] Touched files: zero type escape hatches (typed-strict / Boy Scout).

## Edge Cases
- [ ] Mehrere Actions / Bedingungen / Obergrenzen / Fallbacks
- [ ] Unklare Beträge → Ambiguity, keine erfundenen Cents
- [ ] Parameter-Korrektur ohne Verlust des Freitexts
- [ ] Offline: lokaler Draft; kein Cloud-Commit

## Security Coverage
| Item | How |
|------|-----|
| F-02 | Zod schema validation on ActionProposal / params |
| B-08 | Deny unknown param keys via `.strict()` schemas |
| B-09 | Identity unchanged; no client-trusted user fields |
| Out of scope | Auth session harden (#12), Feasibility (#3) |

## Composition Gate
See `.qa/runs/composition-gate-parameterized-management-actions.md`

## Assumptions
- Engine effects still keyed by `kind` until feasibility ticket; params are stored/editable for interpretation fidelity.

## Screenshots
| Step | Filename |
|------|----------|
| 1 | `.qa/evidence/parameterized-management-actions/01-review-320.png` |
| 2 | `.qa/evidence/parameterized-management-actions/02-params-edited.png` |

## Implementation Notes
- `shared/domain/action-params.ts`: schemaVersion 1 + kind schemas; `normalizeActionParams` / `inferParamsFromText`
- `ProposalReviewCard`: expandable mobile rows, editable params before commit
- Unit tests: `tests/action-params.test.ts`
