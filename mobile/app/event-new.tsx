import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  parseGermanDate,
  toEventInsert,
  type EventForm,
  type EventKind,
  type FormError,
} from '@/features/events/form';
import { useChildren, useCreateEvent } from '@/features/events/hooks';
import { useMyMembership } from '@/features/family/hooks';
import { Body, Button, colors, Field, Screen } from '@/ui/components';
import { t } from '@/ui/strings';

const KINDS = Object.keys(t.events.kinds) as EventKind[];

export default function NewEventScreen() {
  const { family } = useMyMembership();
  const children = useChildren(family?.id);
  const create = useCreateEvent();
  const [error, setError] = useState<FormError | null>(null);
  const [form, setForm] = useState<EventForm>({
    title: '',
    kind: 'ride',
    childId: null,
    location: '',
    weekly: true,
    firstDate: '',
    untilDate: '',
    time: '',
    durationMin: '60',
  });
  const set = (patch: Partial<EventForm>) => setForm((f) => ({ ...f, ...patch }));

  const firstDate = parseGermanDate(form.firstDate);
  const weekday = firstDate && t.events.weekdays[new Date(`${firstDate}T00:00:00Z`).getUTCDay()];

  function save() {
    if (!family) return;
    const result = toEventInsert(form, family.id);
    if (!result.ok) return setError(result.error);
    setError(null);
    create.mutate(result.value, { onSuccess: () => router.back() });
  }

  return (
    <Screen>
      <Field
        label={t.events.titleLabel}
        placeholder={t.events.titlePlaceholder}
        value={form.title}
        onChangeText={(title) => set({ title })}
        maxLength={60}
      />

      <Text style={styles.label}>{t.events.childLabel}</Text>
      {children.data?.length === 0 && <Body>{t.events.noChildren}</Body>}
      {children.data?.map((c) => (
        <Button
          key={c.id}
          label={c.first_name}
          variant={form.childId === c.id ? 'primary' : 'secondary'}
          onPress={() => set({ childId: c.id })}
        />
      ))}

      <Text style={styles.label}>{t.events.kindLabel}</Text>
      <View style={styles.row}>
        {KINDS.map((k) => (
          <View key={k} style={styles.half}>
            <Button
              label={t.events.kinds[k]}
              variant={form.kind === k ? 'primary' : 'secondary'}
              onPress={() => set({ kind: k })}
            />
          </View>
        ))}
      </View>

      <Field
        label={t.events.locationLabel}
        placeholder={t.events.locationPlaceholder}
        value={form.location}
        onChangeText={(location) => set({ location })}
        maxLength={100}
      />

      <Text style={styles.label}>{t.events.repeatLabel}</Text>
      <View style={styles.row}>
        <View style={styles.half}>
          <Button
            label={t.events.onceOption}
            variant={form.weekly ? 'secondary' : 'primary'}
            onPress={() => set({ weekly: false })}
          />
        </View>
        <View style={styles.half}>
          <Button
            label={t.events.weeklyOption}
            variant={form.weekly ? 'primary' : 'secondary'}
            onPress={() => set({ weekly: true })}
          />
        </View>
      </View>

      <Field
        label={form.weekly ? t.events.firstDateWeeklyLabel : t.events.firstDateLabel}
        placeholder="06.10.2026"
        value={form.firstDate}
        onChangeText={(firstDate) => set({ firstDate })}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
      />
      {form.weekly && weekday && <Body>{t.events.weekdayHint(weekday)}</Body>}
      {form.weekly && (
        <Field
          label={t.events.untilDateLabel}
          value={form.untilDate}
          onChangeText={(untilDate) => set({ untilDate })}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
      )}
      <Field
        label={t.events.timeLabel}
        placeholder="15:00"
        value={form.time}
        onChangeText={(time) => set({ time })}
        keyboardType="numbers-and-punctuation"
        maxLength={5}
      />
      <Field
        label={t.events.durationLabel}
        value={form.durationMin}
        onChangeText={(durationMin) => set({ durationMin })}
        keyboardType="number-pad"
        maxLength={4}
      />

      {error && <Body error>{t.events.errors[error]}</Body>}
      {create.isError && <Body error>{t.common.genericError}</Body>}
      <Button label={t.events.save} onPress={save} loading={create.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 20, fontWeight: '600', color: colors.text },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  half: { flexGrow: 1, flexBasis: '45%' },
});
