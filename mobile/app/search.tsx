import { useDeferredValue, useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { useMyMembership } from '@/features/family/hooks';
import { groupByDay } from '@/features/occurrences/days';
import { useOccurrences } from '@/features/occurrences/hooks';
import { addMonths, startOfToday } from '@/features/occurrences/month';
import { OccurrenceItem } from '@/features/occurrences/OccurrenceItem';
import { searchOccurrences } from '@/features/occurrences/search';
import { Body, Loading, Screen } from '@/ui/components';
import { t } from '@/ui/strings';
import { makeStyles } from '@/ui/theme';

const MAX_RESULTS = 50;

/** Today up to 12 months ahead (occurrences are precomputed that far). */
function nextYear() {
  const from = startOfToday();
  return [from, addMonths(from, 13)] as const;
}

export default function SearchScreen() {
  const styles = useStyles();
  const { family, myId } = useMyMembership();
  const [[from, to]] = useState(nextYear);
  const [query, setQuery] = useState('');
  // Typing stays smooth; filtering follows a moment later on long lists
  const deferredQuery = useDeferredValue(query);
  const occurrences = useOccurrences(family?.id, from, to);

  const results = useMemo(
    () => searchOccurrences(occurrences.data ?? [], deferredQuery),
    [occurrences.data, deferredQuery],
  );
  const shown = results.slice(0, MAX_RESULTS);

  return (
    <Screen>
      <TextInput
        autoFocus
        value={query}
        onChangeText={setQuery}
        placeholder={t.search.placeholder}
        accessibilityLabel={t.search.title}
        returnKeyType="search"
        style={styles.input}
      />
      {occurrences.isPending && <Loading />}
      {occurrences.isError && <Body error>{t.common.genericError}</Body>}
      {!deferredQuery.trim() && <Body>{t.search.hint}</Body>}
      {!!deferredQuery.trim() && occurrences.data && results.length === 0 && (
        <Body>{t.search.none}</Body>
      )}
      {groupByDay(shown, new Date()).map((day) => (
        <View key={day.label} style={styles.day}>
          <Text style={styles.dayLabel}>{day.label}</Text>
          {day.items.map((o) => (
            <OccurrenceItem key={o.id} occurrence={o} dayLabel={day.label} myId={myId} />
          ))}
        </View>
      ))}
      {results.length > MAX_RESULTS && <Body>{t.search.more(results.length - MAX_RESULTS)}</Body>}
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  input: {
    fontSize: 22,
    minHeight: 60,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    color: c.text,
  },
  day: { gap: 10 },
  dayLabel: { fontSize: 20, fontWeight: '700', color: c.muted, marginTop: 8 },
}));
