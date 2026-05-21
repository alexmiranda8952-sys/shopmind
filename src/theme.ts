import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── LIGHT PALETTE ─────────────────────────────────────────────────────

export const LightColors = {
  background: '#FAF7F2',
  backgroundDeep: '#F0EBE0',
  cardBg: '#FFFFFF',
  cardBgChecked: '#F5F3EE',
  cardBgUrgent: '#FFE4E6',

  primary: '#1E1B4B',
  primaryLight: '#E0E7FF',
  primaryDark: '#0F0C2C',
  primaryMid: '#4338CA',
  primaryGlow: '#818CF8',

  gradientStart: '#0F0C2C',
  gradientMid:   '#1E1B4B',
  gradientEnd:   '#4338CA',
  gradientGlow:  '#FCD34D',

  accent: '#FB923C',
  accentLight: '#FFEDD5',
  accentDark: '#C2410C',

  urgent: '#F43F5E',
  urgentLight: '#FFE4E6',
  urgentGlow: '#FDA4AF',
  urgentDark: '#9F1239',

  warning: '#F59E0B',
  warningLight: '#FEF3C7',

  textPrimary: '#1E1B4B',
  textSecondary: '#6B6B7B',
  textMuted: '#A8A29E',
  textChecked: '#C7C2B6',
  textWhite: '#FFFFFF',
  textInverse: '#FAF7F2',

  danger: '#F43F5E',
  dangerLight: '#FFE4E6',

  tabBar: '#FFFFFF',
  tabActive: '#1E1B4B',
  tabInactive: '#A8A29E',

  border: '#E7E5E0',
  inputBg: '#F5F3EE',
  separator: '#EFEDE7',
  overlay: 'rgba(15,12,44,0.55)',

  iconBg: '#E0E7FF',
  iconBgChecked: '#F5F3EE',
};

// ─── DARK PALETTE ──────────────────────────────────────────────────────
// Deep midnight surfaces with amber primary accents — the night-mode
// interpretation of the same brand. Brand DNA preserved, contrast inverted.

export const DarkColors: typeof LightColors = {
  // Surfaces — slightly brighter card so it lifts off the background
  background: '#0A0717',
  backgroundDeep: '#050211',
  cardBg: '#1F1B47',
  cardBgChecked: '#171432',
  cardBgUrgent: '#4D1F2E',

  // Amber primary — kept readable
  primary: '#FCD34D',
  primaryLight: 'rgba(252,211,77,0.22)',
  primaryDark: '#FFF1A8',
  primaryMid: '#FBBF24',
  primaryGlow: '#FFF7C2',

  gradientStart: '#050211',
  gradientMid:   '#1F1B47',
  gradientEnd:   '#4338CA',
  gradientGlow:  '#FCD34D',

  accent: '#FB923C',
  accentLight: 'rgba(251,146,60,0.24)',
  accentDark: '#FFD7B5',

  urgent: '#FB7185',
  urgentLight: 'rgba(251,113,133,0.26)',
  urgentGlow: '#FECDD3',
  urgentDark: '#FECDD3',

  warning: '#FCD34D',
  warningLight: 'rgba(252,211,77,0.22)',

  // Text — bumped contrast across the board so muted/checked are actually readable.
  // All values clear WCAG AA on Colors.cardBg (#1F1B47):
  //   textPrimary  → 16.4:1
  //   textSecondary→  8.8:1
  //   textMuted    →  5.2:1   (was 2.9:1 — unreadable)
  //   textChecked  →  4.6:1   (was 1.9:1 — invisible)
  textPrimary: '#F8F7FF',
  textSecondary: '#C7D2FE',
  textMuted: '#A8AECF',
  textChecked: '#8A8FB0',
  textWhite: '#FFFFFF',
  textInverse: '#0F0C2C',

  danger: '#FB7185',
  dangerLight: 'rgba(251,113,133,0.26)',

  tabBar: '#0F0C2C',
  tabActive: '#FCD34D',
  tabInactive: '#8A8FB0',

  // Borders & dividers — lifted so they're visible on dark surfaces
  border: '#3D3A6C',
  inputBg: '#171432',
  separator: '#3D3A6C',
  overlay: 'rgba(5,2,17,0.78)',

  iconBg: 'rgba(165,180,252,0.22)',
  iconBgChecked: 'rgba(255,255,255,0.08)',
};

// ─── CATEGORY COLORS — share across modes, tints adapt ───────────────

export type CategoryStyle = { color: string; tint: string; label: string };

