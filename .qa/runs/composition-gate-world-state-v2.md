# Composition Gate — world-state-v2

- HEAD_SHA: 3fe4b658311ec54d6eb754c0ae63da2b9b9c77b2
- Date: 2026-09-13
- Verdict: CLEAR

## Event
Scenario publishes versioned initialWorld; createRun/normalize embeds truth world; player/advisor/AI consume filtered projections only.

## Hop chain
Scenario `initialWorld` (published version) → `createRun` / `normalizeRunState` → `RunState.world` truth → `getPlayerWorldView` / `getAdvisorWorldView` → Company UI + AI `visibleContext` + advisor `get_visible_world`

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N actors | Player + advisor + AI each filter independently | Pure projections; truth unchanged | pass |
| Invalid / missing world on V1 | Empty modules; no invent from latest V2 when scenarioVersion is 1 | normalizeRunState + getScenarioAtVersion | pass |
| Two consumers / crash | No double mutation; hidden never in player view | Tests in world-state-v2.test.ts | pass |

## Flags
| Tag | Severity | Status |
|-----|----------|--------|
| (none) | — | — |

## Skip reason
n/a
