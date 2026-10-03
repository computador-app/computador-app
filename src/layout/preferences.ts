import type { Locale } from "../i18n";
export interface Preferences {
  version: 1;
  locale: Locale;
  theme: "dark" | "light";
  fontSize: number;
}
export const defaultPreferences: Preferences = {
  version: 1,
  locale: "pt-BR",
  theme: "dark",
  fontSize: 13,
};
export const preferenceKey = "computador.visual.v1";
export const layoutKey = "computador.layout.v1";
export const savedLayoutKey = "computador.layout.saved.v1";
export function parsePreferences(raw: string | null): Preferences {
  try {
    const value = JSON.parse(raw || "null");
    if (!value || value.version !== 1) return { ...defaultPreferences };
    return {
      version: 1,
      locale: value.locale === "en" ? "en" : "pt-BR",
      theme: value.theme === "light" ? "light" : "dark",
      fontSize:
        Number.isInteger(value.fontSize) &&
        value.fontSize >= 11 &&
        value.fontSize <= 18
          ? value.fontSize
          : 13,
    };
  } catch {
    return { ...defaultPreferences };
  }
}
export function readStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
