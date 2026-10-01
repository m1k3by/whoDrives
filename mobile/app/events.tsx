import { router } from 'expo-router';
import { Alert, Text, View } from 'react-native';

import { addToPhoneCalendar, seriesEntry } from '@/features/events/calendar';
import { childNames, describeSchedule } from '@/features/events/form';
import { useEvents } from '@/features/events/hooks';
import { useMyMembership } from '@/features/family/hooks';
import { Body, Button, Loading, Screen } from '@/ui/components';
import { t } from '@/ui/strings';
import { font, makeStyles, useColors } from '@/ui/theme';

export default function EventsScreen() {
  const styles = useStyles();
  const c = useColors();
  const { family } = useMyMembership();
  const events = useEvents(family?.id);

  if (events.isPending) return <Loading />;
  if (events.isError)
    return (
      <Screen>
        <Body error>{t.common.genericError}</Body>
      </Screen>
    );

  return (
    <Screen>
      <Button label={t.events.new} onPress={() => router.push('/event-new')} />
      {events.data.length === 0 && <Body>{t.events.none}</Body>}
      {events.data.map((e) => (
        <View
          key={e.id}
          style={[styles.card, { borderLeftColor: e.event_children[0]?.color ?? c.border }]}
        >
          <Text style={styles.title}>
            {e.title}
            {e.event_children.length ? ` · ${childNames(e.event_children)}` : ''}
          </Text>
          <Text style={styles.line}>{describeSchedule(e)}</Text>
          <Text style={styles.line}>
            {t.events.kinds[e.kind]} · {e.duration_min} Min.
            {e.location ? ` · ${e.location}` : ''}
          </Text>
          <Button
            label={t.events.addSeriesToCalendar}
            variant="secondary"
            onPress={() =>
              addToPhoneCalendar(
                seriesEntry({ ...e, childName: childNames(e.event_children) }),
              ).catch(() => Alert.alert(t.common.genericError))
            }
          />
        </View>
      ))}
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    borderLeftWidth: 4,
    paddingLeft: 16,
    paddingVertical: 12,
    gap: 4,
  },
  title: { fontSize: font.heading, fontWeight: '600', color: c.text },
  line: { fontSize: font.small, color: c.muted },
}));
