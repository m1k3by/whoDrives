import { fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { makeStyles, palettes, ThemeProvider, useTheme } from './theme';

jest.setTimeout(60_000);

const mockStore: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: async (key: string) => mockStore[key] ?? null,
  setItemAsync: async (key: string, value: string) => {
    mockStore[key] = value;
  },
}));

const useProbeStyles = makeStyles((c) => ({ box: { backgroundColor: c.background } }));

function Probe() {
  const { name, setTheme } = useTheme();
  const styles = useProbeStyles();
  return (
    <Pressable onPress={() => setTheme(name === 'dark' ? 'light' : 'dark')}>
      <Text style={styles.box}>{name}</Text>
    </Pressable>
  );
}

beforeEach(() => {
  for (const key of Object.keys(mockStore)) delete mockStore[key];
});

test('starts light when nothing was chosen', async () => {
  await render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );
  expect(await screen.findByText('light')).toBeTruthy();
});

test('restores the stored choice and saves a new one; styles follow the theme', async () => {
  mockStore['whodrives.theme'] = 'dark';
  await render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );
  const label = await screen.findByText('dark');
  expect(label.props.style).toMatchObject({ backgroundColor: palettes.dark.background });

  await fireEvent.press(label);
  const light = await screen.findByText('light');
  expect(light.props.style).toMatchObject({ backgroundColor: palettes.light.background });
  expect(mockStore['whodrives.theme']).toBe('light');
});
