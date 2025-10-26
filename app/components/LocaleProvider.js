'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import en from '@/messages/en.json'
import pl from '@/messages/pl.json'
import uk from '@/messages/uk.json'
import ro from '@/messages/ro.json'
import bg from '@/messages/bg.json'

const messages = { en, pl, uk, ro, bg }

const LocaleContext = createContext()

export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState('en')

  // Load locale from localStorage on mount
  useEffect(() => {
    const savedLocale = localStorage.getItem('locale')
    if (savedLocale && messages[savedLocale]) {
      setLocale(savedLocale)
    }
  }, [])

  // Save locale to localStorage when changed
  const changeLocale = (newLocale) => {
    setLocale(newLocale)
    localStorage.setItem('locale', newLocale)
  }

  const t = (key) => {
    const keys = key.split('.')
    let value = messages[locale]
    
    for (const k of keys) {
      value = value?.[k]
    }
    
    return value || key
  }

  return (
    <LocaleContext.Provider value={{ locale, changeLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider')
  }
  return context
}
