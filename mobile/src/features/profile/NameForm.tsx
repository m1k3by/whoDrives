import { useState } from 'react';

import { Body, Button, Field } from '@/ui/components';
import { t } from '@/ui/strings';

import { useUpdateDisplayName } from './hooks';

export function NameForm({
  profileId,
  initialName,
  onSaved,
}: {
  profileId: string;
  initialName: string;
  onSaved?: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [invalid, setInvalid] = useState(false);
  const update = useUpdateDisplayName();

  function save() {
    if (!name.trim()) return setInvalid(true);
    setInvalid(false);
    update.mutate({ id: profileId, name }, { onSuccess: onSaved });
  }

  return (
    <>
      <Field
        label={t.profile.nameLabel}
        placeholder={t.profile.namePlaceholder}
        value={name}
        onChangeText={setName}
        maxLength={50}
        autoCapitalize="words"
        onSubmitEditing={save}
      />
      <Button label={t.profile.save} onPress={save} loading={update.isPending} />
      {invalid && <Body error>{t.profile.nameRequired}</Body>}
      {update.isError && <Body error>{t.common.genericError}</Body>}
      {update.isSuccess && !onSaved && <Body>{t.profile.saved}</Body>}
    </>
  );
}
