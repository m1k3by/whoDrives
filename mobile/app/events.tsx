import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { describeSchedule } from '@/features/events/form';
import { useEvents } from '@/features/events/hooks';
import { useMyMembership } from '@/features/family/hooks';
import { Body, Button, colors, Loading, Screen } from '@/ui/components';
import { t } from '@/ui/strings';

export default function EventsScreen() {
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
          style={[styles.card, { borderLeftColor: e.children?.color ?? colors.border }]}
        >
          <Text style={styles.title}>
            {e.title}
            {e.children ? ` · ${e.children.first_name}` : ''}
          </Text>
          <Text style={styles.line}>{describeSchedule(e)}</Text>
          <Text style={styles.line}>
            {t.events.kinds[e.kind]} · {e.duration_min} Min.
            {e.location ? ` · ${e.location}` : ''}
          </Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderLeftWidth: 8,
    paddingLeft: 16,
    paddingVertical: 12,
    gap: 4,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  line: { fontSize: 18, color: colors.muted },
});
