import { cn } from 'cn'
import { lessonAccent, toMinutes, type Lesson, type Schedule, type TbilisiNow } from '@/lib/schedule'
import { translate, type Language } from '@/lib/i18n'

interface WeekTableProps {
  schedule: Schedule
  now: TbilisiNow
  language: Language
}

export function WeekTable({ schedule, now, language }: WeekTableProps) {
  const used = schedule.lessons.flatMap((lesson) => [lesson.slot, lesson.slot + lesson.span - 1])
  const first = Math.min(...used)
  const last = Math.max(...used)
  const slots = schedule.slots.filter((slot) => slot.index >= first && slot.index <= last)

  const starting = new Map<string, Lesson>()
  const covered = new Set<string>()
  for (const lesson of schedule.lessons) {
    starting.set(`${lesson.day}:${lesson.slot}`, lesson)
    for (let offset = 1; offset < lesson.span; offset += 1) {
      covered.add(`${lesson.day}:${lesson.slot + offset}`)
    }
  }

  return (
    <div className="overflow-x-auto rounded-2xl border bg-card/60 backdrop-blur-sm">
      <table className="w-full min-w-[46rem] border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-20 bg-card/95 p-2 text-left text-xs font-medium text-muted-foreground backdrop-blur-sm">
              {translate('time', language)}
            </th>
            {schedule.days.map((day) => (
              <th
                key={day.index}
                className={cn(
                  'border-l p-2 text-xs font-semibold',
                  day.index === now.day && 'bg-primary/10 text-primary',
                )}
              >
                {language === 'ka' ? day.shortKa : day.shortEn}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => {
            const isNowSlot =
              now.minutes >= toMinutes(slot.start) && now.minutes < toMinutes(slot.start) + 60

            return (
              <tr key={slot.index} className="border-t">
                <th
                  scope="row"
                  className={cn(
                    'sticky left-0 z-10 bg-card/95 p-2 text-left align-top font-mono text-xs font-medium tabular-nums backdrop-blur-sm',
                    isNowSlot ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {slot.start}
                </th>

                {schedule.days.map((day) => {
                  const key = `${day.index}:${slot.index}`
                  if (covered.has(key)) return null

                  const lesson = starting.get(key)
                  const isTodayColumn = day.index === now.day

                  if (!lesson) {
                    return (
                      <td
                        key={key}
                        className={cn('border-l p-1 align-top', isTodayColumn && 'bg-primary/5')}
                      />
                    )
                  }

                  const active = isTodayColumn && isNowSlot

                  return (
                    <td
                      key={key}
                      rowSpan={lesson.span}
                      style={{ ['--accent' as string]: lessonAccent(lesson) }}
                      className={cn('border-l p-1 align-top', isTodayColumn && 'bg-primary/5')}
                    >
                      <div
                        className={cn(
                          'h-full rounded-lg border-l-3 border-(--accent) bg-(--accent)/8 p-2',
                          active && 'ring-2 ring-(--accent)/40',
                        )}
                      >
                        <p className="text-xs leading-snug font-semibold text-pretty">{lesson.subject}</p>
                        <p className="mt-1 text-[0.68rem] text-muted-foreground">
                          {language === 'en' && lesson.kindEn ? lesson.kindEn : lesson.kind}
                        </p>
                        <p className="mt-1.5 text-[0.68rem] font-medium">{lesson.room}</p>
                        <p className="text-[0.68rem] text-muted-foreground">
                          {language === 'en' && lesson.lecturerLatin
                            ? lesson.lecturerLatin
                            : lesson.lecturer}
                        </p>
                      </div>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
