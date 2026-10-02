export type Language = 'ka' | 'en'

const dictionary = {
  groupLabel: { ka: 'ჯგუფი', en: 'Group' },
  semester: { ka: 'სემესტრი', en: 'Semester' },
  week: { ka: 'კვირა', en: 'Week' },
  today: { ka: 'დღეს', en: 'Today' },
  tomorrow: { ka: 'ხვალ', en: 'Tomorrow' },
  now: { ka: 'ახლა მიმდინარეობს', en: 'In progress now' },
  nextClass: { ka: 'შემდეგი ლექცია', en: 'Next class' },
  noMoreClasses: { ka: 'ამ კვირაში ლექციები აღარ გაქვს', en: 'No classes left this week' },
  freeDay: { ka: 'თავისუფალი დღე', en: 'Free day' },
  endsIn: { ka: 'დასრულებამდე', en: 'until it ends' },
  startsIn: { ka: 'დაწყებამდე', en: 'until it starts' },
  cards: { ka: 'ბარათები', en: 'Cards' },
  table: { ka: 'ცხრილი', en: 'Table' },
  refresh: { ka: 'განახლება', en: 'Refresh' },
  refreshing: { ka: 'ახლდება…', en: 'Refreshing…' },
  rebuild: { ka: 'ხელახლა წაკითხვა', en: 'Re-scrape' },
  settings: { ka: 'პარამეტრები', en: 'Settings' },
  export: { ka: 'კალენდარში დამატება', en: 'Add to calendar' },
  source: { ka: 'წყარო', en: 'Source' },
  openSource: { ka: 'ორიგინალი ცხრილი', en: 'Original timetable' },
  updated: { ka: 'ცხრილი განახლდა', en: 'Schedule updated' },
  upToDate: { ka: 'ცხრილი უკვე განახლებულია', en: 'Already up to date' },
  reloadedOnly: {
    ka: 'წაკითხულია ბოლო გამოქვეყნებული ვერსია. უნივერსიტეტის გვერდის ხელახლა წასაკითხად საჭიროა GitHub Actions-ის გაშვება.',
    en: 'Read the latest published data. Reading the university page again needs a GitHub Actions run.',
  },
  refreshFailed: { ka: 'განახლება ვერ მოხერხდა', en: 'Refresh failed' },
  publishedOn: { ka: 'უნივერსიტეტმა გამოაქვეყნა', en: 'Published by the university' },
  checkedOn: { ka: 'ბოლოს შემოწმდა', en: 'Last checked' },
  staleWarning: {
    ka: 'უნივერსიტეტის ფაილი ერთ კვირაზე მეტია არ განახლებულა.',
    en: 'The university has not republished this file for over a week.',
  },
  loading: { ka: 'ცხრილი იტვირთება…', en: 'Loading the schedule…' },
  loadFailed: { ka: 'ცხრილის ჩატვირთვა ვერ მოხერხდა', en: 'Could not load the schedule' },
  retry: { ka: 'ხელახლა ცდა', en: 'Try again' },
  emptyWeek: { ka: 'ამ კვირისთვის ლექციები არ არის დაგეგმილი', en: 'No classes are scheduled this week' },
  lessons: { ka: 'ლექცია', en: 'classes' },
  subjects: { ka: 'საგანი', en: 'subjects' },
  hours: { ka: 'საათი კვირაში', en: 'hours a week' },
  busiest: { ka: 'ყველაზე დატვირთული', en: 'Busiest day' },
  room: { ka: 'აუდიტორია', en: 'Room' },
  lecturer: { ka: 'ლექტორი', en: 'Lecturer' },
  githubSettings: { ka: 'GitHub-ის პარამეტრები', en: 'GitHub settings' },
  githubIntro: {
    ka: 'ღილაკი „ხელახლა წაკითხვა" უშვებს GitHub Actions-ს, რომელიც თავიდან კითხულობს უნივერსიტეტის გვერდს. ამისთვის საჭიროა ტოკენი, რომელიც მხოლოდ ამ ბრაუზერში ინახება.',
    en: 'The re-scrape button runs the GitHub Action that reads the university page again. It needs a token, which is stored only in this browser.',
  },
  repository: { ka: 'რეპოზიტორია', en: 'Repository' },
  token: { ka: 'ტოკენი', en: 'Token' },
  tokenHelp: {
    ka: 'Fine-grained ტოკენი, რომელსაც აქვს Actions: Read and write უფლება ამ რეპოზიტორიაზე.',
    en: 'A fine-grained token with Actions: Read and write permission on this repository.',
  },
  save: { ka: 'შენახვა', en: 'Save' },
  clear: { ka: 'წაშლა', en: 'Clear' },
  tokenStored: { ka: 'ტოკენი შენახულია ამ ბრაუზერში', en: 'Token saved in this browser' },
  runOnGithub: { ka: 'გაშვება GitHub-ზე', en: 'Run it on GitHub' },
  rebuildStarted: {
    ka: 'ხელახალი წაკითხვა დაიწყო. რამდენიმე წუთში ცხრილი განახლდება.',
    en: 'Re-scrape started. The schedule will update in a couple of minutes.',
  },
  language: { ka: 'ენა', en: 'Language' },
  theme: { ka: 'თემა', en: 'Theme' },
  time: { ka: 'დრო', en: 'Time' },
} satisfies Record<string, Record<Language, string>>

export type TranslationKey = keyof typeof dictionary

export function translate(key: TranslationKey, language: Language): string {
  return dictionary[key][language]
}

export function formatDuration(totalMinutes: number, language: Language): string {
  const minutes = Math.max(0, Math.round(totalMinutes))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  if (language === 'ka') {
    if (hours && rest) return `${hours} სთ ${rest} წთ`
    if (hours) return `${hours} სთ`
    return `${rest} წთ`
  }

  if (hours && rest) return `${hours}h ${rest}m`
  if (hours) return `${hours}h`
  return `${rest}m`
}

export function formatDate(value: string, language: Language): string {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return '—'
  return new Intl.DateTimeFormat(language === 'ka' ? 'ka-GE' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tbilisi',
  }).format(parsed)
}
