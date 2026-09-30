import { useState } from 'react';
import { Text, View } from 'react-native';

import { useMyMembership } from '@/features/family/hooks';
import { groupByDay } from '@/features/occurrences/days';
import { filterOccurrences, type OccurrenceFilter } from '@/features/occurrences/filter';
import { useOccurrences } from '@/features/occurrences/hooks';
import { OccurrenceItem } from '@/features/occurrences/OccurrenceItem';
import { Body, Button, Chip, ChipGrid, Loading, Screen } from '@/ui/components';
import { t } from '@/ui/strings';
import { makeStyles } from '@/ui/theme';

const FILTERS: OccurrenceFilter[] = ['all', 'open', 'mine'];

/** Today 00:00 up to 14 days later (stable for the whole day, so the query key is too). */
function nextTwoWeeks() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return [from, new Date(from.getFullYear(), from.getMonth(), from.getDate() + 14)] as const;
}

/** Overview: who does what in the next 14 days, filtered by all / open / mine. */
export default function UpcomingScreen() {
  const styles = useStyles();
  const { family, myId } = useMyMembership();
  const [[from, to]] = useState(nextTwoWeeks);
  const [filter, setFilter] = useState<OccurrenceFilter>('all');
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

  const now = new Date();
  const shown = filterOccurrences(occurrences.data, filter, myId, now);
  return (
    <Screen>
      <ChipGrid>
        {FILTERS.map((f) => (
          <Chip
            key={f}
            basis="30%"
            label={t.overview.filters[f](filterOccurrences(occurrences.data, f, myId, now).length)}
            selected={f === filter}
            onPress={() => setFilter(f)}
          />
        ))}
      </ChipGrid>
      {shown.length === 0 && <Body>{t.overview.empty[filter]}</Body>}
      {groupByDay(shown, now).map((day) => (
        <View key={day.label} style={styles.day}>
          <Text style={styles.dayLabel}>{day.label}</Text>
          {day.items.map((o) => (
            <OccurrenceItem key={o.id} occurrence={o} dayLabel={day.label} myId={myId} />
          ))}
        </View>
      ))}
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  day: { gap: 10 },
  dayLabel: { fontSize: 20, fontWeight: '700', color: c.muted, marginTop: 8 },
}));
