import { useState } from 'react'
import { ExternalLink, KeyRound, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { translate, type Language } from '@/lib/i18n'
import {
  clearGithubToken,
  saveGithubSettings,
  workflowUrl,
  type GithubSettings,
} from '@/lib/github'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: GithubSettings
  onSettingsChange: (settings: GithubSettings) => void
  language: Language
}

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  language,
}: SettingsDialogProps) {
  const [repo, setRepo] = useState(settings.repo)
  const [token, setToken] = useState(settings.token)

  const url = workflowUrl({ ...settings, repo })
  const tokenUrl = 'https://github.com/settings/personal-access-tokens/new'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{translate('githubSettings', language)}</DialogTitle>
          <DialogDescription className="text-pretty">
            {translate('githubIntro', language)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="repo">{translate('repository', language)}</Label>
            <Input
              id="repo"
              value={repo}
              placeholder="username/gtu-schedule"
              onChange={(event) => setRepo(event.target.value.trim())}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="token">{translate('token', language)}</Label>
            <Input
              id="token"
              type="password"
              value={token}
              placeholder="github_pat_…"
              autoComplete="off"
              onChange={(event) => setToken(event.target.value.trim())}
            />
            <p className="text-xs text-muted-foreground text-pretty">
              {translate('tokenHelp', language)}
            </p>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="text-pretty">{translate('tokenStored', language)}.</p>
          </div>

          <div className="flex flex-wrap gap-3 text-xs">
            <a
              href={tokenUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <KeyRound className="size-3.5" />
              {translate('token', language)}
            </a>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="size-3.5" />
                {translate('runOnGithub', language)}
              </a>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => {
              setToken('')
              onSettingsChange(clearGithubToken())
            }}
          >
            {translate('clear', language)}
          </Button>
          <Button
            onClick={() => {
              onSettingsChange(saveGithubSettings({ repo, token }))
              onOpenChange(false)
            }}
          >
            {translate('save', language)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
