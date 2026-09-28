import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useCreateFamily, useMyFamily } from '@/features/family/hooks';
import { InvalidInviteError, useRedeemInvite } from '@/features/invites/hooks';
import { dayLabel } from '@/features/occurrences/days';
import { useLiveOccurrences, useOccurrences } from '@/features/occurrences/hooks';
import { MonthCalendar } from '@/features/occurrences/MonthCalendar';
import { addMonths, dayKey, startOfToday } from '@/features/occurrences/month';
import { OccurrenceItem } from '@/features/occurrences/OccurrenceItem';
import { NameForm } from '@/features/profile/NameForm';
import { useMyProfile } from '@/features/profile/hooks';
import { Body, Button, colors, Field, Loading, Screen, Title } from '@/ui/components';
import { t } from '@/ui/strings';

export default function HomeScreen() {
  const profile = useMyProfile();
  const family = useMyFamily();
  const [selected, setSelected] = useState(startOfToday);
  // One live subscription for all occurrence lists while the family is shown
  useLiveOccurrences(family.data?.id);

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

  const isParent = family.data.family_members.some(
    (m) => m.user_id === profile.data.id && m.role === 'parent',
  );

  return (
    <Screen>
      <Title>{family.data.name}</Title>
      <MonthCalendar familyId={family.data.id} selected={selected} onSelect={setSelected} />
      <Text style={styles.heading}>{dayLabel(selected, new Date())}</Text>
      <DayList
        familyId={family.data.id}
        day={selected}
        myId={profile.data.id}
        isParent={isParent}
      />
      <Button label={t.calendar.upcoming} onPress={() => router.push('/upcoming')} />
      <Button label={t.events.title} variant="secondary" onPress={() => router.push('/events')} />
      <Button
        label={t.children.title}
        variant="secondary"
        onPress={() => router.push('/children')}
      />
      <Button
        label={t.familyScreen.title}
        variant="secondary"
        onPress={() => router.push('/family')}
      />
      <ProfileButton />
    </Screen>
  );
}

/** Occurrences of one day; uses the (cached) query of the calendar month. */
function DayList({
  familyId,
  day,
  myId,
  isParent,
}: {
  familyId: string;
  day: Date;
  myId: string;
  isParent: boolean;
}) {
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
        <OccurrenceItem
          key={o.id}
          occurrence={o}
          dayLabel={label}
          myId={myId}
          isParent={isParent}
        />
      ))}
    </>
  );
}

// New user without family: join with an invite code, or create a family.
function CreateFamily() {
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

const styles = StyleSheet.create({
  heading: { fontSize: 24, fontWeight: '700', color: colors.text },
});
