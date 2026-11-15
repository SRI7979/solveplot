import { createClient } from '@/lib/supabase/server';
import { getSupabaseConfig } from '@/lib/supabase/config';
export async function GET() {
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!getSupabaseConfig()) return Response.json({ userId: null }, { headers });
  try {
    const client = await createClient();
    const { data, error } = await client.auth.getUser();
    if (error && error.name !== 'AuthSessionMissingError') return new Response(null, { status: 503, headers });
    return Response.json({ userId: data.user?.id ?? null }, { headers });
  } catch { return new Response(null, { status: 503, headers }); }
}
