import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIGHT_COLORS, DARK_COLORS, buildTints } from '../constants/colors';

const THEME_KEY = 'olympy_theme_mode'; // 'light' | 'dark' | 'system'

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setMode] = useState('system'); // user preference
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setMode(saved);
        }
      } catch (e) {
        // ignore — default to system
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setThemeMode = useCallback(async (next) => {
    setMode(next);
    try {
      await AsyncStorage.setItem(THEME_KEY, next);
    } catch (e) {
      // ignore persistence failure — mode still applies for this session
    }
  }, []);

  // Resolve 'system' -> actual scheme; default to light if OS can't tell.
  const resolvedScheme = mode === 'system' ? (systemScheme || 'light') : mode;
  const isDark = resolvedScheme === 'dark';

  const value = useMemo(() => {
    const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
    const tints = buildTints(colors);
    return {
      mode,               // 'light' | 'dark' | 'system' (user preference)
      scheme: resolvedScheme, // 'light' | 'dark' (actual applied)
      isDark,
      colors,
      tints,
      setThemeMode,
      ready,
    };
  }, [mode, resolvedScheme, isDark, setThemeMode, ready]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback so a component used outside the provider (e.g. in tests)
    // doesn't crash — behaves like the old static light-only theme.
    const colors = LIGHT_COLORS;
    return {
      mode: 'light',
      scheme: 'light',
      isDark: false,
      colors,
      tints: buildTints(colors),
      setThemeMode: () => {},
      ready: true,
    };
  }
  return ctx;
};
