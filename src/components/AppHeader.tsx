import { CalendarPlus, Languages, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RefreshControl } from '@/components/RefreshControl'
import { translate, type Language } from '@/lib/i18n'
import type { Theme } from '@/hooks/useTheme'
import type { Schedule } from '@/lib/schedule'

interface AppHeaderProps {
  schedule: Schedule | null
  language: Language
  onToggleLanguage: () => void
  theme: Theme
  onToggleTheme: () => void
  onExport: () => void
  onReload: () => Promise<{ changed: boolean }>
}

export function AppHeader({
  schedule,
  language,
  onToggleLanguage,
  theme,
  onToggleTheme,
  onExport,
  onReload,
}: AppHeaderProps) {
  const source = schedule?.source
  const week = [
    source?.academicYear,
    source?.semester && `${translate('semester', language)} ${source.semester}`,
    source?.week !== null && source?.week !== undefined && `${translate('week', language)} ${source.week}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight">
          {translate('groupLabel', language)} {schedule?.group ?? '—'}
        </h1>
        {schedule?.program && (
          <p className="mt-1 text-sm text-muted-foreground text-pretty">{schedule.program}</p>
        )}
        {week && <p className="mt-1 text-xs text-muted-foreground">{week}</p>}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={translate('language', language)}
          onClick={onToggleLanguage}
        >
          <Languages className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={translate('theme', language)}
          onClick={onToggleTheme}
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={translate('export', language)}
          disabled={!schedule}
          onClick={onExport}
        >
          <CalendarPlus className="size-4" />
        </Button>
        <RefreshControl language={language} onReload={onReload} />
      </div>
    </header>
  )
}
