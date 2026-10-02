import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

import type { EventForm, EventKind } from './form';

/** Answer of the Edge Function parse-event (schema there) */
export type ParsedEvent = {
  title: string;
  kind: string;
  children: string[];
  location: string;
  weekly: boolean;
  firstDate: string;
  untilDate: string;
  time: string;
  durationMin: number;
};

const KINDS: EventKind[] = ['ride', 'pickup', 'care', 'other'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Form values from the understood sentence. Only well-formed values are taken over;
 * the rest stays empty and the person fills it in, as when typing.
 */
export function toPrefill(
  p: ParsedEvent,
  children: { id: string; first_name: string }[],
): Partial<EventForm> {
  const byName = new Map(children.map((c) => [c.first_name.trim().toLowerCase(), c.id]));
  const childIds = [
    ...new Set(p.children.map((n) => byName.get(n.trim().toLowerCase())).filter(Boolean)),
  ] as string[];
  const prefill: Partial<EventForm> = {
    title: p.title.trim().slice(0, 60),
    location: p.location.trim().slice(0, 100),
    weekly: p.weekly,
    childIds,
  };
  if (KINDS.includes(p.kind as EventKind)) prefill.kind = p.kind as EventKind;
  if (ISO_DATE.test(p.firstDate)) prefill.firstDate = p.firstDate;
  if (p.weekly && ISO_DATE.test(p.untilDate)) prefill.untilDate = p.untilDate;
  if (TIME.test(p.time)) prefill.time = p.time;
  if (Number.isInteger(p.durationMin) && p.durationMin >= 5 && p.durationMin <= 1440) {
    prefill.durationMin = String(p.durationMin);
  }
  return prefill;
}

/** Route parameter of /event-new back to form values; anything unreadable is ignored. */
export function readPrefill(param: string | undefined): Partial<EventForm> {
  if (!param) return {};
  try {
    const value = JSON.parse(param);
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

export class NotUnderstoodError extends Error {}

export async function parseSpokenEvent(text: string): Promise<ParsedEvent> {
  const { data, error } = await supabase.functions.invoke<ParsedEvent>('parse-event', {
    body: { text },
  });
  if (error instanceof FunctionsHttpError && error.context.status === 422) {
    throw new NotUnderstoodError();
  }
  if (error) throw error;
  if (!data) throw new NotUnderstoodError();
  return data;
}
