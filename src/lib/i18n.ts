export type Language = 'ka' | 'en'

const dictionary = {
  groupLabel: { ka: 'ჯგუფი', en: 'Group' },
  semester: { ka: 'სემესტრი', en: 'Semester' },
  week: { ka: 'კვირა', en: 'Week' },
  today: { ka: 'დღეს', en: 'Today' },
  freeDay: { ka: 'ლექციები არ არის', en: 'No classes' },
  sharedWith: { ka: 'ჯგუფები', en: 'Groups' },
  unconfirmed: { ka: 'დაუდასტურებელი', en: 'unconfirmed' },
  unconfirmedHint: {
    ka: 'ლექტორის ცხრილში ეს ჯგუფი ამ დროისთვის არ ჩანს.',
    en: "The lecturer's timetable does not list this group for this slot.",
  },
  verified: { ka: 'დადასტურებულია ლექტორების ცხრილით', en: "confirmed against the lecturers' timetable" },
  refresh: { ka: 'განახლება', en: 'Refresh' },
  refreshing: { ka: 'ახლდება…', en: 'Refreshing…' },
  settings: { ka: 'პარამეტრები', en: 'Settings' },
  export: { ka: 'კალენდარში დამატება', en: 'Add to calendar' },
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
  loadFailed: { ka: 'ცხრილის ჩატვირთვა ვერ მოხერხდა', en: 'Could not load the schedule' },
  retry: { ka: 'ხელახლა ცდა', en: 'Try again' },
  emptyWeek: { ka: 'ამ კვირისთვის ლექციები არ არის დაგეგმილი', en: 'No classes are scheduled this week' },
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
  language: { ka: 'ენა', en: 'Language' },
  theme: { ka: 'თემა', en: 'Theme' },
} satisfies Record<string, Record<Language, string>>

export type TranslationKey = keyof typeof dictionary

export function translate(key: TranslationKey, language: Language): string {
  return dictionary[key][language]
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
