import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function getRouteUser() {
  const cookieStore = await cookies();
  const authHeader = cookieStore.get('sb-access-token')?.value;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !anonKey) return null;

  const supabase = createClient(supabaseUrl, anonKey, {
    global: {
      headers: authHeader ? { Authorization: `Bearer ${authHeader}` } : {},
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getRouteUserFromRequest(request: Request) {
  const header = request.headers.get('authorization') || request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !anonKey || !token) return null;

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
