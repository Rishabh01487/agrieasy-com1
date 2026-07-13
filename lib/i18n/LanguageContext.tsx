'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { type Language, type TranslationKey, getTranslation, translateCommodity, translateVehicleType } from './translations'

interface LanguageContextType {
  lang: Language
  t: (key: TranslationKey) => string
  setLang: (lang: Language) => void
  toggleLang: () => void
  tc: (name: string) => string
  tv: (type: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  t: (key) => key,
  setLang: () => {},
  toggleLang: () => {},
  tc: (name) => name,
  tv: (type) => type,
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

  const tc = useCallback((name: string) => translateCommodity(lang, name), [lang])
  const tv = useCallback((type: string) => translateVehicleType(lang, type), [lang])

  return (
    <LanguageContext.Provider value={{ lang, t, setLang, toggleLang, tc, tv }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
