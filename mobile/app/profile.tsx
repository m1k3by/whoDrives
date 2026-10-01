import * as Linking from 'expo-linking';
import { Alert, Switch, Text, View } from 'react-native';

import { NameForm } from '@/features/profile/NameForm';
import { useDeleteAccount, useLogout, useMyProfile } from '@/features/profile/hooks';
import { PRIVACY_URL } from '@/lib/links';
import { Body, Button, Loading, Screen } from '@/ui/components';
import { t } from '@/ui/strings';
import { font, makeStyles, radius, useTheme } from '@/ui/theme';

export default function ProfileScreen() {
  const profile = useMyProfile();
  const logout = useLogout();
  const deleteAccount = useDeleteAccount();
  const theme = useTheme();
  const styles = useStyles();

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
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{t.profile.darkMode}</Text>
        <Switch
          accessibilityLabel={t.profile.darkMode}
          value={theme.name === 'dark'}
          onValueChange={(dark) => theme.setTheme(dark ? 'dark' : 'light')}
          trackColor={{ true: theme.colors.primary, false: theme.colors.switchOff }}
          thumbColor="#FFFFFF"
          style={styles.switch}
        />
      </View>
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

const useStyles = makeStyles((c) => ({
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.control,
    paddingHorizontal: 16,
  },
  rowLabel: { fontSize: font.body, fontWeight: '500', color: c.text },
  // a bit larger than the platform default; easier to hit
  switch: { transform: [{ scale: 1.2 }] },
}));
