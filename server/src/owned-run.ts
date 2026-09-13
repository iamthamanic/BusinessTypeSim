/**
 * Shared ownership interpretation for game/AI run lookups (HTTP AuthZ contract).
 * Location: server/src/owned-run.ts
 */
import { assertSameOwner } from './authz.ts'

export type OwnedRunRow<TState> = {
  id?: string
  owner_id: string
  revision: number
  state: TState
}

/** Map SQL owner-scoped lookup (+ defense-in-depth owner check) to HTTP outcome. */
export function interpretOwnedRunLookup<TState>(
  rows: Array<OwnedRunRow<TState>>,
  requesterId: string,
):
  | { ok: true; row: OwnedRunRow<TState> }
  | { ok: false; status: 404; error: 'RUN_NOT_FOUND' } {
  const row = rows[0]
  if (!row || !assertSameOwner(row.owner_id, requesterId)) {
    return { ok: false, status: 404, error: 'RUN_NOT_FOUND' }
  }
  return { ok: true, row }
}
