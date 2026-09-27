import type { ExpoConfig } from 'expo/config';

const EAS_PROJECT_ID = '119b980e-5f5b-468f-9d78-baa8e0a962e5';

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
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  ios: { supportsTablet: true },
  plugins: ['expo-router', 'expo-secure-store'],
  experiments: { typedRoutes: true },
  extra: { eas: { projectId: EAS_PROJECT_ID } },
};

export default config;
