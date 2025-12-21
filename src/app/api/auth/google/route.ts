// src/app/api/auth/google/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { searchCustomerByEmail, createCustomer } from '@/lib/woocommerce/customers';
import { AuthResult } from '@/lib/woocommerce/auth';

export async function POST(request: NextRequest) {
  try {
    const { credential } = await request.json();

    if (!credential) {
      return NextResponse.json(
        { success: false, message: 'No credential provided' },
        { status: 400 }
      );
    }

    // Decode the JWT token from Google
    const base64Url = credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const googleUser = JSON.parse(jsonPayload);

    // Extract user information from Google token
    const {
      email,
      given_name: firstName,
      family_name: lastName,
      name: fullName,
      picture: profilePicture,
      sub: googleId,
    } = googleUser;

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'No email in Google account' },
        { status: 400 }
      );
    }

    // Check if customer already exists in WooCommerce
    let customer = await searchCustomerByEmail(email);

    if (customer) {
      // Customer exists - log them in
      const result: AuthResult = {
        success: true,
        customerId: customer.id,
        customer: customer,
        message: 'Login successful',
      };

      return NextResponse.json(result);
    }

    // Customer doesn't exist - create new account
    // Split full name if first/last name not provided
    let userFirstName = firstName || '';
    let userLastName = lastName || '';

    if (!userFirstName && !userLastName && fullName) {
      const nameParts = fullName.split(' ');
      userFirstName = nameParts[0] || '';
      userLastName = nameParts.slice(1).join(' ') || '';
    }

    // Generate username from email
    const username = email.split('@')[0] + Math.random().toString(36).substring(2, 6);

    // Generate a secure random password (user won't need it for Google sign-in)
    const randomPassword =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      'A1!';

    // Create new WooCommerce customer
    const newCustomer = await createCustomer({
      email: email,
      first_name: userFirstName,
      last_name: userLastName,
      username: username,
      password: randomPassword,
      billing: {
        first_name: userFirstName,
        last_name: userLastName,
        email: email,
        phone: '',
        address_1: '',
        address_2: '',
        city: '',
        state: '',
        postcode: '',
        country: 'NG',
        company: '',
      },
      shipping: {
        first_name: userFirstName,
        last_name: userLastName,
        address_1: '',
        address_2: '',
        city: '',
        state: '',
        postcode: '',
        country: 'NG',
        company: '',
      },
    });

    if (!newCustomer) {
      return NextResponse.json(
        { success: false, message: 'Failed to create account' },
        { status: 500 }
      );
    }

    // Store Google ID in customer meta data for future reference
    // This can be used to link the Google account to the WooCommerce customer
    // You can enhance this later to update customer meta with Google ID

    const result: AuthResult = {
      success: true,
      customerId: newCustomer.id,
      customer: newCustomer,
      message: 'Account created successfully',
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Google auth error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Authentication failed',
      },
      { status: 500 }
    );
  }
}