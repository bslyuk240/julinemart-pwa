import { createClient } from '@supabase/supabase-js';

function toBase64(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;
  if (!padding) return normalized;
  return `${normalized}${'='.repeat(4 - padding)}`;
}

function deriveProjectRefFromAnonKey(anonKey?: string) {
  if (!anonKey) return null;

  const parts = anonKey.split('.');
  if (parts.length < 2) return null;

  try {
    const payloadJson = Buffer.from(toBase64(parts[1]), 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson) as { ref?: unknown };
    return typeof payload.ref === 'string' && payload.ref ? payload.ref : null;
  } catch {
    return null;
  }
}

export function resolveSupabaseUrlFromEnv() {
  const explicitUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (explicitUrl) return explicitUrl;

  const projectRef = deriveProjectRefFromAnonKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return projectRef ? `https://${projectRef}.supabase.co` : null;
}

export function getSupabaseServerClient() {
  const supabaseUrl = resolveSupabaseUrlFromEnv();
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase environment variables are not configured. Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY).'
    );
  }

  return createClient(supabaseUrl, supabaseKey);
}
