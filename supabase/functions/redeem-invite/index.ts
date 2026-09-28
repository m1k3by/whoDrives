// Redeems an invite code for the calling user.
// All rules (hash, expiry, single use) live in the SQL function redeem_invite(),
// which only the service role may call; this function supplies the verified user id.
import { withSupabase } from 'npm:@supabase/server@1';

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const body = await req.json().catch(() => null);
    const code = body?.code;
    const userId = ctx.userClaims?.id;
    if (typeof code !== 'string' || code.length > 20 || !userId) {
      return Response.json({ error: 'invalid_invite' }, { status: 400 });
    }

    const { data, error } = await ctx.supabaseAdmin.rpc('redeem_invite', {
      p_code: code,
      p_user_id: userId,
    });
    if (error?.message === 'invalid_invite') {
      return Response.json({ error: 'invalid_invite' }, { status: 400 });
    }
    if (error) {
      console.error('redeem_invite failed', error);
      return Response.json({ error: 'internal' }, { status: 500 });
    }
    return Response.json({ familyId: data });
  }),
};
