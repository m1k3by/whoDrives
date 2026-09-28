import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '@/ui/components';
import { t } from '@/ui/strings';

import { timeLabel } from './days';
import { useCancelOccurrence, type Occurrence } from './hooks';

/** One occurrence in a list; parents cancel it by tapping. */
export function OccurrenceItem({
  occurrence: o,
  dayLabel,
  isParent,
}: {
  occurrence: Occurrence;
  dayLabel: string;
  isParent: boolean;
}) {
  const cancel = useCancelOccurrence();
  const cancelled = o.status === 'cancelled';
  const title = o.events?.title ?? '';
  const canCancel = isParent && !cancelled;

  return (
    <Pressable
      disabled={!canCancel}
      accessibilityRole={canCancel ? 'button' : undefined}
      accessibilityHint={canCancel ? t.occurrences.cancelHint : undefined}
      onPress={() =>
        Alert.alert(t.occurrences.cancelTitle(title, dayLabel), t.occurrences.cancelText, [
          { text: t.common.cancel, style: 'cancel' },
          { text: t.occurrences.cancel, style: 'destructive', onPress: () => cancel.mutate(o.id) },
        ])
      }
      style={[
        styles.item,
        { borderLeftColor: o.events?.children?.color ?? colors.border },
        cancelled && styles.cancelled,
      ]}
    >
      <Text style={[styles.title, cancelled && styles.strike]}>
        {timeLabel(new Date(o.starts_at))} {title}
        {o.events?.children ? ` · ${o.events.children.first_name}` : ''}
      </Text>
      <Text style={styles.line}>
        {cancelled
          ? t.occurrences.cancelled
          : `${t.events.kinds[o.events?.kind ?? 'other']} · ${t.occurrences.until(timeLabel(new Date(o.ends_at)))}` +
            (o.events?.location ? ` · ${o.events.location}` : '')}
      </Text>
      {cancel.isError && <Text style={styles.error}>{t.common.genericError}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: { borderLeftWidth: 8, paddingLeft: 14, paddingVertical: 8, gap: 2 },
  cancelled: { opacity: 0.55 },
  strike: { textDecorationLine: 'line-through' },
  title: { fontSize: 22, fontWeight: '600', color: colors.text },
  line: { fontSize: 18, color: colors.muted },
  error: { fontSize: 18, color: colors.error },
});
