import { useState } from 'react';

import { addMonths, dayKey, fromDayKey, startOfToday } from '@/features/occurrences/month';
import { MonthGrid, MonthHeader } from '@/features/occurrences/MonthGrid';
import { Button } from '@/ui/components';
import { t } from '@/ui/strings';

import { PickerField } from './PickerField';

/** "Dienstag, 06.10.2026" */
export const longDate = (d: Date) =>
  `${t.events.weekdays[d.getDay()]}, ${dayKey(d).split('-').reverse().join('.')}`;

/**
 * Date input that opens a month picker instead of a keyboard.
 * `value` / `onChange` use "YYYY-MM-DD"; '' means no date.
 */
export function DateField({
  label,
  value,
  onChange,
  clearLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** If set, a button to remove the date is shown (for optional dates). */
  clearLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => addMonths(value ? fromDayKey(value) : new Date(), 0));
  const selected = value ? fromDayKey(value) : null;

  return (
    <PickerField
      label={label}
      text={selected && longDate(selected)}
      placeholder={t.dateField.choose}
      open={open}
      onOpen={() => {
        setMonth(addMonths(selected ?? new Date(), 0));
        setOpen(true);
      }}
      onClose={() => setOpen(false)}
      footer={
        clearLabel &&
        selected && <Button label={clearLabel} variant="secondary" onPress={() => onChange('')} />
      }
    >
      <MonthHeader
        month={month}
        onPrevious={() => setMonth(addMonths(month, -1))}
        onNext={() => setMonth(addMonths(month, 1))}
      />
      <MonthGrid
        month={month}
        today={startOfToday()}
        selected={selected}
        onSelect={(day) => {
          onChange(dayKey(day));
          setOpen(false);
        }}
      />
      <Button label={t.common.cancel} variant="secondary" onPress={() => setOpen(false)} />
    </PickerField>
  );
}
