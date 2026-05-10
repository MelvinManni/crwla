// 1:1 port of the Scrape Yard.html design tokens to React Native.

export const colors = {
  bg: '#fafafa',
  bgElev: '#ffffff',
  bgSunk: '#f4f4f5',
  fg: '#0a0a0a',
  fgMuted: '#737373',
  fgSubtle: '#a3a3a3',
  border: '#e5e5e5',
  borderStrong: '#d4d4d4',
  accent: '#0a0a0a',
  accentFg: '#ffffff',
  green: '#16a34a',
  amber: '#a16207',
  red: '#dc2626',
  blue: '#2563eb',
} as const;

export const radii = {
  sm: 4,
  control: 6,
  lg: 8,
  card: 10,
  container: 12,
  fab: 16,
} as const;

export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 48, 9: 56 } as const;

export const fonts = {
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemibold: 'Inter_600SemiBold',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
} as const;

export type StatusTone = 'running' | 'paused' | 'error' | 'fresh' | 'idle';

export const statusColor = (s: string): { dot: string; text: string; label: string } => {
  const map: Record<string, { dot: string; text: string; label: string }> = {
    running: { dot: colors.green, text: colors.green, label: 'Running' },
    RUNNING: { dot: colors.green, text: colors.green, label: 'Running' },
    OK: { dot: colors.green, text: colors.green, label: 'Running' },
    paused: { dot: colors.amber, text: colors.amber, label: 'Paused' },
    PAUSED: { dot: colors.amber, text: colors.amber, label: 'Paused' },
    error: { dot: colors.red, text: colors.red, label: 'Error' },
    ERROR: { dot: colors.red, text: colors.red, label: 'Error' },
    fresh: { dot: colors.blue, text: colors.blue, label: 'New' },
  };
  return map[s] ?? { dot: colors.fgSubtle, text: colors.fgMuted, label: s || 'Idle' };
};
