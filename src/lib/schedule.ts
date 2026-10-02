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
  /** Whether the lecturer's own timetable also lists this group for this slot. */
  confirmed: boolean | null
  /** Other groups attending the same class. */
  sharedWith: string[]
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

export interface CrossCheck {
  file: string
  slotsFound: number
  confirmed: number
  total: number
}

export interface Schedule {
  group: string
  program: string
  university: string
  universityEn: string
  scrapedAt: string
  source: ScheduleSource
  crossCheck: CrossCheck
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

export function lessonsByDay(schedule: Schedule): Lesson[][] {
  return schedule.days.map((day) =>
    schedule.lessons
      .filter((lesson) => lesson.day === day.index)
      .sort((a, b) => toMinutes(a.start) - toMinutes(b.start)),
  )
}

export function isHappeningNow(lesson: Lesson, now: TbilisiNow): boolean {
  if (lesson.day !== now.day) return false
  return now.minutes >= toMinutes(lesson.start) && now.minutes < endMinutes(lesson)
}

/** Days since the university last republished the timetable file. */
export function sourceAgeDays(schedule: Schedule): number | null {
  if (!schedule.source.lastModified) return null
  const published = Date.parse(schedule.source.lastModified)
  if (Number.isNaN(published)) return null
  return Math.floor((Date.now() - published) / 86_400_000)
}
