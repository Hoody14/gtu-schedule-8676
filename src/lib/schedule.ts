export interface Lesson {
  id: string
  day: number
  slot: number
  span: number
  start: string
  end: string
  subject: string
  courseCode: string
  kind: string
  kindKey: 'lecture' | 'practical' | 'lab' | 'seminar' | 'other'
  kindEn: string
  lecturer: string
  lecturerLatin: string
  room: string
  roomNote: string
  raw: string[]
}

export interface DayMeta {
  index: number
  ka: string
  shortKa: string
  en: string
  shortEn: string
}

export interface SlotMeta {
  index: number
  label: string
  start: string
  end: string
}

export interface ScheduleSource {
  url: string
  fileName: string
  lastModified: string
  sizeBytes: number
  tableId: string
  anchorUrl: string
  academicYear: string
  semester: string
  week: number | null
}

export interface Schedule {
  group: string
  program: string
  university: string
  universityEn: string
  scrapedAt: string
  source: ScheduleSource
  days: DayMeta[]
  slots: SlotMeta[]
  lessons: Lesson[]
  warnings: string[]
}

export const TIMEZONE = 'Asia/Tbilisi'

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/** End times wrap past midnight for late two-hour blocks; keep them monotonic. */
export function endMinutes(lesson: Pick<Lesson, 'start' | 'end'>): number {
  const start = toMinutes(lesson.start)
  const end = toMinutes(lesson.end)
  return end <= start ? end + 24 * 60 : end
}

export function formatMinutes(total: number): string {
  const minutes = ((total % (24 * 60)) + 24 * 60) % (24 * 60)
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export interface TbilisiNow {
  /** 0 = Monday ... 6 = Sunday */
  day: number
  minutes: number
  date: Date
}

const WEEKDAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function tbilisiNow(reference: Date = new Date()): TbilisiNow {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(reference)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '0'

  const day = WEEKDAY_ORDER.indexOf(get('weekday'))
  return {
    day: day === -1 ? 0 : day,
    minutes: Number(get('hour')) % 24 * 60 + Number(get('minute')),
    date: reference,
  }
}

export interface LessonStatus {
  current: Lesson | null
  next: Lesson | null
  /** Minutes until `next` starts, or until `current` ends. */
  minutesUntilNext: number
  minutesUntilCurrentEnds: number
}

export function lessonStatus(lessons: Lesson[], now: TbilisiNow): LessonStatus {
  const nowAbsolute = now.day * 24 * 60 + now.minutes
  const week = 7 * 24 * 60

  let current: Lesson | null = null
  let minutesUntilCurrentEnds = 0
  let next: Lesson | null = null
  let bestDelta = Number.POSITIVE_INFINITY

  for (const lesson of lessons) {
    const base = lesson.day * 24 * 60
    const start = base + toMinutes(lesson.start)
    const finish = base + endMinutes(lesson)

    if (nowAbsolute >= start && nowAbsolute < finish) {
      current = lesson
      minutesUntilCurrentEnds = finish - nowAbsolute
    }

    const delta = (start - nowAbsolute + week) % week
    if (delta > 0 && delta < bestDelta) {
      bestDelta = delta
      next = lesson
    }
  }

  return {
    current,
    next,
    minutesUntilNext: Number.isFinite(bestDelta) ? bestDelta : 0,
    minutesUntilCurrentEnds,
  }
}

export function lessonsByDay(schedule: Schedule): Lesson[][] {
  return schedule.days.map((day) =>
    schedule.lessons
      .filter((lesson) => lesson.day === day.index)
      .sort((a, b) => toMinutes(a.start) - toMinutes(b.start)),
  )
}

export interface ScheduleStats {
  lessonCount: number
  subjectCount: number
  weeklyHours: number
  busiestDay: number | null
}

export function scheduleStats(schedule: Schedule): ScheduleStats {
  const perDay = new Map<number, number>()
  let weeklyMinutes = 0

  for (const lesson of schedule.lessons) {
    const duration = endMinutes(lesson) - toMinutes(lesson.start)
    weeklyMinutes += duration
    perDay.set(lesson.day, (perDay.get(lesson.day) ?? 0) + duration)
  }

  let busiestDay: number | null = null
  let busiestMinutes = 0
  for (const [day, minutes] of perDay) {
    if (minutes > busiestMinutes) {
      busiestMinutes = minutes
      busiestDay = day
    }
  }

  return {
    lessonCount: schedule.lessons.length,
    subjectCount: new Set(schedule.lessons.map((lesson) => lesson.subject)).size,
    weeklyHours: Math.round((weeklyMinutes / 60) * 10) / 10,
    busiestDay,
  }
}

/** Stable per-subject hue so the same course keeps its colour everywhere. */
export function subjectHue(lesson: Lesson): number {
  const seed = lesson.courseCode || lesson.subject
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 360
  }
  return hash
}

export function lessonAccent(lesson: Lesson): string {
  return `oklch(0.62 0.17 ${subjectHue(lesson)})`
}

/** Days since the university last republished the timetable file. */
export function sourceAgeDays(schedule: Schedule): number | null {
  if (!schedule.source.lastModified) return null
  const published = Date.parse(schedule.source.lastModified)
  if (Number.isNaN(published)) return null
  return Math.floor((Date.now() - published) / 86_400_000)
}
