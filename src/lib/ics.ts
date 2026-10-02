import { endMinutes, toMinutes, type Schedule } from './schedule'

// Georgia has not observed daylight saving time since 2005, so a fixed +04:00
// offset is enough to turn local timetable hours into UTC stamps.
const TBILISI_OFFSET_MINUTES = 4 * 60

function tbilisiToday(): { year: number; month: number; day: number; weekday: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tbilisi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(new Date())

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''

  const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    weekday: Math.max(0, order.indexOf(get('weekday'))),
  }
}

function stamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`
}

function escapeText(value: string): string {
  return value.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')
}

/** One calendar file covering the current Monday–Saturday week. */
export function buildIcs(schedule: Schedule): string {
  const today = tbilisiToday()
  const monday = Date.UTC(today.year, today.month - 1, today.day) - today.weekday * 86_400_000
  const now = stamp(new Date())

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//gtu-schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(`GTU ${schedule.group}`)}`,
  ]

  for (const lesson of schedule.lessons) {
    const dayStart = monday + lesson.day * 86_400_000
    const start = new Date(dayStart + (toMinutes(lesson.start) - TBILISI_OFFSET_MINUTES) * 60_000)
    const end = new Date(dayStart + (endMinutes(lesson) - TBILISI_OFFSET_MINUTES) * 60_000)
    const details = [lesson.kind, lesson.courseCode, lesson.lecturer].filter(Boolean).join(' · ')

    lines.push(
      'BEGIN:VEVENT',
      `UID:${lesson.id.replace(/[^\w-]/g, '')}-${schedule.group}@gtu-schedule`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${escapeText(lesson.subject)}`,
      `DESCRIPTION:${escapeText(details)}`,
      `LOCATION:${escapeText(lesson.room)}`,
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadIcs(schedule: Schedule): void {
  const blob = new Blob([buildIcs(schedule)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `gtu-${schedule.group}-week.ics`
  link.click()
  URL.revokeObjectURL(url)
}
