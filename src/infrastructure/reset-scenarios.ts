/**
 * Reset all scenario progress (local + cloud) as if never started.
 * Location: src/infrastructure/reset-scenarios.ts
 */
import { deleteAllCloudRuns } from './cloud-game'
import { clearAllCloudDrafts } from './cloud-draft'
import { clearLocalRun } from './local-run'

function clearOpeningBriefKeys(): void {
  try {
    const prefixes = ['bt.quest-reveal:', 'bt.opening-streamed:']
    for (const store of [sessionStorage, localStorage]) {
      const keys: string[] = []
      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i)
        if (key && prefixes.some((prefix) => key.startsWith(prefix))) keys.push(key)
      }
      for (const key of keys) store.removeItem(key)
    }
  } catch {
    // ignore
  }
}

export async function resetAllScenarioProgress(options: {
  cloudConfigured: boolean
  signedIn: boolean
}): Promise<{ cloudDeleted: number }> {
  clearLocalRun()
  clearAllCloudDrafts()
  clearOpeningBriefKeys()
  if (!options.cloudConfigured || !options.signedIn) {
    return { cloudDeleted: 0 }
  }
  try {
    const { deleted } = await deleteAllCloudRuns()
    return { cloudDeleted: deleted }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'CLOUD_RESET_FAILED'
    throw new Error(
      message === 'HTTP_404' || message === 'HTTP_405'
        ? 'Lokaler Fortschritt gelöscht. Cloud-Reset braucht ein API-Update (DELETE /game/runs) — bitte deployen.'
        : message,
    )
  }
}
