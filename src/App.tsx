import { useState } from 'react'
import { cn } from 'cn'
import { AlertTriangle, ExternalLink, LayoutGrid, Table2 } from 'lucide-react'
import { AppHeader } from '@/components/AppHeader'
import { DayCards } from '@/components/DayCards'
import { NowNext } from '@/components/NowNext'
import { WeekTable } from '@/components/WeekTable'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useLanguage } from '@/hooks/useLanguage'
import { useNow } from '@/hooks/useNow'
import { useSchedule } from '@/hooks/useSchedule'
import { useTheme } from '@/hooks/useTheme'
import { formatDate, translate } from '@/lib/i18n'
import { downloadIcs } from '@/lib/ics'
import { scheduleStats, sourceAgeDays } from '@/lib/schedule'

type View = 'cards' | 'table'

export default function App() {
  const { schedule, status, error, reload } = useSchedule()
  const [language, toggleLanguage] = useLanguage()
  const [theme, toggleTheme] = useTheme()
  const [view, setView] = useState<View>('cards')
  const now = useNow()

  const stats = schedule ? scheduleStats(schedule) : null
  const ageDays = schedule ? sourceAgeDays(schedule) : null

  return (
    <div className="min-h-dvh bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-gradient-to-b from-primary/8 to-transparent"
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <AppHeader
          schedule={schedule}
          language={language}
          onToggleLanguage={toggleLanguage}
          theme={theme}
          onToggleTheme={toggleTheme}
          onExport={() => schedule && downloadIcs(schedule)}
          onReload={reload}
        />

        <main className="mt-8 space-y-6">
          {status === 'loading' && (
            <div className="space-y-6" aria-busy>
              <Skeleton className="h-32 w-full rounded-2xl" />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-56 rounded-2xl" />
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {translate('loading', language)}
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-10 text-center">
              <AlertTriangle className="size-6 text-destructive" />
              <p className="font-medium">{translate('loadFailed', language)}</p>
              {error && <p className="font-mono text-xs text-muted-foreground">{error}</p>}
              <Button variant="outline" size="sm" onClick={() => reload()}>
                {translate('retry', language)}
              </Button>
            </div>
          )}

          {status === 'ready' && schedule && stats && (
            <>
              <NowNext schedule={schedule} now={now} language={language} />

              {ageDays !== null && ageDays > 8 && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/8 p-3.5 text-sm">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <p className="text-pretty">{translate('staleWarning', language)}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard value={stats.lessonCount} label={translate('lessons', language)} />
                <StatCard value={stats.subjectCount} label={translate('subjects', language)} />
                <StatCard value={stats.weeklyHours} label={translate('hours', language)} />
                <StatCard
                  value={
                    stats.busiestDay === null
                      ? '—'
                      : language === 'ka'
                        ? schedule.days[stats.busiestDay].shortKa
                        : schedule.days[stats.busiestDay].shortEn
                  }
                  label={translate('busiest', language)}
                />
              </div>

              <div className="flex items-center justify-end">
                <div className="inline-flex rounded-lg border bg-card p-0.5">
                  <ViewButton
                    active={view === 'cards'}
                    onClick={() => setView('cards')}
                    icon={<LayoutGrid className="size-3.5" />}
                    label={translate('cards', language)}
                  />
                  <ViewButton
                    active={view === 'table'}
                    onClick={() => setView('table')}
                    icon={<Table2 className="size-3.5" />}
                    label={translate('table', language)}
                  />
                </div>
              </div>

              {schedule.lessons.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
                  {translate('emptyWeek', language)}
                </div>
              ) : view === 'cards' ? (
                <DayCards schedule={schedule} now={now} language={language} />
              ) : (
                <WeekTable schedule={schedule} now={now} language={language} />
              )}

              <footer className="mt-10 space-y-2 border-t pt-6 text-xs text-muted-foreground">
                <p>
                  {translate('publishedOn', language)}:{' '}
                  <span className="font-medium text-foreground/80">
                    {formatDate(schedule.source.lastModified, language)}
                  </span>{' '}
                  · {translate('checkedOn', language)}:{' '}
                  <span className="font-medium text-foreground/80">
                    {formatDate(schedule.scrapedAt, language)}
                  </span>
                </p>
                <p className="flex flex-wrap items-center gap-1.5">
                  {translate('source', language)}:
                  <a
                    href={schedule.source.anchorUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {schedule.source.fileName}
                    <ExternalLink className="size-3" />
                  </a>
                </p>
                {schedule.warnings.map((warning) => (
                  <p key={warning} className="text-amber-600 dark:text-amber-400">
                    {warning}
                  </p>
                ))}
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-xl border bg-card/60 px-4 py-3 backdrop-blur-sm">
      <p className="font-mono text-xl font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[0.7rem] leading-tight text-muted-foreground">{label}</p>
    </div>
  )
}

function ViewButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
        active ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  )
}
