import { router } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { useMyMembership, useRemoveMember } from '@/features/family/hooks';
import { useOpenInvites, useRevokeInvite } from '@/features/invites/hooks';
import { Body, Button, colors, Loading, Screen } from '@/ui/components';
import { t } from '@/ui/strings';

export default function FamilyScreen() {
  const { family, myId } = useMyMembership();
  if (!family) return <Loading />;
  const { id: familyId, name: familyName } = family;

  return (
    <Screen>
      <Button
        label={t.invite.title}
        onPress={() => router.push({ pathname: '/invite', params: { familyId, familyName } })}
      />
      <Text style={styles.heading}>{t.family.members}</Text>
      {family.family_members.map((m) => (
        <View key={m.user_id} style={styles.member}>
          <Text style={styles.memberName}>
            {m.profiles?.display_name || t.family.unnamedMember}
            {m.user_id === myId ? ` ${t.family.you}` : ''}
          </Text>
          <Text style={styles.memberRole}>{t.family.roles[m.role]}</Text>
          {m.user_id !== myId && (
            <RemoveMemberButton
              familyId={familyId}
              userId={m.user_id}
              name={m.profiles?.display_name || t.family.unnamedMember}
            />
          )}
        </View>
      ))}
      <OpenInvites familyId={familyId} />
    </Screen>
  );
}

function RemoveMemberButton({
  familyId,
  userId,
  name,
}: {
  familyId: string;
  userId: string;
  name: string;
}) {
  const remove = useRemoveMember();
  return (
    <>
      <Button
        label={t.family.remove}
        variant="secondary"
        loading={remove.isPending}
        onPress={() =>
          Alert.alert(t.family.removeTitle(name), t.family.removeText, [
            { text: t.common.cancel, style: 'cancel' },
            {
              text: t.family.remove,
              style: 'destructive',
              onPress: () => remove.mutate({ familyId, userId }),
            },
          ])
        }
      />
      {remove.isError && <Body error>{t.common.genericError}</Body>}
    </>
  );
}

function OpenInvites({ familyId }: { familyId: string }) {
  const invites = useOpenInvites(familyId);
  const revoke = useRevokeInvite();
  if (!invites.data?.length) return null;

  return (
    <>
      <Text style={styles.heading}>{t.invite.openTitle}</Text>
      {invites.data.map((i) => (
        <View key={i.id} style={styles.member}>
          <Text style={styles.memberName}>{t.family.roles[i.role]}</Text>
          <Text style={styles.memberRole}>
            {t.invite.validUntil(new Date(i.expires_at).toLocaleDateString('de-DE'))}
          </Text>
          <Button
            label={t.invite.revoke}
            variant="secondary"
            loading={revoke.isPending && revoke.variables === i.id}
            onPress={() => revoke.mutate(i.id)}
          />
        </View>
      ))}
      {revoke.isError && <Body error>{t.common.genericError}</Body>}
    </>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 24, fontWeight: '700', color: colors.text },
  member: {
    gap: 8,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberName: { fontSize: 22, color: colors.text },
  memberRole: { fontSize: 18, color: colors.muted },
});
