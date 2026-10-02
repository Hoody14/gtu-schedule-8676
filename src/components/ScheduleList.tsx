import { cn } from 'cn'
import { AlertTriangle } from 'lucide-react'
import { translate, type Language } from '@/lib/i18n'
import { isHappeningNow, lessonsByDay, type Lesson, type Schedule, type TbilisiNow } from '@/lib/schedule'

interface ScheduleListProps {
  schedule: Schedule
  lessons: Lesson[]
  now: TbilisiNow
  language: Language
}

export function ScheduleList({ schedule, lessons: visible, now, language }: ScheduleListProps) {
  const grouped = lessonsByDay(schedule, visible)

  return (
    <div className="divide-y divide-border rounded-lg border">
      {schedule.days.map((day, index) => {
        const lessons = grouped[index]
        const isToday = day.index === now.day

        return (
          <section key={day.index}>
            <h2
              className={cn(
                'flex items-baseline gap-2 bg-muted/50 px-4 py-2 text-sm font-semibold',
                isToday && 'bg-primary/10 text-primary',
              )}
            >
              {language === 'ka' ? day.ka : day.en}
              {isToday && (
                <span className="text-[0.7rem] font-medium uppercase">
                  {translate('today', language)}
                </span>
              )}
            </h2>

            {lessons.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                {translate('freeDay', language)}
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {lessons.map((lesson) => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    language={language}
                    active={isHappeningNow(lesson, now)}
                  />
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}

function LessonRow({
  lesson,
  language,
  active,
}: {
  lesson: Lesson
  language: Language
  active: boolean
}) {
  const lecturer = language === 'en' && lesson.lecturerLatin ? lesson.lecturerLatin : lesson.lecturer
  const kind = language === 'en' && lesson.kindEn ? lesson.kindEn : lesson.kind

  return (
    <li className={cn('flex gap-4 px-4 py-3', active && 'bg-primary/5')}>
      <div className="w-16 shrink-0 font-mono text-sm tabular-nums">
        <div className="font-medium">{lesson.start}</div>
        <div className="text-muted-foreground">{lesson.end}</div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h3 className="text-sm font-medium text-pretty">{lesson.subject}</h3>
          {kind && <span className="text-xs text-muted-foreground">· {kind}</span>}
          {lesson.confirmed === false && (
            <span
              className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"
              title={translate('unconfirmedHint', language)}
            >
              <AlertTriangle className="size-3.5" />
              {translate('unconfirmed', language)}
            </span>
          )}
        </div>

        <p className="mt-0.5 text-xs text-muted-foreground">
          {[lesson.courseCode, lecturer, lesson.room + (lesson.roomNote ? ` (${lesson.roomNote})` : '')]
            .filter(Boolean)
            .join(' · ')}
        </p>

        {lesson.sharedWith.length > 0 && (
          <p className="mt-0.5 text-xs text-muted-foreground/80">
            {translate('sharedWith', language)}: {lesson.sharedWith.join(', ')}
          </p>
        )}
      </div>
    </li>
  )
}
