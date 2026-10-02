// Turns a spoken sentence ("Reiten mit Lena jeden Dienstag um 15 Uhr im Reitstall") into the
// fields of the "new appointment" form. Nothing is saved here: the app shows the fields
// pre-filled and the person checks and saves them. The sentence goes to Anthropic
// (see privacy page); the key is the function secret ANTHROPIC_API_KEY.
import Anthropic from 'npm:@anthropic-ai/sdk@0.131.0';
import { withSupabase } from 'npm:@supabase/server@1';

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'kind',
    'children',
    'location',
    'weekly',
    'firstDate',
    'untilDate',
    'time',
    'durationMin',
  ],
  properties: {
    title: {
      type: 'string',
      description: 'Kurzer Titel der Aktivität, ohne Kind, Datum, Uhrzeit und Ort, z. B. "Reiten"',
    },
    kind: {
      type: 'string',
      enum: ['ride', 'pickup', 'care', 'other'],
      description: 'ride = hinbringen/fahren, pickup = abholen, care = betreuen/aufpassen, sonst other',
    },
    children: {
      type: 'array',
      items: { type: 'string' },
      description: 'Vornamen aus der Kinderliste, genau so geschrieben wie dort',
    },
    location: { type: 'string', description: 'Ort oder Adresse, leer wenn nicht genannt' },
    weekly: { type: 'boolean', description: 'true bei "jeden Dienstag", "immer montags" usw.' },
    firstDate: { type: 'string', description: 'Erster Termin als YYYY-MM-DD, leer wenn unklar' },
    untilDate: { type: 'string', description: 'Letzter Termin einer Serie als YYYY-MM-DD, sonst leer' },
    time: { type: 'string', description: 'Beginn als HH:MM (24 Stunden), leer wenn nicht genannt' },
    durationMin: { type: 'integer', description: 'Dauer in Minuten, 0 wenn nicht genannt' },
  },
} as const;

const SYSTEM =
  'Du füllst das Formular einer Familien-App für Termine der Kinder aus einem gesprochenen Satz aus. ' +
  'Der Satz kommt aus einer Spracherkennung und kann Hörfehler enthalten; ordne Namen, die ähnlich ' +
  'klingen, dem passenden Kind aus der Liste zu. Rechne relative Angaben ("morgen", "nächsten ' +
  'Freitag", "jeden Dienstag") vom heutigen Datum aus; bei einer Serie ist firstDate der nächste ' +
  'passende Tag ab heute. "halb vier" am Nachmittag ist 15:30, Termine ohne Tageszeit liegen ' +
  'zwischen 7 und 20 Uhr. Was nicht gesagt wurde, bleibt leer bzw. 0 - nichts erfinden.';

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const userId = ctx.userClaims?.id;
    if (!userId) return Response.json({ error: 'not_logged_in' }, { status: 401 });

    const body = await req.json().catch(() => null);
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    if (!text || text.length > 500) return Response.json({ error: 'invalid_text' }, { status: 400 });

    // Only family members (our API key, our costs). ponytail: no per-user rate limit yet,
    // add one if usage grows.
    const { data: member } = await ctx.supabaseAdmin
      .from('family_members')
      .select('family_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (!member) return Response.json({ error: 'no_family' }, { status: 403 });
    const { data: children } = await ctx.supabaseAdmin
      .from('children')
      .select('first_name')
      .eq('family_id', member.family_id);

    const now = new Date();
    const today = new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin',
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(now);
    const todayIso = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(now);

    try {
      const response = await client.beta.messages.create({
        model: 'claude-opus-5-5',
        max_tokens: 4000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default', // a declined request is re-run on the recommended fallback model
        output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
        system: SYSTEM,
        messages: [
          {
            role: 'user',
            content:
              `Heute ist ${today} (${todayIso}).\n` +
              `Kinder: ${(children ?? []).map((c) => c.first_name).join(', ') || 'keine'}\n` +
              `Satz: ${text}`,
          },
        ],
      });
      const block = response.content.find((b) => b.type === 'text');
      if (response.stop_reason !== 'end_turn' || !block || block.type !== 'text') {
        console.error('parse-event: no usable answer', response.stop_reason);
        return Response.json({ error: 'not_understood' }, { status: 422 });
      }
      return Response.json(JSON.parse(block.text));
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        console.error('parse-event: Anthropic API error', error.status, error.message);
      } else {
        console.error('parse-event failed', error);
      }
      return Response.json({ error: 'internal' }, { status: 502 });
    }
  }),
};
