import { cn } from 'cn'
import { CalendarOff } from 'lucide-react'
import { LessonItem } from '@/components/LessonItem'
import { translate, type Language } from '@/lib/i18n'
import {
  endMinutes,
  lessonsByDay,
  toMinutes,
  type Lesson,
  type Schedule,
  type TbilisiNow,
} from '@/lib/schedule'

interface DayCardsProps {
  schedule: Schedule
  now: TbilisiNow
  language: Language
}

function lessonState(lesson: Lesson, now: TbilisiNow): 'current' | 'past' | 'idle' {
  if (lesson.day !== now.day) return 'idle'
  if (now.minutes >= endMinutes(lesson)) return 'past'
  if (now.minutes >= toMinutes(lesson.start)) return 'current'
  return 'idle'
}

export function DayCards({ schedule, now, language }: DayCardsProps) {
  const grouped = lessonsByDay(schedule)

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {schedule.days.map((day, index) => {
        const lessons = grouped[index]
        const isToday = day.index === now.day

        return (
          <section
            key={day.index}
            className={cn(
              'flex flex-col rounded-2xl border bg-card/60 p-4 backdrop-blur-sm',
              isToday && 'border-primary/40 bg-primary/5 ring-1 ring-primary/20',
            )}
          >
            <header className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide">
                {language === 'ka' ? day.ka : day.en}
                {isToday && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[0.65rem] font-semibold tracking-normal text-primary-foreground uppercase">
                    {translate('today', language)}
                  </span>
                )}
              </h2>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {lessons.length > 0 ? `${lessons.length}×` : ''}
              </span>
            </header>

            {lessons.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-8 text-muted-foreground">
                <CalendarOff className="size-5 opacity-60" />
                <p className="text-xs">{translate('freeDay', language)}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {lessons.map((lesson) => (
                  <LessonItem
                    key={lesson.id}
                    lesson={lesson}
                    language={language}
                    state={lessonState(lesson, now)}
                  />
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
