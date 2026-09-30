import { router } from 'expo-router';

import { useMyMembership } from '@/features/family/hooks';
import { Button, Screen, Title } from '@/ui/components';
import { t } from '@/ui/strings';

const ENTRIES = [
  { label: t.calendar.upcoming, path: '/upcoming' },
  { label: t.events.title, path: '/events' },
  { label: t.children.title, path: '/children' },
  { label: t.familyScreen.title, path: '/family' },
  { label: t.profile.title, path: '/profile' },
] as const;

export default function MenuScreen() {
  const { family } = useMyMembership();
  return (
    <Screen>
      {family && <Title>{family.name}</Title>}
      {ENTRIES.map((e) => (
        <Button
          key={e.path}
          label={e.label}
          variant="secondary"
          onPress={() => router.push(e.path)}
        />
      ))}
    </Screen>
  );
}
