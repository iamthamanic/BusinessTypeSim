/**
 * Ownership helpers for game/AI routes — fail closed on mismatch.
 * Location: server/src/authz.ts
 */

/** Deny-by-default ownership check (B-02 / B-08). */
export function assertSameOwner(resourceOwnerId: string, requesterId: string): boolean {
  return resourceOwnerId.length > 0 && requesterId.length > 0 && resourceOwnerId === requesterId
}
