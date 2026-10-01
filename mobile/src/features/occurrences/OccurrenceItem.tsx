import { Alert, Pressable, Text, View } from 'react-native';

import { addToPhoneCalendar, occurrenceEntry } from '@/features/events/calendar';
import { childNames } from '@/features/events/form';
import { openInMaps } from '@/lib/links';

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
import { font, makeStyles, radius, raised, useColors } from '@/ui/theme';

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
  const kids = o.events?.event_children ?? [];
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
      <Text style={[styles.title, cancelled && styles.strike]}>
        {timeLabel(new Date(o.starts_at))} {title}
      </Text>
      {kids.length > 0 && (
        <View style={styles.kids}>
          {kids.map((k) => (
            <View key={k.first_name} style={styles.kid}>
              <View style={[styles.childDot, { backgroundColor: k.color }]} />
              <Text style={styles.kidName}>{k.first_name}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={styles.line}>
        {cancelled
          ? t.occurrences.cancelled
          : `${t.events.kinds[o.events?.kind ?? 'other']} · ${t.occurrences.until(timeLabel(new Date(o.ends_at)))}`}
      </Text>
      {!cancelled && o.events?.location && (
        <Text
          accessibilityRole="link"
          accessibilityHint={t.occurrences.openMaps}
          onPress={() => openInMaps(o.events!.location!)}
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
                title: kids.length ? `${title} (${childNames(kids)})` : title,
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
  location: { fontSize: font.small, color: c.primary, fontWeight: '500' },
  // card on the grey background; the colored left edge shows the status
  item: {
    backgroundColor: c.surface,
    borderRadius: radius.card,
    borderLeftWidth: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
    ...raised,
  },
  kids: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4 },
  kid: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kidName: { fontSize: font.small, color: c.muted },
  childDot: { width: 10, height: 10, borderRadius: 5 },
  cancelled: { opacity: 0.55 },
  strike: { textDecorationLine: 'line-through' },
  title: { fontSize: font.heading, fontWeight: '600', color: c.text },
  line: { fontSize: font.small, color: c.muted },
  status: { fontSize: font.small, fontWeight: '600' },
  actions: { gap: 8, marginTop: 4 },
  error: { fontSize: font.small, color: c.error },
}));
