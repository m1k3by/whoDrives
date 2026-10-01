import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { DateField } from '@/features/events/DateField';
import {
  toEventInsert,
  type EventForm,
  type EventKind,
  type FormError,
} from '@/features/events/form';
import { useChildren, useCreateEvent } from '@/features/events/hooks';
import { LocationField } from '@/features/events/LocationField';
import { TimeField } from '@/features/events/TimeField';
import { useMyMembership } from '@/features/family/hooks';
import { fromDayKey } from '@/features/occurrences/month';
import { Body, Button, Chip, ChipGrid, Field, Screen } from '@/ui/components';
import { t } from '@/ui/strings';
import { makeStyles } from '@/ui/theme';

const KINDS = Object.keys(t.events.kinds) as EventKind[];
const DURATIONS = Object.keys(t.events.durations).map(
  Number,
) as (keyof typeof t.events.durations)[];

export default function NewEventScreen() {
  const styles = useStyles();
  const { family } = useMyMembership();
  // Opened from the calendar's + button: start with the day selected there
  const { date } = useLocalSearchParams<{ date?: string }>();
  const children = useChildren(family?.id);
  const create = useCreateEvent();
  const [error, setError] = useState<FormError | null>(null);
  const [form, setForm] = useState<EventForm>({
    title: '',
    kind: 'ride',
    childId: null,
    location: '',
    weekly: true,
    firstDate: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '',
    untilDate: '',
    time: '',
    durationMin: '60',
  });
  const set = (patch: Partial<EventForm>) => setForm((f) => ({ ...f, ...patch }));

  const weekday = form.firstDate && t.events.weekdays[fromDayKey(form.firstDate).getDay()];

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

      <LocationField
        label={t.events.locationLabel}
        placeholder={t.events.locationPlaceholder}
        value={form.location}
        onChange={(location) => set({ location })}
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

      <DateField
        label={form.weekly ? t.events.firstDateWeeklyLabel : t.events.firstDateLabel}
        value={form.firstDate}
        onChange={(firstDate) => set({ firstDate })}
      />
      {form.weekly && weekday && <Body>{t.events.weekdayHint(weekday)}</Body>}
      {form.weekly && (
        <DateField
          label={t.events.untilDateLabel}
          value={form.untilDate}
          onChange={(untilDate) => set({ untilDate })}
          clearLabel={t.events.noEndDate}
        />
      )}
      <TimeField label={t.events.timeLabel} value={form.time} onChange={(time) => set({ time })} />
      <Text style={styles.label}>{t.events.durationLabel}</Text>
      <ChipGrid>
        {DURATIONS.map((minutes) => (
          <Chip
            key={minutes}
            label={t.events.durations[minutes]}
            basis="30%"
            selected={form.durationMin === String(minutes)}
            onPress={() => set({ durationMin: String(minutes) })}
          />
        ))}
      </ChipGrid>

      {error && <Body error>{t.events.errors[error]}</Body>}
      {create.isError && <Body error>{t.common.genericError}</Body>}
      <Button label={t.events.save} onPress={save} loading={create.isPending} />
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  label: { fontSize: 20, fontWeight: '600', color: c.text },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  half: { flexGrow: 1, flexBasis: '45%' },
}));
