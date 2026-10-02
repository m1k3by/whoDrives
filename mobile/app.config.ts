import type { ExpoConfig } from 'expo/config';

const EAS_PROJECT_ID = '119b980e-5f5b-468f-9d78-baa8e0a962e5';

// Firebase config for push (FCM): EAS file variable GOOGLE_SERVICES_JSON
// (environments development and production). Without it the app builds, but gets no pushes.
const googleServicesFile = process.env.GOOGLE_SERVICES_JSON;

const config: ExpoConfig = {
  name: 'Who Drives?',
  slug: 'm1k3by', // must match the EAS project created during Expo onboarding
  owner: 'm1k3bys-team',
  scheme: 'whodrives',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  runtimeVersion: { policy: 'fingerprint' },
  updates: { url: `https://u.expo.dev/${EAS_PROJECT_ID}` },
  android: {
    package: 'com.michael_stoecker.whodrives',
    adaptiveIcon: {
      backgroundColor: '#3B4BC8',
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    googleServicesFile,
  },
  ios: { supportsTablet: true },
  plugins: [
    'expo-router',
    'expo-secure-store',
    ['expo-notifications', { icon: './assets/notification-icon.png', color: '#3B4BC8' }],
    [
      'expo-speech-recognition',
      {
        microphonePermission: 'Who Drives? nutzt das Mikrofon, wenn du einen Termin sprichst.',
        speechRecognitionPermission: 'Who Drives? wandelt deinen gesprochenen Termin in Text um.',
      },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: { eas: { projectId: EAS_PROJECT_ID } },
};

export default config;
