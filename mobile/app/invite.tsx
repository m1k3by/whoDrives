import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Share, Text } from 'react-native';

import { formatInviteCode, useCreateInvite, type FamilyRole } from '@/features/invites/hooks';
import { STORE_URL } from '@/lib/links';
import { Body, Button, Screen } from '@/ui/components';
import { t } from '@/ui/strings';
import { makeStyles } from '@/ui/theme';

const ROLES: FamilyRole[] = ['grandparent', 'parent', 'other'];

export default function InviteScreen() {
  const styles = useStyles();
  const { familyId, familyName } = useLocalSearchParams<{ familyId: string; familyName: string }>();
  const [role, setRole] = useState<FamilyRole>('grandparent');
  const invite = useCreateInvite();

  if (invite.data) {
    const code = formatInviteCode(invite.data.code);
    const validUntil = new Date(invite.data.expires_at).toLocaleDateString('de-DE');
    return (
      <Screen>
        <Body>{t.invite.codeIntro(t.family.roles[role])}</Body>
        <Text selectable accessibilityLabel={code.split('').join(' ')} style={styles.code}>
          {code}
        </Text>
        <Body>{t.invite.validUntil(validUntil)}</Body>
        <Button
          label={t.invite.share}
          onPress={() =>
            Share.share({
              message: t.invite.shareMessage(familyName, code, validUntil, STORE_URL),
            })
          }
        />
        <Button label={t.invite.another} variant="secondary" onPress={() => invite.reset()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Body>{t.invite.chooseRole}</Body>
      {ROLES.map((r) => (
        <Button
          key={r}
          label={t.family.roles[r]}
          variant={r === role ? 'primary' : 'secondary'}
          onPress={() => setRole(r)}
        />
      ))}
      <Body>{t.invite.roleNote}</Body>
      <Button
        label={t.invite.create}
        loading={invite.isPending}
        onPress={() => invite.mutate({ familyId, role })}
      />
      {invite.isError && <Body error>{t.common.genericError}</Body>}
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  code: {
    fontSize: 44,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
    color: c.text,
    paddingVertical: 12,
  },
}));
