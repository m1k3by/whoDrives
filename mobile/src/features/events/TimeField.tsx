import { useState } from 'react';
import { Text } from 'react-native';

import { Button, Chip, ChipGrid } from '@/ui/components';
import { t } from '@/ui/strings';

import { PickerField } from './PickerField';
import { makeStyles } from '@/ui/theme';

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Time input with an hour grid and 5-minute steps instead of a keyboard.
 * `value` / `onChange` use "HH:MM"; '' means no time chosen.
 */
export function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState<number | null>(null);
  const [minute, setMinute] = useState<number | null>(null);

  function show() {
    const [h, m] = value ? value.split(':').map(Number) : [null, null];
    setHour(h);
    setMinute(m);
    setOpen(true);
  }

  const complete = hour !== null && minute !== null;
  return (
    <PickerField
      label={label}
      text={value ? `${value} Uhr` : null}
      placeholder={t.timeField.choose}
      open={open}
      onOpen={show}
      onClose={() => setOpen(false)}
    >
      <Text style={styles.preview}>
        {hour !== null ? pad(hour) : '--'}:{minute !== null ? pad(minute) : '--'} Uhr
      </Text>

      <Text style={styles.section}>{t.timeField.hour}</Text>
      <ChipGrid>
        {HOURS.map((h) => (
          <Chip
            key={h}
            label={pad(h)}
            a11y={t.timeField.hourA11y(h)}
            selected={h === hour}
            onPress={() => setHour(h)}
          />
        ))}
      </ChipGrid>

      <Text style={styles.section}>{t.timeField.minute}</Text>
      <ChipGrid>
        {MINUTES.map((m) => (
          <Chip
            key={m}
            label={`:${pad(m)}`}
            a11y={t.timeField.minuteA11y(m)}
            selected={m === minute}
            onPress={() => setMinute(m)}
          />
        ))}
      </ChipGrid>

      <Button
        label={t.timeField.apply}
        onPress={() => {
          if (!complete) return;
          onChange(`${pad(hour)}:${pad(minute)}`);
          setOpen(false);
        }}
      />
      {!complete && <Text style={styles.hint}>{t.timeField.incomplete}</Text>}
      <Button label={t.common.cancel} variant="secondary" onPress={() => setOpen(false)} />
    </PickerField>
  );
}

const useStyles = makeStyles((c) => ({
  preview: { fontSize: 36, fontWeight: '700', textAlign: 'center', color: c.text },
  section: { fontSize: 18, fontWeight: '700', color: c.muted },
  hint: { fontSize: 18, color: c.muted, textAlign: 'center' },
}));
