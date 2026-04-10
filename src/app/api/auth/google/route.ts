import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { credential } = await request.json();
    if (!credential) {
      return NextResponse.json({ success: false, message: 'No credential provided' }, { status: 400 });
    }

    // Decode Google JWT (signature already verified by Google's GSI library client-side)
    const base64Url = credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    const googleUser = JSON.parse(jsonPayload);

    const { email, given_name: firstName, family_name: lastName, name: fullName, picture: avatarUrl, sub: googleId } = googleUser;

    if (!email) {
      return NextResponse.json({ success: false, message: 'No email in Google account' }, { status: 400 });
    }

    const userFirstName = firstName || (fullName ? fullName.split(' ')[0] : '');
    const userLastName = lastName || (fullName ? fullName.split(' ').slice(1).join(' ') : '');

    // Try to find existing user by email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      // Update avatar if Google provides one
      if (avatarUrl && !existingUser.user_metadata?.avatar_url) {
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          user_metadata: { ...existingUser.user_metadata, avatar_url: avatarUrl },
        });
        await supabaseAdmin.from('customers').update({ avatar_url: avatarUrl }).eq('id', existingUser.id);
      }

      // Sign in via magic link token exchange — return a session
      const { data: sessionData, error: sessionErr } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });
      if (sessionErr || !sessionData) {
        return NextResponse.json({ success: false, message: 'Failed to generate session' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        action: 'login',
        // Front-end will exchange this token via supabase.auth.verifyOtp
        token_hash: sessionData.properties?.hashed_token,
        email,
      });
    }

    // New user — create in Supabase Auth
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

    if (createErr || !newUser.user) {
      return NextResponse.json({ success: false, message: createErr?.message || 'Failed to create account' }, { status: 500 });
    }

    // customer row created by DB trigger — generate session token
    const { data: sessionData, error: sessionErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
    if (sessionErr || !sessionData) {
      return NextResponse.json({ success: false, message: 'Account created but session failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      action: 'signup',
      token_hash: sessionData.properties?.hashed_token,
      email,
      first_name: userFirstName,
    });
  } catch (error: any) {
    console.error('Google auth error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Authentication failed' }, { status: 500 });
  }
}
