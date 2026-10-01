import { Alert, Linking, Pressable, Text, View } from 'react-native';

import { addToPhoneCalendar, occurrenceEntry } from '@/features/events/calendar';
import { mapsUrl } from '@/lib/links';

import { Button } from '@/ui/components';
import { t } from '@/ui/strings';

import { timeLabel } from './days';
import { occurrenceTone, toneColor } from './tone';
import {
  AlreadyTakenError,
  useCancelOccurrence,
  useClaimOccurrence,
  useReleaseOccurrence,
  type Occurrence,
} from './hooks';
import { makeStyles, useColors } from '@/ui/theme';

/**
 * One occurrence in a list: who takes it, "Ich übernehme" / "Freigeben".
 * Every member cancels it by tapping the entry (all members have the same rights).
 */
export function OccurrenceItem({
  occurrence: o,
  dayLabel,
  myId,
}: {
  occurrence: Occurrence;
  dayLabel: string;
  myId: string | undefined;
}) {
  const styles = useStyles();
  const c = useColors();
  const cancel = useCancelOccurrence();
  const claim = useClaimOccurrence(myId);
  const release = useReleaseOccurrence();

  const cancelled = o.status === 'cancelled';
  const claimed = o.status === 'claimed';
  const mine = claimed && !!myId && o.assigned_to === myId;
  const over = new Date(o.ends_at) < new Date();
  const tone = occurrenceTone(o, new Date());
  const title = o.events?.title ?? '';
  const assignee = o.assigned_to
    ? o.profiles?.display_name || t.family.unnamedMember
    : t.occurrences.formerMember;
  const canCancel = !cancelled;

  function confirmRelease() {
    Alert.alert(t.occurrences.releaseTitle(assignee), t.occurrences.releaseText, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.occurrences.release, style: 'destructive', onPress: () => release.mutate(o.id) },
    ]);
  }

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
        // red = still open (someone has to act), green = somebody takes it
        { borderLeftColor: toneColor(c, tone) },
        cancelled && styles.cancelled,
      ]}
    >
      <View style={styles.titleRow}>
        {o.events?.children && (
          <View style={[styles.childDot, { backgroundColor: o.events.children.color }]} />
        )}
        <Text style={[styles.title, cancelled && styles.strike]}>
          {timeLabel(new Date(o.starts_at))} {title}
          {o.events?.children ? ` · ${o.events.children.first_name}` : ''}
        </Text>
      </View>
      <Text style={styles.line}>
        {cancelled
          ? t.occurrences.cancelled
          : `${t.events.kinds[o.events?.kind ?? 'other']} · ${t.occurrences.until(timeLabel(new Date(o.ends_at)))}`}
      </Text>
      {!cancelled && o.events?.location && (
        <Text
          accessibilityRole="link"
          accessibilityHint={t.occurrences.openMaps}
          onPress={() => Linking.openURL(mapsUrl(o.events!.location!))}
          style={styles.location}
        >
          {o.events.location}
        </Text>
      )}

      {!cancelled && !over && (
        <Text
          accessibilityRole="button"
          onPress={() =>
            addToPhoneCalendar(
              occurrenceEntry({
                title: o.events?.children ? `${title} (${o.events.children.first_name})` : title,
                location: o.events?.location ?? null,
                startsAt: o.starts_at,
                endsAt: o.ends_at,
              }),
            ).catch(() => Alert.alert(t.common.genericError))
          }
          style={styles.location}
        >
          {t.occurrences.addToCalendar}
        </Text>
      )}
      {!cancelled && (
        <Text style={[styles.status, { color: toneColor(c, tone) }]}>
          {!claimed
            ? t.occurrences.open
            : mine
              ? t.occurrences.mine
              : t.occurrences.byOther(assignee)}
        </Text>
      )}

      {!cancelled && !over && (
        <View style={styles.actions}>
          {!claimed && (
            <Button
              label={t.occurrences.claim}
              loading={claim.isPending}
              onPress={() => claim.mutate(o.id)}
            />
          )}
          {mine && (
            <Button
              label={t.occurrences.releaseMine}
              variant="secondary"
              loading={release.isPending}
              onPress={() => release.mutate(o.id)}
            />
          )}
          {claimed && !mine && (
            <Button
              label={t.occurrences.release}
              variant="secondary"
              loading={release.isPending}
              onPress={confirmRelease}
            />
          )}
        </View>
      )}

      {claim.error instanceof AlreadyTakenError && (
        <Text style={styles.error}>{t.occurrences.taken}</Text>
      )}
      {((claim.isError && !(claim.error instanceof AlreadyTakenError)) ||
        release.isError ||
        cancel.isError) && <Text style={styles.error}>{t.common.genericError}</Text>}
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  location: { fontSize: 18, color: c.primary, textDecorationLine: 'underline' },
  // card on the grey background; the colored left edge shows the status
  item: {
    backgroundColor: c.surface,
    borderRadius: 14,
    borderLeftWidth: 6,
    paddingLeft: 14,
    paddingRight: 12,
    paddingVertical: 12,
    gap: 4,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  childDot: { width: 14, height: 14, borderRadius: 7 },
  cancelled: { opacity: 0.55 },
  strike: { textDecorationLine: 'line-through' },
  title: { fontSize: 22, fontWeight: '600', color: c.text },
  line: { fontSize: 18, color: c.muted },
  status: { fontSize: 20, fontWeight: '700' },
  actions: { gap: 8, marginTop: 4 },
  error: { fontSize: 18, color: c.error },
}));
