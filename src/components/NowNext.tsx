import { CalendarCheck, Clock, MapPin, PartyPopper, User } from 'lucide-react'
import { formatDuration, translate, type Language } from '@/lib/i18n'
import { lessonAccent, lessonStatus, type Schedule, type TbilisiNow } from '@/lib/schedule'

interface NowNextProps {
  schedule: Schedule
  now: TbilisiNow
  language: Language
}

export function NowNext({ schedule, now, language }: NowNextProps) {
  const { current, next, minutesUntilNext, minutesUntilCurrentEnds } = lessonStatus(
    schedule.lessons,
    now,
  )
  const lesson = current ?? next

  if (!lesson) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed p-5 text-muted-foreground">
        <PartyPopper className="size-5" />
        <p className="text-sm">{translate('emptyWeek', language)}</p>
      </div>
    )
  }

  const day = schedule.days[lesson.day]
  const isToday = lesson.day === now.day
  const isTomorrow = lesson.day === (now.day + 1) % 7
  const lecturer = language === 'en' && lesson.lecturerLatin ? lesson.lecturerLatin : lesson.lecturer

  const whenLabel = current
    ? translate('now', language)
    : isToday
      ? `${translate('today', language)} · ${translate('nextClass', language)}`
      : isTomorrow
        ? `${translate('tomorrow', language)} · ${translate('nextClass', language)}`
        : `${language === 'ka' ? day.ka : day.en} · ${translate('nextClass', language)}`

  return (
    <div
      style={{ ['--accent' as string]: lessonAccent(lesson) }}
      className="animate-fade-rise relative overflow-hidden rounded-2xl border bg-card p-5 sm:p-6"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 size-56 rounded-full bg-(--accent)/15 blur-3xl"
      />
      <div className="absolute inset-y-0 left-0 w-1.5 bg-(--accent)" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-(--accent) uppercase">
            {current ? (
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-(--accent) opacity-70" />
                <span className="relative inline-flex size-2 rounded-full bg-(--accent)" />
              </span>
            ) : (
              <CalendarCheck className="size-3.5" />
            )}
            {whenLabel}
          </p>

          <h2 className="mt-2 text-xl leading-tight font-bold text-balance sm:text-2xl">
            {lesson.subject}
          </h2>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-mono font-medium text-foreground tabular-nums">
              <Clock className="size-4 opacity-70" />
              {lesson.start}–{lesson.end}
            </span>
            {lesson.room && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4 opacity-70" />
                {lesson.room}
                {lesson.roomNote && ` (${lesson.roomNote})`}
              </span>
            )}
            {lecturer && (
              <span className="inline-flex items-center gap-1.5">
                <User className="size-4 opacity-70" />
                {lecturer}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 rounded-xl bg-(--accent)/10 px-4 py-3 text-center sm:min-w-36">
          <p className="font-mono text-2xl font-bold text-(--accent) tabular-nums">
            {formatDuration(current ? minutesUntilCurrentEnds : minutesUntilNext, language)}
          </p>
          <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
            {translate(current ? 'endsIn' : 'startsIn', language)}
          </p>
        </div>
      </div>
    </div>
  )
}