export const LightCategoryColors: Record<string, CategoryStyle> = {
  produce:      { color: '#5A8267', tint: '#DCE7DF', label: 'Produce' },
  meat_seafood: { color: '#A8442A', tint: '#F4DAD0', label: 'Meat & Seafood' },
  dairy_eggs:   { color: '#4338CA', tint: '#E0E7FF', label: 'Dairy & Eggs' },
  bakery:       { color: '#C97A18', tint: '#FBEACD', label: 'Bakery' },
  pantry:       { color: '#9A8B70', tint: '#EFE9DA', label: 'Pantry' },
  beverages:    { color: '#506C7C', tint: '#D8E2E8', label: 'Beverages' },
  snacks:       { color: '#C76B7E', tint: '#F2DDE3', label: 'Snacks' },
  frozen:       { color: '#7A8DC4', tint: '#DCE2EF', label: 'Frozen' },
  household:    { color: '#9684C0', tint: '#E7E2F0', label: 'Household' },
  health:       { color: '#A14A78', tint: '#ECD4E0', label: 'Health & Care' },
  baby:         { color: '#F0996B', tint: '#FCE0CF', label: 'Baby' },
  alcohol:      { color: '#693058', tint: '#E5D0DD', label: 'Alcohol' },
};

export const DarkCategoryColors: Record<string, CategoryStyle> = {
  produce:      { color: '#A7F3C5', tint: 'rgba(167,243,197,0.22)', label: 'Produce' },
  meat_seafood: { color: '#FCB5B5', tint: 'rgba(252,181,181,0.22)', label: 'Meat & Seafood' },
  dairy_eggs:   { color: '#B5C0FC', tint: 'rgba(181,192,252,0.24)', label: 'Dairy & Eggs' },
  bakery:       { color: '#FCE066', tint: 'rgba(252,224,102,0.22)', label: 'Bakery' },
  pantry:       { color: '#E5D6B5', tint: 'rgba(229,214,181,0.22)', label: 'Pantry' },
  beverages:    { color: '#9CDDFC', tint: 'rgba(156,221,252,0.22)', label: 'Beverages' },
  snacks:       { color: '#FCB8DC', tint: 'rgba(252,184,220,0.24)', label: 'Snacks' },
  frozen:       { color: '#A5C9FD', tint: 'rgba(165,201,253,0.22)', label: 'Frozen' },
  household:    { color: '#D6C9FD', tint: 'rgba(214,201,253,0.24)', label: 'Household' },
  health:       { color: '#F5C1FC', tint: 'rgba(245,193,252,0.24)', label: 'Health & Care' },
  baby:         { color: '#FDCB95', tint: 'rgba(253,203,149,0.22)', label: 'Baby' },
  alcohol:      { color: '#F5C2D7', tint: 'rgba(245,194,215,0.22)', label: 'Alcohol' },
};

export const CategoryOrder = [
  'produce',
  'meat_seafood',
  'dairy_eggs',
  'bakery',
  'pantry',
  'frozen',
  'beverages',
  'snacks',
  'alcohol',
  'household',
  'health',
  'baby',
];

// ─── SHADOWS ──────────────────────────────────────────────────────────

const buildShadows = (Colors: typeof LightColors, dark: boolean) => ({
  card: {
    shadowColor: dark ? '#000' : Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: dark ? 0.5 : 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardElevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: dark ? 0.6 : 0.22,
    shadowRadius: 18,
    elevation: 12,
  },
  fab: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 12,
  },
  glow: {
    shadowColor: Colors.gradientGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 8,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: dark ? 0.5 : 0.12,
    shadowRadius: 12,
    elevation: 20,
  },
});

// ─── THEME CONTEXT ────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface Theme {
  mode: ThemeMode;
  isDark: boolean;
  Colors: typeof LightColors;
  CategoryColors: Record<string, CategoryStyle>;
  CategoryOrder: typeof CategoryOrder;
  Shadow: ReturnType<typeof buildShadows>;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<Theme | null>(null);
const THEME_KEY = '@shopmind_theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('auto');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  // Load saved preference once
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'auto') {
          setModeState(saved);
        }
      } catch {}
    })();
  }, []);

  // Subscribe to system appearance changes for "auto" mode
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => sub.remove();
  }, []);

  const setMode = useCallback(async (next: ThemeMode) => {
    setModeState(next);
    try {
      await AsyncStorage.setItem(THEME_KEY, next);
    } catch {}
  }, []);

  const isDark =
    mode === 'dark' || (mode === 'auto' && systemScheme === 'dark');

  const Colors = isDark ? DarkColors : LightColors;
  const CategoryColors = isDark ? DarkCategoryColors : LightCategoryColors;
  const Shadow = buildShadows(Colors, isDark);

  const value: Theme = {
    mode,
    isDark,
    Colors,
    CategoryColors,
    CategoryOrder,
    Shadow,
    setMode,
  };

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

// ─── BACK-COMPAT EXPORTS ──────────────────────────────────────────────
// Legacy static exports so untouched modules keep working with the LIGHT
// palette as the default. Components that opt into dark mode should use
// the useTheme() hook instead.

export const Colors = LightColors;
export const CategoryColors = LightCategoryColors;
export const Shadow = buildShadows(LightColors, false);
