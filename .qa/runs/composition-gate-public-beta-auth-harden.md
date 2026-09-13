# Composition Gate — public-beta-auth-harden

- HEAD_SHA: WORKTREE
- Date: 2026-09-13
- Verdict: CLEAR

## Event
User registers/logs in; server issues access+refresh; web uses HttpOnly cookies; native uses secure storage; logout/revoke/delete remove authority.

## Hop chain
Auth UI → `/api/auth/*` (rate-limited) → Postgres users/sessions/tokens → Set-Cookie or native store → subsequent game/AI calls with validated session identity (B-09)

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N devices | Each refresh session independent; logout-all revokes all | refresh_sessions rows | pass |
| Invalid/expired token | Fail closed; no identity from client fields | auth middleware | pass |
| Concurrent refresh/logout | Rotated refresh unusable | token hash + revoked_at | pass |

## Flags
none

## Skip reason
n/a
