import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useUpdateRequired } from '@/features/app-version/useUpdateRequired';
import { useSession } from '@/features/auth/useSession';
import { Body, Button, Loading, Screen, Title } from '@/ui/components';
import { t } from '@/ui/strings';

const queryClient = new QueryClient();

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
  const session = useSession();

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

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="index" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}
