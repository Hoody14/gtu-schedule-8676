import { useCallback, useState } from 'react'
import type { Language } from '@/lib/i18n'

const STORAGE_KEY = 'gtu-schedule.language'

export function useLanguage(): [Language, () => void] {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'en' ? 'en' : 'ka'
  })

  const toggle = useCallback(() => {
    setLanguage((current) => {
      const next: Language = current === 'ka' ? 'en' : 'ka'
      localStorage.setItem(STORAGE_KEY, next)
      document.documentElement.lang = next === 'ka' ? 'ka' : 'en'
      return next
    })
  }, [])

  return [language, toggle]
}
