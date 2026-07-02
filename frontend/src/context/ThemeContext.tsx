'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ThemeMode, getStoredTheme, storeTheme, applyTheme, setupThemeListener } from '@/lib/theme';

interface ThemeContextType {
  themeMode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    storeTheme(mode);
    // Update resolved theme
    const { getResolvedTheme } = require('@/lib/theme');
    setResolvedTheme(getResolvedTheme(mode));
  }, []);

  useEffect(() => {
    const stored = getStoredTheme();
    setThemeModeState(stored);
    applyTheme(stored);

    // Resolve current theme
    const { getResolvedTheme: resolve } = require('@/lib/theme');
    setResolvedTheme(resolve(stored));

    // Listen for system theme changes
    const cleanup = setupThemeListener(() => {
      const current = getStoredTheme();
      if (current === 'system') {
        const { getResolvedTheme: resolve2 } = require('@/lib/theme');
        setResolvedTheme(resolve2('system'));
      }
    });

    return cleanup;
  }, []);

  return (
    <ThemeContext.Provider value={{ themeMode, resolvedTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};