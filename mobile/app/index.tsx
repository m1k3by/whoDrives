import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { useCreateFamily, useMyFamily, useRemoveMember } from '@/features/family/hooks';
import {
  InvalidInviteError,
  useOpenInvites,
  useRedeemInvite,
  useRevokeInvite,
} from '@/features/invites/hooks';
import { NameForm } from '@/features/profile/NameForm';
import { useMyProfile } from '@/features/profile/hooks';
import { Body, Button, colors, Field, Loading, Screen, Title } from '@/ui/components';
import { t } from '@/ui/strings';

export default function HomeScreen() {
  const profile = useMyProfile();
  const family = useMyFamily();

  if (profile.isPending || family.isPending) return <Loading />;
  if (profile.isError || family.isError) {
    return (
      <Screen>
        <Body error>{t.common.genericError}</Body>
        <Button
          label={t.common.retry}
          onPress={() => {
            profile.refetch();
            family.refetch();
          }}
        />
      </Screen>
    );
  }
  // New users first say who they are, so others see a name in the member list.
  if (!profile.data.display_name) {
    return (
      <Screen>
        <Title>{t.profile.welcomeTitle}</Title>
        <Body>{t.profile.welcomeText}</Body>
        <NameForm profileId={profile.data.id} initialName="" onSaved={() => profile.refetch()} />
      </Screen>
    );
  }
  if (!family.data) return <CreateFamily />;

  const myId = profile.data.id;
  const isParent = family.data.family_members.some(
    (m) => m.user_id === myId && m.role === 'parent',
  );
  const { id: familyId, name: familyName } = family.data;

  return (
    <Screen>
      <Title>{family.data.name}</Title>
      <Button label={t.events.title} onPress={() => router.push('/events')} />
      <Button
        label={t.children.title}
        variant="secondary"
        onPress={() => router.push('/children')}
      />
      {isParent && (
        <Button
          label={t.invite.title}
          variant="secondary"
          onPress={() => router.push({ pathname: '/invite', params: { familyId, familyName } })}
        />
      )}
      <ProfileButton />
      <Text style={styles.heading}>{t.family.members}</Text>
      {family.data.family_members.map((m) => (
        <View key={m.user_id} style={styles.member}>
          <Text style={styles.memberName}>
            {m.profiles?.display_name || t.family.unnamedMember}
            {m.user_id === myId ? ` ${t.family.you}` : ''}
          </Text>
          <Text style={styles.memberRole}>{t.family.roles[m.role]}</Text>
          {isParent && m.user_id !== myId && (
            <RemoveMemberButton
              familyId={familyId}
              userId={m.user_id}
              name={m.profiles?.display_name || t.family.unnamedMember}
            />
          )}
        </View>
      ))}
      {isParent && <OpenInvites familyId={familyId} />}
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

// New user without family: join with an invite code, or create a family.
function CreateFamily() {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const create = useCreateFamily();
  const redeem = useRedeemInvite();

  return (
    <Screen>
      <Title>{t.family.noFamilyTitle}</Title>
      <Body>{t.family.joinText}</Body>
      <Field
        label={t.family.codeLabel}
        placeholder="ABCD-EFGH"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={12}
        onSubmitEditing={() => code.trim() && redeem.mutate(code)}
      />
      <Button
        label={t.family.join}
        loading={redeem.isPending}
        onPress={() => code.trim() && redeem.mutate(code)}
      />
      {redeem.isError && (
        <Body error>
          {redeem.error instanceof InvalidInviteError
            ? t.family.invalidCode
            : t.common.genericError}
        </Body>
      )}

      <Text style={styles.heading}>{t.family.orCreate}</Text>
      <Body>{t.family.noFamilyText}</Body>
      <Field
        label={t.family.nameLabel}
        placeholder={t.family.namePlaceholder}
        value={name}
        onChangeText={setName}
        maxLength={50}
      />
      <Button
        label={t.family.create}
        loading={create.isPending}
        onPress={() => name.trim() && create.mutate(name)}
      />
      {create.isError && <Body error>{t.common.genericError}</Body>}
      <ProfileButton />
    </Screen>
  );
}

function ProfileButton() {
  return (
    <Button label={t.profile.title} variant="secondary" onPress={() => router.push('/profile')} />
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
