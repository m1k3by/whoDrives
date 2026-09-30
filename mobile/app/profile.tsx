import * as Linking from 'expo-linking';
import { Alert } from 'react-native';

import { NameForm } from '@/features/profile/NameForm';
import { useDeleteAccount, useLogout, useMyProfile } from '@/features/profile/hooks';
import { PRIVACY_URL } from '@/lib/links';
import { Body, Button, Chip, ChipGrid, Loading, Screen } from '@/ui/components';
import { t } from '@/ui/strings';
import { type ThemeName, useTheme } from '@/ui/theme';

const THEMES: ThemeName[] = ['light', 'dark'];

export default function ProfileScreen() {
  const profile = useMyProfile();
  const logout = useLogout();
  const deleteAccount = useDeleteAccount();
  const theme = useTheme();

  if (profile.isPending) return <Loading />;
  if (profile.isError) {
    return (
      <Screen>
        <Body error>{t.common.genericError}</Body>
        <Button label={t.common.retry} onPress={() => profile.refetch()} />
      </Screen>
    );
  }

  function confirmLogout() {
    Alert.alert(t.profile.logoutTitle, t.profile.logoutText, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.profile.logout, style: 'destructive', onPress: logout },
    ]);
  }

  function confirmDelete() {
    Alert.alert(t.profile.deleteTitle, t.profile.deleteText, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.profile.deleteConfirm,
        style: 'destructive',
        onPress: () => deleteAccount.mutate(),
      },
    ]);
  }

  return (
    <Screen>
      <Body>{t.profile.loggedInAs(profile.data.email)}</Body>
      <NameForm profileId={profile.data.id} initialName={profile.data.display_name} />
      <Body>{t.profile.appearance}</Body>
      <ChipGrid>
        {THEMES.map((name) => (
          <Chip
            key={name}
            basis="45%"
            label={t.profile.themes[name]}
            selected={theme.name === name}
            onPress={() => theme.setTheme(name)}
          />
        ))}
      </ChipGrid>
      <Button label={t.profile.logout} variant="secondary" onPress={confirmLogout} />
      <Button
        label={t.profile.privacy}
        variant="secondary"
        onPress={() => Linking.openURL(PRIVACY_URL)}
      />
      <Button
        label={t.profile.delete}
        variant="secondary"
        loading={deleteAccount.isPending}
        onPress={confirmDelete}
      />
      {deleteAccount.isError && <Body error>{t.common.genericError}</Body>}
    </Screen>
  );
}
