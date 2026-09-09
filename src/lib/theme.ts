export type Theme = "gasa" | "gasadark";

const STORAGE_KEY = "gasa-theme";

export function getStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "gasa" || value === "gasadark" ? value : null;
  } catch {
    return null;
  }
}

export function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "gasadark"
    : "gasa";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "gasadark");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage unavailable (e.g. private browsing) — theme still applies for this load.
  }
}
