const VERSION_URL = `${import.meta.env.BASE_URL}build.json`

// Reloading because of a build id we have already reloaded for would loop, so
// remember which one we acted on.
const GUARD_KEY = 'gtu-schedule:reloaded-for'

/**
 * Reload the page when a newer bundle has been deployed.
 *
 * GitHub Pages serves index.html with `max-age=600`, and a tab that is simply
 * left open never revalidates it at all. Re-fetching the schedule JSON is not
 * enough on its own: the old JavaScript keeps rendering, so a design or
 * filtering change looks like it never shipped.
 */
export async function reloadIfStale(): Promise<boolean> {
  try {
    const response = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' })
    if (!response.ok) return false

    const { id } = (await response.json()) as { id?: string }
    if (!id || id === __BUILD_ID__) return false
    if (sessionStorage.getItem(GUARD_KEY) === id) return false

    sessionStorage.setItem(GUARD_KEY, id)
    window.location.reload()
    return true
  } catch {
    // No build.json under the dev server, and nothing to do when offline.
    return false
  }
}
