import { Info } from 'lucide-react'
import { translate, type Language } from '@/lib/i18n'
import { type DayMeta, type Lesson } from '@/lib/schedule'

interface SetAsideListProps {
  lessons: Lesson[]
  days: DayMeta[]
  group: string
  language: Language
}

/**
 * Classes the university files under this group that are not on the student's
 * own course list. Shown rather than dropped, so a genuine late addition to
 * the timetable is still visible.
 */
export function SetAsideList({ lessons, days, group, language }: SetAsideListProps) {
  if (lessons.length === 0) return null

  return (
    <section className="mt-6 rounded-lg border border-dashed">
      <h2 className="flex items-center gap-2 border-b border-dashed px-4 py-2 text-sm font-medium text-muted-foreground">
        <Info className="size-4 shrink-0" />
        {translate('setAsideTitle', language)}
      </h2>

      <p className="px-4 pt-3 text-xs text-pretty text-muted-foreground">
        {translate('setAsideIntro', language, { group })}
      </p>

      <ul className="px-4 pt-2 pb-3">
        {lessons.map((lesson) => {
          const day = days[lesson.day]
          const lecturer =
            language === 'en' && lesson.lecturerLatin ? lesson.lecturerLatin : lesson.lecturer
          const kind = language === 'en' && lesson.kindEn ? lesson.kindEn : lesson.kind

          return (
            <li key={lesson.id} className="flex gap-3 py-1.5 text-xs text-muted-foreground">
              <span className="w-28 shrink-0 font-mono tabular-nums">
                {language === 'ka' ? day.shortKa : day.shortEn} {lesson.start}–{lesson.end}
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-foreground/70">{lesson.subject}</span>
                {kind && ` · ${kind}`}
                <br />
                {[lesson.courseCode, lecturer, lesson.room].filter(Boolean).join(' · ')}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
