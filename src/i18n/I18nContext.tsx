import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createTranslator } from './translate'
import type { Locale } from './types'
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from './types'
import { fr } from './locales/fr'
import { en } from './locales/en'

const catalogs = { fr, en } as const

type TFunction = (key: string, vars?: Record<string, string | number>) => string

type I18nValue = {
  locale: Locale
  setLocale: (next: Locale) => void
  t: TFunction
}

const I18nContext = createContext<I18nValue | null>(null)

function readStoredLocale(): Locale {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (raw === 'en' || raw === 'fr') return raw
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale())

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const t = useMemo(() => createTranslator(catalogs[locale]), [locale])

  useEffect(() => {
    document.documentElement.lang = locale === 'fr' ? 'fr' : 'en'
  }, [locale])

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/** Hook consommateur du contexte i18n (export non composant : désactive react-refresh pour ce fichier). */
// eslint-disable-next-line react-refresh/only-export-components -- hook pair to I18nProvider
export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return ctx
}
