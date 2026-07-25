import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, type Theme as NavigationThemeType } from '@react-navigation/native';

import { darkColors, lightColors, type AppColors } from '../theme/colors';

type Scheme = 'light' | 'dark';
const STORAGE_KEY = 'stockcount:theme-preference';

interface ThemeContextValue {
  scheme: Scheme;
  colors: AppColors;
  navigationTheme: NavigationThemeType;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme() ?? 'light';
  const [override, setOverride] = useState<Scheme | null>(null);
  const [hydrated, setHydrated] = useState(false);

 
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark') setOverride(stored);
      setHydrated(true);
    });
  }, []);

  const scheme: Scheme = override ?? (systemScheme === 'dark' ? 'dark' : 'light');
  const colors = scheme === 'dark' ? darkColors : lightColors;


  const baseNavigationTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme: NavigationThemeType = {
    ...baseNavigationTheme,
    colors: {
      ...baseNavigationTheme.colors,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  function toggleTheme() {
    const next: Scheme = scheme === 'dark' ? 'light' : 'dark';
    setOverride(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  }

  const value: ThemeContextValue = { scheme, colors, navigationTheme, toggleTheme };

  if (!hydrated) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within a ThemeProvider');
  return ctx;
}
