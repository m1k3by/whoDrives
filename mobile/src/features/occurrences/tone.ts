import type { Palette } from '@/ui/theme';

/**
 * open:      nobody takes it yet and it is still ahead -> action needed (red)
 * covered:   somebody takes it (green)
 * cancelled: called off (grey)
 * missed:    over and nobody took it, nothing to do anymore (grey)
 */
export type Tone = 'open' | 'covered' | 'cancelled' | 'missed';

export function occurrenceTone(o: { status: string; ends_at: string }, now: Date): Tone {
  if (o.status === 'cancelled') return 'cancelled';
  if (o.status === 'claimed') return 'covered';
  return new Date(o.ends_at) > now ? 'open' : 'missed';
}

/** Color of a tone in the current theme */
export function toneColor(c: Palette, tone: Tone): string {
  if (tone === 'open') return c.open;
  if (tone === 'covered') return c.covered;
  return c.border;
}

/** Dots for one calendar day: open ones first (they need someone), cancelled ones left out. */
export function dayTones(tones: Tone[]): Tone[] {
  const order: Tone[] = ['open', 'covered', 'missed'];
  return tones
    .filter((tone) => tone !== 'cancelled')
    .sort((a, b) => order.indexOf(a) - order.indexOf(b));
}
