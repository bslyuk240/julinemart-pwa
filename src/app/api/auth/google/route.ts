import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  // Instantiate inside the handler so env vars are not required at build time
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { credential } = await request.json();
    if (!credential) {
      return NextResponse.json({ success: false, message: 'No credential provided' }, { status: 400 });
    }

    // Verify Google ID token server-side using Google's tokeninfo endpoint.
    // Client-side verification alone cannot be trusted — anyone can forge a JWT payload.
    const tokenInfoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    if (!tokenInfoRes.ok) {
      return NextResponse.json({ success: false, message: 'Invalid Google credential.' }, { status: 401 });
    }
    const googleUser = await tokenInfoRes.json();

    // Confirm the token was issued for this app's client ID
    const expectedAudiences = [
      process.env.NEXT_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    ].filter(Boolean);
    if (expectedAudiences.length > 0 && !expectedAudiences.includes(googleUser.aud)) {
      return NextResponse.json({ success: false, message: 'Token audience mismatch.' }, { status: 401 });
    }

    const { email, given_name: firstName, family_name: lastName, name: fullName, picture: avatarUrl, sub: googleId } = googleUser;

    if (!email) {
      return NextResponse.json({ success: false, message: 'No email in Google account' }, { status: 400 });
    }

    const userFirstName = firstName || (fullName ? fullName.split(' ')[0] : '');
    const userLastName = lastName || (fullName ? fullName.split(' ').slice(1).join(' ') : '');

    // Attempt to create the user. If the email already exists (regardless of
    // how many users are in the DB, listUsers pagination is unreliable), we
    // treat it as an existing-user sign-in instead.
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        first_name: userFirstName,
        last_name: userLastName,
        avatar_url: avatarUrl || '',
        google_id: googleId,
      },
    });

    // Determine the user we're working with (new or existing)
    type AuthUser = { id: string; email?: string; user_metadata?: Record<string, unknown> };
    let resolvedUser: AuthUser | null = newUser?.user ?? null;
    let isNewUser = !!resolvedUser;

    if (createErr) {
      const isAlreadyExists =
        createErr.message?.toLowerCase().includes('already') ||
        createErr.message?.toLowerCase().includes('registered') ||
        createErr.message?.toLowerCase().includes('exists');

      if (!isAlreadyExists) {
        return NextResponse.json({ success: false, message: createErr.message || 'Failed to create account' }, { status: 500 });
      }

      // User exists — find them via paginated listUsers
      // We scan up to 5 pages (500 users) to locate the account
      let found: AuthUser | undefined;
      for (let page = 1; page <= 5 && !found; page++) {
        const { data: pageData } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 });
        found = pageData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
      }
      if (!found) {
        return NextResponse.json({ success: false, message: 'Failed to locate account' }, { status: 500 });
      }
      resolvedUser = found;
      isNewUser = false;
    }

    if (!resolvedUser) {
      return NextResponse.json({ success: false, message: 'Failed to create account' }, { status: 500 });
    }

    // Update avatar for existing users who don't have one yet
    if (!isNewUser && avatarUrl && !resolvedUser.user_metadata?.avatar_url) {
      await supabaseAdmin.auth.admin.updateUserById(resolvedUser.id, {
        user_metadata: { ...resolvedUser.user_metadata, avatar_url: avatarUrl },
      });
      await supabaseAdmin.from('customers').update({ avatar_url: avatarUrl }).eq('id', resolvedUser.id);
    }

    // Generate a magic-link token to establish a real Supabase session client-side
    const { data: sessionData, error: sessionErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
    if (sessionErr || !sessionData) {
      return NextResponse.json({ success: false, message: isNewUser ? 'Account created but session failed' : 'Failed to generate session' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      action: isNewUser ? 'signup' : 'login',
      token_hash: sessionData.properties?.hashed_token,
      email,
      ...(isNewUser && { first_name: userFirstName }),
    });
  } catch (error: any) {
    console.error('Google auth error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Authentication failed' }, { status: 500 });
  }
}
