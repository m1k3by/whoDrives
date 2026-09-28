import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useUpdateRequired } from '@/features/app-version/useUpdateRequired';
import { useSession } from '@/features/auth/useSession';
import { Body, Button, Loading, Screen, Title } from '@/ui/components';
import { t } from '@/ui/strings';

// supabase-js already retries network errors itself; one more retry is enough.
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.michael_stoecker.whodrives';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Gate />
    </QueryClientProvider>
  );
}

function Gate() {
  const updateRequired = useUpdateRequired();
  const { session, retry } = useSession();

  if (updateRequired) {
    return (
      <Screen>
        <Title>{t.update.title}</Title>
        <Body>{t.update.text}</Body>
        <Button label={t.update.button} onPress={() => Linking.openURL(PLAY_STORE_URL)} />
      </Screen>
    );
  }
  if (session === undefined) return <Loading />;
  if (session === 'offline') {
    return (
      <Screen>
        <Title>{t.offline.title}</Title>
        <Body>{t.offline.text}</Body>
        <Button label={t.common.retry} onPress={retry} />
      </Screen>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="index" />
        {(
          [
            ['profile', t.profile.title],
            ['invite', t.invite.title],
            ['events', t.events.title],
            ['event-new', t.events.new],
            ['children', t.children.title],
          ] as const
        ).map(([name, title]) => (
          <Stack.Screen
            key={name}
            name={name}
            options={{ headerShown: true, title, headerShadowVisible: false }}
          />
        ))}
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}
