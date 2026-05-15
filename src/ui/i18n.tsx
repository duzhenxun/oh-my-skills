"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Language = "zh" | "en";

export function detectSystemLanguage(): Language {
  if (typeof navigator === "undefined") return "en";
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  return languages.some((item) => item.toLowerCase().startsWith("zh")) ? "zh" : "en";
}

export const defaultLanguage: Language = "en";

export const LanguageContext = createContext<{ language: Language; setLanguage?: (language: Language) => void }>({
  language: defaultLanguage,
});

export function readStoredLanguage(): Language {
  if (typeof window === "undefined") return defaultLanguage;
  const value = window.localStorage.getItem("oms-language");
  return value === "en" || value === "zh" ? value : detectSystemLanguage();
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  const [storedLanguage, setStoredLanguage] = useState<Language>(defaultLanguage);
  useEffect(() => {
    function syncLanguage() {
      setStoredLanguage(readStoredLanguage());
    }
    syncLanguage();
    window.addEventListener("storage", syncLanguage);
    window.addEventListener("oms-language-change", syncLanguage);
    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("oms-language-change", syncLanguage);
    };
  }, []);
  return context.setLanguage ? context.language : storedLanguage;
}
