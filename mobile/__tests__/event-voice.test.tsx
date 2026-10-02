import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import VoiceEventScreen from '../app/event-voice';

jest.setTimeout(60_000);

// Speech recognition: the test plays the native events itself
type Handler = (event: unknown) => void;
const mockHandlers: Record<string, Handler> = {};
const mockStart = jest.fn();
const mockPermission = jest.fn();
jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    isRecognitionAvailable: () => true,
    requestPermissionsAsync: () => mockPermission(),
    start: (options: unknown) => mockStart(options),
    stop: jest.fn(),
  },
  useSpeechRecognitionEvent: (name: string, handler: Handler) => {
    mockHandlers[name] = handler;
  },
}));

const mockInvoke = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } },
}));
jest.mock('@/features/events/hooks', () => ({
  useChildren: () => ({ data: [{ id: 'child-lena', first_name: 'Lena', color: '#1E6FD9' }] }),
}));
jest.mock('@/features/family/hooks', () => ({
  useMyMembership: () => ({ family: { id: 'fam-1' } }),
}));
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ router: { replace: (to: unknown) => mockReplace(to) } }));

beforeEach(() => {
  mockStart.mockClear();
  mockReplace.mockClear();
  mockInvoke.mockReset();
  mockPermission.mockResolvedValue({ granted: true });
});

async function show() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  await render(
    <QueryClientProvider client={client}>
      <VoiceEventScreen />
    </QueryClientProvider>,
  );
}

async function speak(sentence: string) {
  await fireEvent.press(screen.getByLabelText('Aufnahme starten'));
  expect(mockStart).toHaveBeenCalledWith(expect.objectContaining({ lang: 'de-DE' }));
  await act(async () => {
    mockHandlers.start({});
    mockHandlers.result({ results: [{ transcript: sentence }] });
    mockHandlers.end({});
  });
}

test('spoken sentence is understood and opens the form pre-filled', async () => {
  mockInvoke.mockResolvedValue({
    data: {
      title: 'Reiten',
      kind: 'ride',
      children: ['Lena'],
      location: 'Reitstall Sonnenhof',
      weekly: true,
      firstDate: '2026-10-06',
      untilDate: '',
      time: '15:00',
      durationMin: 60,
    },
    error: null,
  });
  await show();

  await speak('Reiten mit Lena jeden Dienstag um 15 Uhr');
  expect(screen.getByText('„Reiten mit Lena jeden Dienstag um 15 Uhr“')).toBeTruthy();
  await fireEvent.press(screen.getByText('Weiter'));

  expect(mockInvoke).toHaveBeenCalledWith('parse-event', {
    body: { text: 'Reiten mit Lena jeden Dienstag um 15 Uhr' },
  });
  const target = mockReplace.mock.calls[0][0];
  expect(target.pathname).toBe('/event-new');
  expect(JSON.parse(target.params.prefill)).toMatchObject({
    title: 'Reiten',
    childIds: ['child-lena'],
    firstDate: '2026-10-06',
    time: '15:00',
  });
});

test('without microphone permission nothing starts and the person learns why', async () => {
  mockPermission.mockResolvedValue({ granted: false });
  await show();

  await fireEvent.press(screen.getByLabelText('Aufnahme starten'));
  expect(mockStart).not.toHaveBeenCalled();
  expect(screen.getByText(/Ohne Mikrofon geht das nicht/)).toBeTruthy();
});

test('typing instead always works', async () => {
  await show();
  await fireEvent.press(screen.getByText('Eintippen'));
  expect(mockReplace).toHaveBeenCalledWith('/event-new');
});
