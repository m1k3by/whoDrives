import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useChildren, useCreateChild } from '@/features/events/hooks';
import { useMyMembership } from '@/features/family/hooks';
import { Body, Button, Field, Loading, Screen } from '@/ui/components';
import { t } from '@/ui/strings';
import { makeStyles } from '@/ui/theme';

const PALETTE = Object.keys(t.children.colors) as (keyof typeof t.children.colors)[];

export default function ChildrenScreen() {
  const styles = useStyles();
  const { family } = useMyMembership();
  const children = useChildren(family?.id);

  if (children.isPending) return <Loading />;
  if (children.isError)
    return (
      <Screen>
        <Body error>{t.common.genericError}</Body>
      </Screen>
    );

  return (
    <Screen>
      {children.data.length === 0 && <Body>{t.children.none}</Body>}
      {children.data.map((c) => (
        <View key={c.id} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: c.color }]} />
          <Text style={styles.name}>{c.first_name}</Text>
        </View>
      ))}
      {family && <AddChild familyId={family.id} />}
    </Screen>
  );
}

function AddChild({ familyId }: { familyId: string }) {
  const styles = useStyles();
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(PALETTE[0]);
  const [invalid, setInvalid] = useState(false);
  const create = useCreateChild();

  function save() {
    if (!name.trim()) return setInvalid(true);
    setInvalid(false);
    create.mutate(
      { family_id: familyId, first_name: name.trim(), color },
      { onSuccess: () => setName('') },
    );
  }

  return (
    <>
      <Text style={styles.heading}>{t.children.add}</Text>
      <Field label={t.children.nameLabel} value={name} onChangeText={setName} maxLength={30} />
      <Text style={styles.label}>{t.children.colorLabel}</Text>
      <View style={styles.palette}>
        {PALETTE.map((hex) => (
          <Pressable
            key={hex}
            accessibilityRole="radio"
            accessibilityLabel={t.children.colors[hex]}
            accessibilityState={{ selected: hex === color }}
            onPress={() => setColor(hex)}
            style={[styles.swatch, { backgroundColor: hex }, hex === color && styles.selected]}
          />
        ))}
      </View>
      <Button label={t.children.add} onPress={save} loading={create.isPending} />
      {invalid && <Body error>{t.children.nameRequired}</Body>}
      {create.isError && <Body error>{t.common.genericError}</Body>}
    </>
  );
}

const useStyles = makeStyles((c) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  dot: { width: 28, height: 28, borderRadius: 14 },
  name: { fontSize: 22, color: c.text },
  heading: { fontSize: 24, fontWeight: '700', color: c.text, marginTop: 12 },
  label: { fontSize: 20, fontWeight: '600', color: c.text },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  swatch: { width: 52, height: 52, borderRadius: 26 },
  selected: { borderWidth: 5, borderColor: c.text },
}));
