import { useTheme } from './useTheme';

export type ChartTheme = {
  grid: string;
  axis: string;
  tick: string;
  primary: string;
  tooltip: {
    background: string;
    border: string;
    color: string;
  };
};

export function useChartTheme(): ChartTheme {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  return {
    grid: isDark ? '#1e293b' : '#e2e8f0',
    axis: isDark ? '#334155' : '#cbd5e1',
    tick: isDark ? '#94a3b8' : '#64748b',
    primary: isDark ? '#cbd5e1' : '#0f172a',
    tooltip: {
      background: isDark ? '#0f172a' : '#ffffff',
      border: isDark ? '#334155' : '#e2e8f0',
      color: isDark ? '#e2e8f0' : '#0f172a',
    },
  };
}
