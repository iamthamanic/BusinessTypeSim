# Composition Gate — glm-flash-routing
- HEAD_SHA: WORKTREE
- Verdict: CLEAR
## Event
AI request selects model via routing matrix then calls provider.
## Hop chain
route resolve → callChatModel attempt → optional repair/escalate → schema validate → domain unchanged
## Simulations
| Case | Result |
| N tasks Flash | pass |
| schema invalid repair then escalate | pass |
| admin authoring heavy | pass |
## Skip reason
n/a
