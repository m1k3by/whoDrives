import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, type ListRenderItem, useWindowDimensions, View } from 'react-native';

import { colors } from '@/ui/components';

import { useOccurrences } from './hooks';
import { addMonths, dayKey, startOfToday } from './month';
import { MonthGrid, MonthHeader } from './MonthGrid';

const MONTHS_BACK = 1;
const MONTHS_AHEAD = 12; // occurrences are precomputed 12 months ahead
const SCREEN_PADDING = 24; // horizontal padding of <Screen>

const sameMonth = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

/** Today if it lies in `month`, otherwise the first of the month. */
const defaultDay = (month: Date, today: Date) => (sameMonth(month, today) ? today : month);

/** Swipeable month calendar with dots for days that have occurrences. */
export function MonthCalendar({
  familyId,
  selected,
  onSelect,
}: {
  familyId: string;
  selected: Date;
  onSelect: (day: Date) => void;
}) {
  const pageWidth = useWindowDimensions().width - 2 * SCREEN_PADDING;
  const [today] = useState(startOfToday);
  const months = useMemo(
    () =>
      Array.from({ length: MONTHS_BACK + MONTHS_AHEAD + 1 }, (_, i) =>
        addMonths(today, i - MONTHS_BACK),
      ),
    [today],
  );
  const [index, setIndex] = useState(MONTHS_BACK);
  const list = useRef<FlatList<Date>>(null);

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

  function showMonth(i: number, scroll: boolean) {
    if (i < 0 || i >= months.length || i === index) return;
    if (scroll) list.current?.scrollToIndex({ index: i });
    setIndex(i);
    onSelect(defaultDay(months[i], today));
  }

  return (
    <View>
      <MonthHeader
        month={months[index]}
        onPrevious={() => showMonth(index - 1, true)}
        onNext={() => showMonth(index + 1, true)}
        previousDisabled={index === 0}
        nextDisabled={index === months.length - 1}
      />
      <FlatList
        ref={list}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={months}
        keyExtractor={dayKey}
        initialScrollIndex={MONTHS_BACK}
        getItemLayout={(_, i) => ({ length: pageWidth, offset: pageWidth * i, index: i })}
        onMomentumScrollEnd={(e) =>
          showMonth(Math.round(e.nativeEvent.contentOffset.x / pageWidth), false)
        }
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

  // Colors of the children with something on that day (cancelled ones don't count)
  const dots = useMemo(() => {
    const byDay = new Map<string, string[]>();
    for (const o of occurrences.data ?? []) {
      if (o.status === 'cancelled') continue;
      const key = dayKey(new Date(o.starts_at));
      const list = byDay.get(key) ?? [];
      const color = o.events?.children?.color ?? colors.muted;
      if (!list.includes(color)) list.push(color);
      byDay.set(key, list);
    }
    return byDay;
  }, [occurrences.data]);

  return (
    <MonthGrid month={month} today={today} selected={selected} onSelect={onSelect} dots={dots} />
  );
});
