import React, { createContext, useContext, useState, useEffect } from 'react';
import { ta } from './ta.js';
import { en } from './en.js';

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('app_lang') || 'ta');

  useEffect(() => {
    localStorage.setItem('app_lang', lang);
  }, [lang]);

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'ta' ? 'en' : 'ta'));
  };

  const t = (key) => {
    const dict = lang === 'ta' ? ta : en;
    return dict[key] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, toggleLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

