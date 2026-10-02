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

  return (
    <header className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          {language === 'ka' ? schedule?.university : schedule?.universityEn}
        </p>

        <h1 className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-3xl font-bold tracking-tight sm:text-4xl">
            {translate('groupLabel', language)} {schedule?.group ?? '—'}
          </span>
        </h1>

        {schedule?.program && (
          <p className="mt-1.5 text-sm text-muted-foreground text-pretty">{schedule.program}</p>
        )}

        {source && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
            {source.academicYear && (
              <span className="rounded-md bg-secondary px-2 py-1 font-medium text-secondary-foreground">
                {source.academicYear}
              </span>
            )}
            {source.semester && (
              <span className="rounded-md bg-secondary px-2 py-1 font-medium text-secondary-foreground">
                {translate('semester', language)} {source.semester}
              </span>
            )}
            {source.week !== null && (
              <span className="rounded-md bg-secondary px-2 py-1 font-medium text-secondary-foreground">
                {translate('week', language)} {source.week}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          aria-label={translate('language', language)}
          onClick={onToggleLanguage}
        >
          <Languages className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={translate('theme', language)}
          onClick={onToggleTheme}
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={!schedule}
          onClick={onExport}
        >
          <CalendarPlus className="size-4" />
          <span className="hidden sm:inline">{translate('export', language)}</span>
        </Button>
        <RefreshControl language={language} onReload={onReload} />
      </div>
    </header>
  )
}
