import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useCreateFamily, useMyFamily } from '@/features/family/hooks';
import { Body, Button, colors, Field, Loading, Screen, Title } from '@/ui/components';
import { t } from '@/ui/strings';

export default function HomeScreen() {
  const family = useMyFamily();

  if (family.isPending) return <Loading />;
  if (family.isError) {
    return (
      <Screen>
        <Body error>{t.common.genericError}</Body>
        <Button label={t.common.retry} onPress={() => family.refetch()} />
      </Screen>
    );
  }
  if (!family.data) return <CreateFamily />;

  return (
    <Screen>
      <Title>{family.data.name}</Title>
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

function CreateFamily() {
  const [name, setName] = useState('');
  const create = useCreateFamily();

  return (
    <Screen>
      <Title>{t.family.noFamilyTitle}</Title>
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
    </Screen>
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
