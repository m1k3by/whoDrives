// Sends waiting messages from notification_outbox via the Expo push service.
// Called every minute by pg_cron (deliver_notifications) with the project's secret key.
import { withSupabase } from 'npm:@supabase/server@1';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH = 100; // Expo accepts at most 100 messages per request

type Ticket = { status: 'ok' | 'error'; details?: { error?: string } };

export default {
  fetch: withSupabase({ auth: 'secret' }, async (_req, ctx) => {
    const db = ctx.supabaseAdmin;

    const { data: rows, error } = await db
      .from('notification_outbox')
      .select('id, user_id, title, body')
      .is('sent_at', null)
      .order('created_at')
      .limit(500);
    if (error) throw error;
    if (!rows.length) return Response.json({ messages: 0 });

    const { data: tokens, error: tokenError } = await db
      .from('push_tokens')
      .select('token, user_id')
      .in('user_id', [...new Set(rows.map((r) => r.user_id))]);
    if (tokenError) throw tokenError;

    const messages = rows.flatMap((r) =>
      tokens
        .filter((t) => t.user_id === r.user_id)
        .map((t) => ({ to: t.token, title: r.title, body: r.body, sound: 'default', channelId: 'default' })),
    );

    // Only needed if "Enhanced security for push notifications" is on in Expo.
    const expoToken = Deno.env.get('EXPO_ACCESS_TOKEN');
    const deadTokens: string[] = [];
    for (let i = 0; i < messages.length; i += BATCH) {
      const batch = messages.slice(i, i + BATCH);
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(expoToken ? { Authorization: `Bearer ${expoToken}` } : {}),
        },
        body: JSON.stringify(batch),
      });
      if (!res.ok) {
        // Leave the rows unsent; the next run (one minute later) tries again.
        console.error('expo push failed', res.status, await res.text());
        return Response.json({ error: 'expo_push_failed' }, { status: 502 });
      }
      const { data: tickets } = (await res.json()) as { data: Ticket[] };
      tickets.forEach((ticket, j) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          deadTokens.push(batch[j].to);
        } else if (ticket.status === 'error') {
          console.error('push ticket error', ticket);
        }
      });
    }

    if (deadTokens.length) await db.from('push_tokens').delete().in('token', deadTokens);
    // Also rows of users without a device: nothing to deliver, do not retry forever.
    await db
      .from('notification_outbox')
      .update({ sent_at: new Date().toISOString() })
      .in('id', rows.map((r) => r.id));

    return Response.json({ messages: messages.length, removedTokens: deadTokens.length });
  }),
};
