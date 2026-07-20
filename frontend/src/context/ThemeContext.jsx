import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { api } from '../lib/api.js';

const ThemeContext = createContext(null);

const MODE_KEY = 'studytest.themeMode';
const COLOR_KEY = 'studytest.themeColor';

export const THEME_COLORS = [
  { id: 'violet', label: 'Violet', swatch: '#8b7bff' },
  { id: 'blue', label: 'Blue', swatch: '#5b9dff' },
  { id: 'teal', label: 'Teal', swatch: '#2dd4bf' },
  { id: 'purple', label: 'Purple', swatch: '#c084fc' },
  { id: 'rose', label: 'Rose', swatch: '#f472b6' },
];
const COLOR_IDS = THEME_COLORS.map((c) => c.id);

function resolveInitialMode() {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(MODE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  return 'dark';
}

function resolveInitialColor() {
  if (typeof window === 'undefined') return 'violet';
  const stored = window.localStorage.getItem(COLOR_KEY);
  return COLOR_IDS.includes(stored) ? stored : 'violet';
}

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [mode, setModeState] = useState(resolveInitialMode);
  const [color, setColorState] = useState(resolveInitialColor);

  // Once logged in, an account-level preference (set from any device) wins over
  // whatever this browser had locally. Keyed on user id so it only re-applies on an
  // actual login/account-switch, not on every AuthContext refresh of the same user.
  useEffect(() => {
    if (user && (user.themeMode || user.themeColor)) {
      if (user.themeMode) setModeState(user.themeMode);
      if (user.themeColor) setColorState(user.themeColor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    document.documentElement.setAttribute('data-mode', mode);
    window.localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-color', color);
    window.localStorage.setItem(COLOR_KEY, color);
  }, [color]);

  function persistToAccount(nextMode, nextColor) {
    if (user) {
      api.updateTheme({ mode: nextMode, color: nextColor }).catch(() => {});
    }
  }

  function setMode(next) {
    if (next !== 'light' && next !== 'dark') return;
    setModeState(next);
    persistToAccount(next, color);
  }

  function toggleMode() {
    setModeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      persistToAccount(next, color);
      return next;
    });
  }

  function setColor(next) {
    if (!COLOR_IDS.includes(next)) return;
    setColorState(next);
    persistToAccount(mode, next);
  }

  const value = { mode, color, colors: THEME_COLORS, setMode, toggleMode, setColor };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
