import { Alert } from 'react-native';

import { NameForm } from '@/features/profile/NameForm';
import { useLogout, useMyProfile } from '@/features/profile/hooks';
import { Body, Button, Loading, Screen } from '@/ui/components';
import { t } from '@/ui/strings';

export default function ProfileScreen() {
  const profile = useMyProfile();
  const logout = useLogout();

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

  return (
    <Screen>
      <Body>{t.profile.loggedInAs(profile.data.email)}</Body>
      <NameForm profileId={profile.data.id} initialName={profile.data.display_name} />
      <Button label={t.profile.logout} variant="secondary" onPress={confirmLogout} />
    </Screen>
  );
}
