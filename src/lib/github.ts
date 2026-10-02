const STORAGE_KEY = 'gtu-schedule.github'

export interface GithubSettings {
  repo: string
  token: string
  workflow: string
  ref: string
}

const defaults: GithubSettings = {
  repo: import.meta.env.VITE_GITHUB_REPO ?? '',
  token: '',
  workflow: 'update-schedule.yml',
  ref: import.meta.env.VITE_GITHUB_REF ?? 'main',
}

export function loadGithubSettings(): GithubSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return defaults
    return { ...defaults, ...(JSON.parse(stored) as Partial<GithubSettings>) }
  } catch {
    return defaults
  }
}

export function saveGithubSettings(settings: Partial<GithubSettings>): GithubSettings {
  const merged = { ...loadGithubSettings(), ...settings }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  return merged
}

export function clearGithubToken(): GithubSettings {
  return saveGithubSettings({ token: '' })
}

export function canDispatch(settings: GithubSettings): boolean {
  return Boolean(settings.repo && settings.token && /^[\w.-]+\/[\w.-]+$/.test(settings.repo))
}

export function workflowUrl(settings: GithubSettings): string | null {
  if (!settings.repo) return null
  return `https://github.com/${settings.repo}/actions/workflows/${settings.workflow}`
}

function headers(token: string): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

/** Ask GitHub Actions to run the scraper again, then wait for the run to finish. */
export async function runScraperWorkflow(
  settings: GithubSettings,
  onProgress?: (stage: 'dispatching' | 'queued' | 'running' | 'deploying') => void,
): Promise<void> {
  const base = `https://api.github.com/repos/${settings.repo}`
  const startedAt = Date.now()

  onProgress?.('dispatching')
  const dispatch = await fetch(`${base}/actions/workflows/${settings.workflow}/dispatches`, {
    method: 'POST',
    headers: { ...headers(settings.token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: settings.ref }),
  })

  if (!dispatch.ok) {
    const detail = await dispatch.text()
    throw new Error(
      dispatch.status === 404
        ? 'Workflow not found. Check the repository name and that update-schedule.yml exists on the default branch.'
        : `GitHub returned ${dispatch.status}: ${detail.slice(0, 200)}`,
    )
  }

  onProgress?.('queued')

  const deadline = startedAt + 6 * 60 * 1000
  let runId: number | null = null

  while (Date.now() < deadline) {
    await sleep(4000)

    if (runId === null) {
      const list = await fetch(
        `${base}/actions/workflows/${settings.workflow}/runs?event=workflow_dispatch&per_page=5`,
        { headers: headers(settings.token) },
      )
      if (!list.ok) continue
      const body = (await list.json()) as { workflow_runs?: Array<{ id: number; created_at: string }> }
      const fresh = body.workflow_runs?.find(
        (run) => Date.parse(run.created_at) >= startedAt - 60_000,
      )
      if (fresh) runId = fresh.id
      continue
    }

    const detail = await fetch(`${base}/actions/runs/${runId}`, { headers: headers(settings.token) })
    if (!detail.ok) continue
    const run = (await detail.json()) as { status: string; conclusion: string | null }

    if (run.status === 'completed') {
      if (run.conclusion && run.conclusion !== 'success') {
        throw new Error(`The workflow finished with status "${run.conclusion}".`)
      }
      onProgress?.('deploying')
      // GitHub Pages needs a moment to serve the freshly deployed files.
      await sleep(8000)
      return
    }

    onProgress?.(run.status === 'queued' ? 'queued' : 'running')
  }

  throw new Error('Timed out waiting for the workflow. It may still finish in the background.')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
