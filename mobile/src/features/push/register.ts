import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// Show notifications also while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let registeredToken: string | null = null;

/** Asks for permission and registers this device for the logged-in user. */
async function registerForPush(): Promise<void> {
  if (Platform.OS === 'android') {
    // channelId 'default' is used by the notify Edge Function
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Termine',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const { error } = await supabase.rpc('register_push_token', {
    p_token: token,
    p_platform: Platform.OS === 'ios' ? 'ios' : 'android',
  });
  if (error) throw error;
  registeredToken = token;
}

/** Registers the device once the user is in a family. Failures only cost the pushes. */
export function usePushRegistration(enabled: boolean) {
  useEffect(() => {
    if (enabled) registerForPush().catch((e) => console.warn('push registration failed', e));
  }, [enabled]);
}

/** Before logout: this device should no longer get messages for this account. */
export async function unregisterPush(): Promise<void> {
  if (!registeredToken) return;
  await supabase.from('push_tokens').delete().eq('token', registeredToken);
  registeredToken = null;
}
