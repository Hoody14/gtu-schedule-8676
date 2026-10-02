import { cn } from 'cn'
import { MapPin, User } from 'lucide-react'
import { lessonAccent, type Lesson } from '@/lib/schedule'
import { translate, type Language } from '@/lib/i18n'

const kindStyles: Record<Lesson['kindKey'], string> = {
  lecture: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  practical: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  lab: 'border-amber-500/35 bg-amber-500/12 text-amber-700 dark:text-amber-300',
  seminar: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  other: 'border-border bg-muted text-muted-foreground',
}

interface LessonItemProps {
  lesson: Lesson
  language: Language
  state?: 'current' | 'next' | 'past' | 'idle'
}

export function LessonItem({ lesson, language, state = 'idle' }: LessonItemProps) {
  const lecturer = language === 'en' && lesson.lecturerLatin ? lesson.lecturerLatin : lesson.lecturer

  return (
    <article
      style={{ ['--accent' as string]: lessonAccent(lesson) }}
      className={cn(
        'relative overflow-hidden rounded-xl border bg-card p-3.5 pl-4 transition-colors',
        'before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-(--accent)',
        state === 'current' && 'border-(--accent) ring-2 ring-(--accent)/25',
        state === 'past' && 'opacity-55',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[0.95rem] leading-snug font-semibold text-balance">{lesson.subject}</h3>
          <p className="mt-1 font-mono text-[0.7rem] tracking-tight text-muted-foreground">
            {lesson.courseCode}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-sm font-semibold tabular-nums">{lesson.start}</p>
          <p className="font-mono text-xs text-muted-foreground tabular-nums">{lesson.end}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-[0.7rem] font-medium',
            kindStyles[lesson.kindKey],
          )}
        >
          {language === 'en' && lesson.kindEn ? lesson.kindEn : lesson.kind || '—'}
        </span>
        {lecturer && (
          <span className="inline-flex items-center gap-1" title={translate('lecturer', language)}>
            <User className="size-3.5 opacity-70" />
            {lecturer}
          </span>
        )}
        {lesson.room && (
          <span className="inline-flex items-center gap-1 font-medium text-foreground/80" title={translate('room', language)}>
            <MapPin className="size-3.5 opacity-70" />
            {lesson.room}
            {lesson.roomNote && <span className="text-muted-foreground">({lesson.roomNote})</span>}
          </span>
        )}
      </div>
    </article>
  )
}
