import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, type ListRenderItem, useWindowDimensions, View } from 'react-native';

import { useColors } from '@/ui/theme';

import { useOccurrences } from './hooks';
import { addMonths, dayKey, startOfToday } from './month';
import { MonthGrid, WeekdayRow } from './MonthGrid';
import { dayTones, occurrenceTone, type Tone } from './tone';

const MONTHS_BACK = 1;
const MONTHS_AHEAD = 12; // occurrences are precomputed 12 months ahead
const CARD_MARGIN = 12; // calendar card to screen edge
const CARD_PADDING = 12; // inside the card
const SIDE_PADDING = CARD_MARGIN + CARD_PADDING;

export const sameMonth = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

/** Today if it lies in `month`, otherwise the first of the month. */
const defaultDay = (month: Date, today: Date) => (sameMonth(month, today) ? today : month);

/**
 * Swipeable month calendar with dots for days that have occurrences.
 * Always shows the month of `selected`: swiping selects a day in the new month,
 * and when `selected` jumps elsewhere (e.g. "Heute"), the calendar scrolls there.
 */
export function MonthCalendar({
  familyId,
  selected,
  onSelect,
}: {
  familyId: string;
  selected: Date;
  onSelect: (day: Date) => void;
}) {
  const c = useColors();
  const pageWidth = useWindowDimensions().width - 2 * SIDE_PADDING;
  const [today] = useState(startOfToday);
  const months = useMemo(
    () =>
      Array.from({ length: MONTHS_BACK + MONTHS_AHEAD + 1 }, (_, i) =>
        addMonths(today, i - MONTHS_BACK),
      ),
    [today],
  );
  const index = Math.max(
    0,
    months.findIndex((m) => sameMonth(m, selected)),
  );
  const list = useRef<FlatList<Date>>(null);
  const shownIndex = useRef(index);

  // Selection moved to another month from outside (e.g. "Heute"): scroll there.
  useEffect(() => {
    if (shownIndex.current === index) return;
    shownIndex.current = index;
    list.current?.scrollToIndex({ index });
  }, [index]);

  const renderMonth: ListRenderItem<Date> = useCallback(
    ({ item }) => (
      <View style={{ width: pageWidth }}>
        <MonthPage
          month={item}
          familyId={familyId}
          today={today}
          // Only the month that contains the selection gets it, so the other pages
          // keep equal props and are skipped by memo when another day is tapped.
          selected={sameMonth(selected, item) ? selected : null}
          onSelect={onSelect}
        />
      </View>
    ),
    [pageWidth, familyId, today, selected, onSelect],
  );

  // Swiped to another month: select a day there (today if it is this month).
  function onSwiped(i: number) {
    if (i < 0 || i >= months.length || i === shownIndex.current) return;
    shownIndex.current = i;
    onSelect(defaultDay(months[i], today));
  }

  return (
    <View
      style={{
        marginHorizontal: CARD_MARGIN,
        paddingHorizontal: CARD_PADDING,
        paddingBottom: 4,
        borderRadius: 20,
        backgroundColor: c.surface,
      }}
    >
      <WeekdayRow />
      <FlatList
        ref={list}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={months}
        keyExtractor={dayKey}
        initialScrollIndex={index}
        getItemLayout={(_, i) => ({ length: pageWidth, offset: pageWidth * i, index: i })}
        onMomentumScrollEnd={(e) => onSwiped(Math.round(e.nativeEvent.contentOffset.x / pageWidth))}
        renderItem={renderMonth}
        // Only the visible month and its neighbours: each page has 42 day buttons
        // and its own query; rendering all 14 months made every tap take seconds.
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
      />
    </View>
  );
}

const MonthPage = memo(function MonthPage({
  month,
  familyId,
  today,
  selected,
  onSelect,
}: {
  month: Date;
  familyId: string;
  today: Date;
  selected: Date | null;
  onSelect: (day: Date) => void;
}) {
  const occurrences = useOccurrences(familyId, month, addMonths(month, 1));

  // One dot per occurrence: red = still open, green = somebody takes it
  const dots = useMemo(() => {
    const now = new Date();
    const byDay = new Map<string, Tone[]>();
    for (const o of occurrences.data ?? []) {
      const key = dayKey(new Date(o.starts_at));
      byDay.set(key, [...(byDay.get(key) ?? []), occurrenceTone(o, now)]);
    }
    for (const [key, tones] of byDay) byDay.set(key, dayTones(tones));
    return byDay;
  }, [occurrences.data]);

  return (
    <MonthGrid month={month} today={today} selected={selected} onSelect={onSelect} dots={dots} />
  );
});
