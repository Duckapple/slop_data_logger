import { useCallback, useEffect, useState } from 'react';
import {
  applyTheme,
  getStoredTheme,
  resolveTheme,
  setStoredTheme,
  type Theme,
} from '../lib/theme';

export function useTheme(): {
  theme: Theme;
  resolved: 'light' | 'dark';
  setTheme: (t: Theme) => void;
} {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [resolved, setResolved] = useState<'light' | 'dark'>(() =>
    resolveTheme(getStoredTheme()),
  );

  useEffect(() => {
    applyTheme(theme);
    setResolved(resolveTheme(theme));
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      applyTheme('system');
      setResolved(resolveTheme('system'));
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setStoredTheme(t);
    setThemeState(t);
  }, []);

  return { theme, resolved, setTheme };
}
