import { supabase } from '@/lib/supabase/client';

/**
 * Where the confirmation email's button sends the customer. Supabase only honours
 * a redirect that is on its allow-list; otherwise it falls back to the Site URL,
 * which still signs them in (the session is read from the link), so a missing
 * entry degrades gracefully instead of breaking sign-up.
 */
export function confirmRedirectUrl(): string {
  return `${window.location.origin}/auth/confirmed`;
}

export type ResendResult = { ok: true } | { ok: false; message: string };

/** Ask Supabase to send the sign-up confirmation email again. */
export async function resendConfirmation(email: string): Promise<ResendResult> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim(),
    options: { emailRedirectTo: confirmRedirectUrl() },
  });
  if (!error) return { ok: true };

  const msg = (error.message || '').toLowerCase();
  if (msg.includes('rate limit') || msg.includes('too many') || msg.includes('seconds')) {
    return { ok: false, message: 'Please wait a minute before asking for another email.' };
  }
  return { ok: false, message: 'We could not send the email. Please try again shortly.' };
}

/** True when signUp() did not create a session because the email must be confirmed first. */
export function needsEmailConfirmation(data: { session: unknown | null } | null | undefined): boolean {
  return !!data && !data.session;
}

/**
 * With "Confirm email" on, Supabase answers a sign-up for an address that already
 * has an account with a user that has no identities (and no error), so it never
 * reveals which emails exist. We use that to tell the customer to sign in instead.
 */
export function isExistingAccountResponse(data: { user?: { identities?: unknown[] | null } | null } | null | undefined): boolean {
  const identities = data?.user?.identities;
  return Array.isArray(identities) && identities.length === 0;
}
