import { useCallback, useState } from 'react'
import { cn } from 'cn'
import { RefreshCw, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SettingsDialog } from '@/components/SettingsDialog'
import { translate, type Language } from '@/lib/i18n'
import {
  canDispatch,
  loadGithubSettings,
  runScraperWorkflow,
  workflowUrl,
  type GithubSettings,
} from '@/lib/github'

interface RefreshControlProps {
  language: Language
  onReload: () => Promise<{ changed: boolean }>
}

const stageLabels: Record<string, Record<Language, string>> = {
  dispatching: { ka: 'ეშვება…', en: 'Starting…' },
  queued: { ka: 'რიგშია…', en: 'Queued…' },
  running: { ka: 'იკითხება…', en: 'Scraping…' },
  deploying: { ka: 'ქვეყნდება…', en: 'Publishing…' },
}

export function RefreshControl({ language, onReload }: RefreshControlProps) {
  const [settings, setSettings] = useState<GithubSettings>(() => loadGithubSettings())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [stage, setStage] = useState<string | null>(null)

  const busy = stage !== null

  const handleClick = useCallback(async () => {
    const dispatchable = canDispatch(settings)
    setStage(dispatchable ? 'dispatching' : 'running')

    try {
      if (dispatchable) {
        await runScraperWorkflow(settings, setStage)
      }

      const { changed } = await onReload()

      if (changed) {
        toast.success(translate('updated', language))
      } else if (dispatchable) {
        toast.success(translate('upToDate', language))
      } else {
        const url = workflowUrl(settings)
        toast.info(translate('upToDate', language), {
          description: translate('githubIntro', language),
          action: url
            ? { label: translate('runOnGithub', language), onClick: () => window.open(url, '_blank') }
            : { label: translate('settings', language), onClick: () => setSettingsOpen(true) },
        })
      }
    } catch (cause) {
      toast.error(translate('refreshFailed', language), {
        description: cause instanceof Error ? cause.message : String(cause),
        action: { label: translate('settings', language), onClick: () => setSettingsOpen(true) },
      })
    } finally {
      setStage(null)
    }
  }, [language, onReload, settings])

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Button onClick={handleClick} disabled={busy} className="gap-2">
          <RefreshCw className={cn('size-4', busy && 'animate-spin')} />
          {busy
            ? (stageLabels[stage]?.[language] ?? translate('refreshing', language))
            : translate('refresh', language)}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={translate('settings', language)}
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2 className="size-4" />
        </Button>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSettingsChange={setSettings}
        language={language}
      />
    </>
  )
}
