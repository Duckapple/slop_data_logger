export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'nm:theme';

export function getStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    // ignore
  }
  return 'system';
}

export function setStoredTheme(t: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, t);
  } catch {
    // ignore
  }
}

export function resolveTheme(t: Theme): 'light' | 'dark' {
  if (t === 'system') {
    return typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return t;
}

export function applyTheme(t: Theme): void {
  if (typeof document === 'undefined') return;
  const resolved = resolveTheme(t);
  const root = document.documentElement;
  if (resolved === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}
