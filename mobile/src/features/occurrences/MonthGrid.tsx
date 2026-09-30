import { Pressable, Text, View } from 'react-native';

import { t } from '@/ui/strings';

import { dayKey, monthGrid } from './month';
import { toneColor, type Tone } from './tone';
import { makeStyles, useColors } from '@/ui/theme';

// Building blocks shared by the home calendar and the date picker field.

export function MonthHeader({
  month,
  onPrevious,
  onNext,
  previousDisabled = false,
  nextDisabled = false,
}: {
  month: Date;
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
}) {
  const styles = useStyles();
  return (
    <>
      <View style={styles.header}>
        <ArrowButton
          label="‹"
          a11y={t.calendar.previous}
          disabled={previousDisabled}
          onPress={onPrevious}
        />
        <Text accessibilityRole="header" style={styles.monthLabel}>
          {t.calendar.months[month.getMonth()]} {month.getFullYear()}
        </Text>
        <ArrowButton label="›" a11y={t.calendar.next} disabled={nextDisabled} onPress={onNext} />
      </View>
      <WeekdayRow />
    </>
  );
}

export function WeekdayRow() {
  const styles = useStyles();
  return (
    <View style={styles.week}>
      {t.calendar.weekdaysShort.map((d) => (
        <Text key={d} style={styles.weekday}>
          {d}
        </Text>
      ))}
    </View>
  );
}

/** Day grid of one month, always six rows (stable height). `dots`: status per dayKey. */
export function MonthGrid({
  month,
  today,
  selected,
  onSelect,
  dots,
}: {
  month: Date;
  today: Date;
  selected: Date | null;
  onSelect: (day: Date) => void;
  dots?: Map<string, Tone[]>;
}) {
  const styles = useStyles();
  const c = useColors();
  const weeks = monthGrid(month);
  while (weeks.length < 6) weeks.push(Array<null>(7).fill(null));
  const selectedKey = selected && dayKey(selected);
  const todayKey = dayKey(today);

  return (
    <>
      {weeks.map((week, w) => (
        <View key={w} style={styles.week}>
          {week.map((day, d) => {
            if (!day) return <View key={d} style={styles.cell} />;
            const key = dayKey(day);
            const isSelected = key === selectedKey;
            const dayDots = dots?.get(key) ?? [];
            return (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={t.calendar.dayA11y(
                  day,
                  dayDots.filter((d) => d === 'open').length,
                  dayDots.filter((d) => d === 'covered').length,
                )}
                onPress={() => onSelect(day)}
                style={styles.cell}
              >
                <View
                  style={[
                    styles.dayCircle,
                    key === todayKey && styles.today,
                    isSelected && styles.selected,
                  ]}
                >
                  <Text style={[styles.dayNumber, isSelected && styles.selectedNumber]}>
                    {day.getDate()}
                  </Text>
                </View>
                <View style={styles.dots}>
                  {dayDots.slice(0, 3).map((tone, i) => (
                    <View key={i} style={[styles.dot, { backgroundColor: toneColor(c, tone) }]} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </>
  );
}

function ArrowButton({
  label,
  a11y,
  disabled,
  onPress,
}: {
  label: string;
  a11y: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.arrow, disabled && styles.arrowDisabled]}
    >
      <Text style={styles.arrowLabel}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthLabel: { fontSize: 24, fontWeight: '700', color: c.text },
  arrow: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowDisabled: { opacity: 0.3 },
  arrowLabel: { fontSize: 32, lineHeight: 36, color: c.primary, fontWeight: '700' },
  week: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: c.muted,
    paddingVertical: 8,
  },
  cell: { flex: 1, alignItems: 'center', minHeight: 56, paddingTop: 2 },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  today: { borderWidth: 2, borderColor: c.primary },
  selected: { backgroundColor: c.primary },
  dayNumber: { fontSize: 20, color: c.text },
  selectedNumber: { color: c.onPrimary, fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 3, height: 10, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
}));
