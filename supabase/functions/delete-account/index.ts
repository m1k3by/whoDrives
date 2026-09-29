// Deletes the calling user's account. Everything personal goes with it via foreign keys
// (profile, memberships, push tokens, messages); claimed occurrences stay as
// "ehemaliges Mitglied". See migration 20261004000000_account_deletion.sql.
import { withSupabase } from 'npm:@supabase/server@1';

export default {
  fetch: withSupabase({ auth: 'user' }, async (_req, ctx) => {
    const userId = ctx.userClaims?.id;
    if (!userId) return Response.json({ error: 'not_logged_in' }, { status: 401 });

    const { error } = await ctx.supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      console.error('delete account failed', error);
      return Response.json({ error: 'internal' }, { status: 500 });
    }
    return Response.json({ deleted: true });
  }),
};
