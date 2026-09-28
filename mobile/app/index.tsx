import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useCreateFamily, useMyFamily } from '@/features/family/hooks';
import { InvalidInviteError, useRedeemInvite } from '@/features/invites/hooks';
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

  const isParent = family.data.family_members.some(
    (m) => m.user_id === profile.data.id && m.role === 'parent',
  );
  const { id: familyId, name: familyName } = family.data;

  return (
    <Screen>
      <Title>{family.data.name}</Title>
      {isParent && (
        <Button
          label={t.invite.title}
          onPress={() => router.push({ pathname: '/invite', params: { familyId, familyName } })}
        />
      )}
      <ProfileButton />
      <Text style={styles.heading}>{t.family.members}</Text>
      {family.data.family_members.map((m) => (
        <View key={m.user_id} style={styles.member}>
          <Text style={styles.memberName}>
            {m.profiles?.display_name || t.family.unnamedMember}
          </Text>
          <Text style={styles.memberRole}>{t.family.roles[m.role]}</Text>
        </View>
      ))}
    </Screen>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberName: { fontSize: 22, color: colors.text },
  memberRole: { fontSize: 18, color: colors.muted },
});
