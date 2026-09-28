import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { addMonths, dayKey, fromDayKey, startOfToday } from '@/features/occurrences/month';
import { MonthGrid, MonthHeader } from '@/features/occurrences/MonthGrid';
import { Button, colors } from '@/ui/components';
import { t } from '@/ui/strings';

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
  const text = selected ? longDate(selected) : t.dateField.choose;

  function show() {
    setMonth(addMonths(selected ?? new Date(), 0));
    setOpen(true);
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${text}`}
        onPress={show}
        style={styles.input}
      >
        <Text style={[styles.value, !selected && styles.placeholder]}>{text}</Text>
      </Pressable>
      {clearLabel && selected && (
        <Button label={clearLabel} variant="secondary" onPress={() => onChange('')} />
      )}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.label}>{label}</Text>
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
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontSize: 20, fontWeight: '600', color: colors.text },
  input: {
    minHeight: 60,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  value: { fontSize: 22, color: colors.text },
  placeholder: { color: colors.muted },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 12,
  },
  sheet: { backgroundColor: colors.background, borderRadius: 16, padding: 16, gap: 12 },
});
