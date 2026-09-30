import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useClaimOccurrence, useReleaseOccurrence, type Occurrence } from './hooks';

jest.setTimeout(60_000);

let mockResolve: (value: { data: unknown; error: null }) => void = () => {};
jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: () => new Promise((resolve) => (mockResolve = resolve)),
  },
}));

const KEY = ['occurrences', 'fam', 'from', 'to'];
const row = (patch: Partial<Occurrence>): Occurrence =>
  ({
    id: 'occ-1',
    starts_at: '2026-10-06T13:00:00Z',
    ends_at: '2026-10-06T14:00:00Z',
    status: 'open',
    assigned_to: null,
    profiles: null,
    events: null,
    ...patch,
  }) as Occurrence;

const clients: QueryClient[] = [];
afterEach(() => clients.splice(0).forEach((c) => c.clear()));

function setup(initial: Occurrence) {
  // No gc timers (they keep Jest alive) and never pause mutations as 'offline'.
  const client = new QueryClient({
    defaultOptions: {
      queries: { gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity, networkMode: 'always' },
    },
  });
  clients.push(client);
  client.setQueryData(KEY, [initial]);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const cached = () => client.getQueryData<Occurrence[]>(KEY)![0];
  return { wrapper, cached };
}

test('claim shows up immediately, before the server answers', async () => {
  const { wrapper, cached } = setup(row({}));
  const { result } = await renderHook(() => useClaimOccurrence('user-oma'), { wrapper });

  await act(async () => result.current.mutate('occ-1'));
  await waitFor(() => expect(cached().status).toBe('claimed'));
  expect(cached().assigned_to).toBe('user-oma');

  await act(async () => mockResolve({ data: true, error: null }));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});

test('someone else was faster: the claim is rolled back', async () => {
  const { wrapper, cached } = setup(row({}));
  const { result } = await renderHook(() => useClaimOccurrence('user-oma'), { wrapper });

  await act(async () => result.current.mutate('occ-1'));
  await waitFor(() => expect(cached().status).toBe('claimed'));

  await act(async () => mockResolve({ data: false, error: null })); // server: already taken
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(cached().status).toBe('open');
  expect(cached().assigned_to).toBeNull();
});

test('release shows the occurrence as open right away', async () => {
  const { wrapper, cached } = setup(
    row({ status: 'claimed', assigned_to: 'user-oma', profiles: { display_name: 'Oma' } }),
  );
  const { result } = await renderHook(() => useReleaseOccurrence(), { wrapper });

  await act(async () => result.current.mutate('occ-1'));
  await waitFor(() => expect(cached().status).toBe('open'));
  expect(cached().profiles).toBeNull();
});
