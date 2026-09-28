import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useMyMembership } from '@/features/family/hooks';
import { groupByDay } from '@/features/occurrences/days';
import { useOccurrences } from '@/features/occurrences/hooks';
import { OccurrenceItem } from '@/features/occurrences/OccurrenceItem';
import { Body, Button, colors, Loading, Screen } from '@/ui/components';
import { t } from '@/ui/strings';

/** Today 00:00 up to 14 days later (stable for the whole day, so the query key is too). */
function nextTwoWeeks() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return [from, new Date(from.getFullYear(), from.getMonth(), from.getDate() + 14)] as const;
}

export default function UpcomingScreen() {
  const { family, myId, isParent } = useMyMembership();
  const [[from, to]] = useState(nextTwoWeeks);
  const occurrences = useOccurrences(family?.id, from, to);

  if (occurrences.isPending) return <Loading />;
  if (occurrences.isError) {
    return (
      <Screen>
        <Body error>{t.common.genericError}</Body>
        <Button label={t.common.retry} onPress={() => occurrences.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen>
      {occurrences.data.length === 0 && <Body>{t.occurrences.none}</Body>}
      {groupByDay(occurrences.data, new Date()).map((day) => (
        <View key={day.label} style={styles.day}>
          <Text style={styles.dayLabel}>{day.label}</Text>
          {day.items.map((o) => (
            <OccurrenceItem
              key={o.id}
              occurrence={o}
              dayLabel={day.label}
              myId={myId}
              isParent={isParent}
            />
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  day: { gap: 10 },
  dayLabel: { fontSize: 20, fontWeight: '700', color: colors.muted, marginTop: 8 },
});
