import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCreateFamily, useMyFamily } from '@/features/family/hooks';
import { InvalidInviteError, useRedeemInvite } from '@/features/invites/hooks';
import { dayLabel } from '@/features/occurrences/days';
import { useLiveOccurrences, useOccurrences } from '@/features/occurrences/hooks';
import { MonthCalendar } from '@/features/occurrences/MonthCalendar';
import { addMonths, dayKey, startOfToday } from '@/features/occurrences/month';
import { OccurrenceItem } from '@/features/occurrences/OccurrenceItem';
import { NameForm } from '@/features/profile/NameForm';
import { useMyProfile } from '@/features/profile/hooks';
import { usePushRegistration } from '@/features/push/register';
import { Body, Button, Field, Loading, Screen, Title } from '@/ui/components';
import { MenuIcon, SearchIcon } from '@/ui/icons';
import { t } from '@/ui/strings';
import { font, makeStyles } from '@/ui/theme';

export default function HomeScreen() {
  const styles = useStyles();
  const profile = useMyProfile();
  const family = useMyFamily();
  const [selected, setSelected] = useState(startOfToday);
  const [calendarOpen, setCalendarOpen] = useState(true);
  // Android draws under the navigation bar: keep list end and + button above it
  const { bottom } = useSafeAreaInsets();
  // One live subscription for all occurrence lists while the family is shown
  useLiveOccurrences(family.data?.id);
  usePushRegistration(!!family.data);

  if (profile.isPending || family.isPending) return <Loading />;
  if (profile.isError || family.isError) {
    return (
      <Screen>
        <Body error>{t.common.genericError}</Body>
        <Button
          label={t.common.retry}
          onPress={() => {
            profile.refetch();
            family.refetch();
          }}
        />
      </Screen>
    );
  }
  // New users first say who they are, so others see a name in the member list.
  if (!profile.data.display_name) {
    return (
      <Screen>
        <Title>{t.profile.welcomeTitle}</Title>
        <Body>{t.profile.welcomeText}</Body>
        <NameForm profileId={profile.data.id} initialName="" onSaved={() => profile.refetch()} />
      </Screen>
    );
  }
  if (!family.data) return <CreateFamily />;

  // Fixed header and calendar on top, only the day list scrolls.
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <HomeHeader
        month={selected}
        expanded={calendarOpen}
        onToggle={() => setCalendarOpen((open) => !open)}
        onToday={() => setSelected(startOfToday())}
      />
      {calendarOpen && (
        <MonthCalendar familyId={family.data.id} selected={selected} onSelect={setSelected} />
      )}
      <ScrollView contentContainerStyle={[styles.dayList, { paddingBottom: 120 + bottom }]}>
        <Text style={styles.heading}>{dayLabel(selected, new Date())}</Text>
        <DayList familyId={family.data.id} day={selected} myId={profile.data.id} />
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.events.new}
        onPress={() => router.push({ pathname: '/event-new', params: { date: dayKey(selected) } })}
        style={({ pressed }) => [styles.fab, { bottom: 28 + bottom }, pressed && styles.pressed]}
      >
        <Text style={styles.fabLabel}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

/** Always visible: menu, month (tap to collapse/expand the calendar), search, today. */
function HomeHeader({
  month,
  expanded,
  onToggle,
  onToday,
}: {
  month: Date;
  expanded: boolean;
  onToggle: () => void;
  onToday: () => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.header}>
      <HeaderButton a11y={t.header.menu} onPress={() => router.push('/menu')}>
        <MenuIcon />
      </HeaderButton>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.header.toggleCalendar(expanded)}
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={styles.monthButton}
      >
        <Text style={styles.monthLabel} numberOfLines={1}>
          {t.calendar.months[month.getMonth()]} {month.getFullYear()} {expanded ? '▴' : '▾'}
        </Text>
      </Pressable>
      <HeaderButton a11y={t.header.search} onPress={() => router.push('/search')}>
        <SearchIcon />
      </HeaderButton>
      <HeaderButton a11y={t.header.today} onPress={onToday}>
        <Text style={styles.headerButtonLabel}>{t.header.today}</Text>
      </HeaderButton>
    </View>
  );
}

function HeaderButton({
  a11y,
  onPress,
  children,
}: {
  a11y: string;
  onPress: () => void;
  children: ReactNode;
}) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

/** Occurrences of one day; uses the (cached) query of the calendar month. */
function DayList({ familyId, day, myId }: { familyId: string; day: Date; myId: string }) {
  const month = addMonths(day, 0);
  const occurrences = useOccurrences(familyId, month, addMonths(month, 1));

  if (occurrences.isPending) return <Loading />;
  if (occurrences.isError) {
    return (
      <>
        <Body error>{t.common.genericError}</Body>
        <Button label={t.common.retry} onPress={() => occurrences.refetch()} />
      </>
    );
  }
  const items = occurrences.data.filter((o) => dayKey(new Date(o.starts_at)) === dayKey(day));
  if (items.length === 0) return <Body>{t.calendar.noneOnDay}</Body>;

  const label = dayLabel(day, new Date());
  return (
    <>
      {items.map((o) => (
        <OccurrenceItem key={o.id} occurrence={o} dayLabel={label} myId={myId} />
      ))}
    </>
  );
}

// New user without family: join with an invite code, or create a family.
function CreateFamily() {
  const styles = useStyles();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const create = useCreateFamily();
  const redeem = useRedeemInvite();

  return (
    <Screen>
      <Title>{t.family.noFamilyTitle}</Title>
      <Body>{t.family.joinText}</Body>
      <Field
        label={t.family.codeLabel}
        placeholder="ABCD-EFGH"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={12}
        onSubmitEditing={() => code.trim() && redeem.mutate(code)}
      />
      <Button
        label={t.family.join}
        loading={redeem.isPending}
        onPress={() => code.trim() && redeem.mutate(code)}
      />
      {redeem.isError && (
        <Body error>
          {redeem.error instanceof InvalidInviteError
            ? t.family.invalidCode
            : t.common.genericError}
        </Body>
      )}

      <Text style={styles.heading}>{t.family.orCreate}</Text>
      <Body>{t.family.noFamilyText}</Body>
      <Field
        label={t.family.nameLabel}
        placeholder={t.family.namePlaceholder}
        value={name}
        onChangeText={setName}
        maxLength={50}
      />
      <Button
        label={t.family.create}
        loading={create.isPending}
        onPress={() => name.trim() && create.mutate(name)}
      />
      {create.isError && <Body error>{t.common.genericError}</Body>}
      <ProfileButton />
    </Screen>
  );
}

function ProfileButton() {
  return (
    <Button label={t.profile.title} variant="secondary" onPress={() => router.push('/profile')} />
  );
}

const useStyles = makeStyles((c) => ({
  safe: { flex: 1, backgroundColor: c.background },
  heading: { fontSize: font.heading, fontWeight: '600', color: c.text },
  // bottom padding keeps the last entry clear of the + button
  dayList: { padding: 20, paddingBottom: 120, gap: 14 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  fabLabel: { fontSize: 34, lineHeight: 38, color: c.onPrimary, fontWeight: '300' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  monthButton: { flex: 1, minHeight: 52, justifyContent: 'center', paddingHorizontal: 8 },
  monthLabel: { fontSize: font.heading, fontWeight: '600', color: c.text },
  headerButton: {
    minWidth: 52,
    minHeight: 52,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
  },
  headerButtonLabel: { fontSize: font.body, fontWeight: '600', color: c.primary },
  pressed: { opacity: 0.6 },
}));
