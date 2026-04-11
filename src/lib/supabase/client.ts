'use client';
import { createClient } from '@supabase/supabase-js';

function deriveProjectRefFromAnonKey(anonKey?: string) {
  if (!anonKey) return null;

  const parts = anonKey.split('.');
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payloadJson =
      decodeURIComponent(
        Array.from(atob(padded), (char) =>
          `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`
        ).join('')
      );
    const payload = JSON.parse(payloadJson) as { ref?: unknown };
    return typeof payload.ref === 'string' && payload.ref ? payload.ref : null;
  } catch {
    return null;
  }
}

function resolveSupabaseUrl() {
  const explicitUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || null;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const projectRef = deriveProjectRefFromAnonKey(anonKey);

  if (!projectRef) return explicitUrl;
  if (!explicitUrl) return `https://${projectRef}.supabase.co`;

  try {
    const hostname = new URL(explicitUrl).hostname;
    if (hostname.includes(projectRef)) return explicitUrl;
  } catch {
    // Fall through to derived URL.
  }

  return `https://${projectRef}.supabase.co`;
}

const supabaseUrl = resolveSupabaseUrl()!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton browser client — safe to import in any client component
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
