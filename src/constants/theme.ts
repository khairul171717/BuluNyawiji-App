/**
 * Theme constants untuk Aplikasi Kaos Desa - Bulu Nyawiji
 * Color palette: Emerald/Teal with warm accents
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1a1a2e',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',
    background: '#f8fafc',
    backgroundElement: '#f1f5f9',
    backgroundSelected: '#e2e8f0',
    card: '#ffffff',
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    // Brand colors
    primary: '#0d9488',
    primaryLight: '#ccfbf1',
    primaryDark: '#0f766e',
    secondary: '#f59e0b',
    secondaryLight: '#fef3c7',
    // Status colors
    success: '#10b981',
    successLight: '#d1fae5',
    successDark: '#059669',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    danger: '#ef4444',
    dangerLight: '#fee2e2',
    info: '#3b82f6',
    infoLight: '#dbeafe',
    // Gradients (start, end)
    gradientPrimary: ['#0d9488', '#06b6d4'],
    gradientSuccess: ['#10b981', '#34d399'],
    gradientWarning: ['#f59e0b', '#fbbf24'],
    gradientDanger: ['#ef4444', '#f87171'],
    gradientDark: ['#1e293b', '#334155'],
  },
  dark: {
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    textTertiary: '#64748b',
    background: '#0f172a',
    backgroundElement: '#1e293b',
    backgroundSelected: '#334155',
    card: '#1e293b',
    border: '#334155',
    borderLight: '#1e293b',
    // Brand colors
    primary: '#2dd4bf',
    primaryLight: '#134e4a',
    primaryDark: '#14b8a6',
    secondary: '#fbbf24',
    secondaryLight: '#78350f',
    // Status colors
    success: '#34d399',
    successLight: '#064e3b',
    successDark: '#10b981',
    warning: '#fbbf24',
    warningLight: '#78350f',
    danger: '#f87171',
    dangerLight: '#7f1d1d',
    info: '#60a5fa',
    infoLight: '#1e3a5f',
    // Gradients (start, end)
    gradientPrimary: ['#0d9488', '#0891b2'],
    gradientSuccess: ['#059669', '#10b981'],
    gradientWarning: ['#d97706', '#f59e0b'],
    gradientDanger: ['#dc2626', '#ef4444'],
    gradientDark: ['#0f172a', '#1e293b'],
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 36,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
