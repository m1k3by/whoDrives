import * as SecureStore from 'expo-secure-store';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

export type ThemeName = 'light' | 'dark';

// Light = grey background with lighter cards, dark = graphite. Red/green carry
// meaning (open / taken) and stay recognisable in both.
const light = {
  background: '#E8EAED',
  surface: '#F4F5F7', // cards, calendar, inputs
  text: '#1F2328',
  muted: '#5B6270',
  icon: '#5B6270',
  border: '#D3D8DF', // soft: lines separate, they do not frame
  switchOff: '#B4BBC6',
  primary: '#3B4BC8',
  onPrimary: '#FFFFFF',
  error: '#C62828',
  open: '#C62828', // occurrence nobody takes yet: action needed
  covered: '#2E7D32', // occurrence somebody takes: all good
  backdrop: 'rgba(0,0,0,0.5)',
};

export type Palette = typeof light;

const dark: Palette = {
  background: '#1E2126',
  surface: '#2A2E35',
  text: '#ECEFF4',
  muted: '#9AA3B2',
  icon: '#9AA3B2',
  border: '#363B44',
  switchOff: '#565D69',
  primary: '#8FA8FF',
  onPrimary: '#1E2126',
  error: '#FF8A8A',
  open: '#FF6B6B',
  covered: '#5FD38D',
  backdrop: 'rgba(0,0,0,0.6)',
};

export const palettes: Record<ThemeName, Palette> = { light, dark };

/**
 * One scale for the whole app: large enough for grandparents, calm enough to look fine.
 * Use these instead of new numbers.
 */
export const font = { title: 28, heading: 21, body: 18, small: 16 } as const;
export const radius = { card: 18, control: 14 } as const;
/** Soft lift for cards instead of a frame */
export const raised = {
  elevation: 2,
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
} as const;

const STORAGE_KEY = 'whodrives.theme';

type Theme = { name: ThemeName; colors: Palette; setTheme: (name: ThemeName) => void };

const ThemeContext = createContext<Theme>({ name: 'light', colors: light, setTheme: () => {} });

/** Theme chosen on this device (stored locally), light until something else was chosen. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState<ThemeName | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((stored) => setName(stored === 'dark' ? 'dark' : 'light'))
      .catch(() => setName('light'));
  }, []);

  function setTheme(next: ThemeName) {
    setName(next);
    SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {});
  }

  // Render nothing for the few milliseconds until the stored choice is read (no flash).
  if (!name) return null;
  return (
    <ThemeContext.Provider value={{ name, colors: palettes[name], setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
export const useColors = () => useContext(ThemeContext).colors;

/**
 * Stylesheet that depends on the theme: `const useStyles = makeStyles((c) => ({ ... }))`,
 * then `const styles = useStyles()` in the component. Created once per theme.
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (c: Palette) => T) {
  const cache = new Map<ThemeName, T>();
  return function useStyles(): T {
    const { name, colors } = useTheme();
    let styles = cache.get(name);
    if (!styles) {
      styles = StyleSheet.create(factory(colors));
      cache.set(name, styles);
    }
    return styles;
  };
}
