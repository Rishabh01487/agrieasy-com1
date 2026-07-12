'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { type Language, type TranslationKey, getTranslation } from './translations'

interface LanguageContextType {
  lang: Language
  t: (key: TranslationKey) => string
  setLang: (lang: Language) => void
  toggleLang: () => void
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  t: (key) => key,
  setLang: () => {},
  toggleLang: () => {},
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('en')

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('app_language') : null
    if (saved === 'hi' || saved === 'en') {
      setLangState(saved)
    }
  }, [])

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_language', newLang)
    }
  }, [])

  const toggleLang = useCallback(() => {
    setLang(lang === 'en' ? 'hi' : 'en')
  }, [lang, setLang])

  const t = useCallback((key: TranslationKey) => {
    return getTranslation(lang, key)
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, t, setLang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
