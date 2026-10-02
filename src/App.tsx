import { AlertTriangle, ExternalLink } from 'lucide-react'
import { AppHeader } from '@/components/AppHeader'
import { ScheduleList } from '@/components/ScheduleList'
import { SetAsideList } from '@/components/SetAsideList'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useLanguage } from '@/hooks/useLanguage'
import { useNow } from '@/hooks/useNow'
import { useSchedule } from '@/hooks/useSchedule'
import { useTheme } from '@/hooks/useTheme'
import { formatDate, translate } from '@/lib/i18n'
import { downloadIcs } from '@/lib/ics'
import { enrolledLessons, setAsideLessons, sourceAgeDays } from '@/lib/schedule'

export default function App() {
  const { schedule, status, error, reload } = useSchedule()
  const [language, toggleLanguage] = useLanguage()
  const [theme, toggleTheme] = useTheme()
  const now = useNow()

  const ageDays = schedule ? sourceAgeDays(schedule) : null
  const visible = schedule ? enrolledLessons(schedule) : []
  const setAside = schedule ? setAsideLessons(schedule) : []

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
        <AppHeader
          schedule={schedule}
          language={language}
          onToggleLanguage={toggleLanguage}
          theme={theme}
          onToggleTheme={toggleTheme}
          onExport={() => schedule && downloadIcs(schedule)}
          onReload={reload}
        />

        <main className="mt-6">
          {status === 'loading' && (
            <div className="space-y-2" aria-busy>
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-10 text-center">
              <AlertTriangle className="size-5 text-destructive" />
              <p className="text-sm font-medium">{translate('loadFailed', language)}</p>
              {error && <p className="font-mono text-xs text-muted-foreground">{error}</p>}
              <Button variant="outline" size="sm" onClick={() => reload()}>
                {translate('retry', language)}
              </Button>
            </div>
          )}

          {status === 'ready' && schedule && (
            <>
              {ageDays !== null && ageDays > 8 && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/8 p-3 text-sm">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <p className="text-pretty">{translate('staleWarning', language)}</p>
                </div>
              )}

              {visible.length === 0 ? (
                <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
                  {translate('emptyWeek', language)}
                </div>
              ) : (
                <ScheduleList
                  schedule={schedule}
                  lessons={visible}
                  now={now}
                  language={language}
                />
              )}

              <SetAsideList
                lessons={setAside}
                days={schedule.days}
                group={schedule.group}
                language={language}
              />

              <footer className="mt-6 space-y-1.5 text-xs text-muted-foreground">
                <p>
                  {schedule.crossCheck.confirmed}/{schedule.crossCheck.total}{' '}
                  {translate('verified', language)}
                  {schedule.courseList.configured &&
                    ` · ${translate('courseListNote', language, { count: schedule.courseList.enrolled })}`}
                </p>
                <p>
                  {translate('publishedOn', language)}:{' '}
                  {formatDate(schedule.source.lastModified, language)} ·{' '}
                  {translate('checkedOn', language)}: {formatDate(schedule.scrapedAt, language)}
                </p>
                <p>
                  <a
                    href={schedule.source.anchorUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
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
