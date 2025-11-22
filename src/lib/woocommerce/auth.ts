import { wcApi, handleApiError } from './client';
import { searchCustomerByEmail, createCustomer } from './customers';
import { Customer } from '@/types/customer';

/**
 * Authentication result interface
 */
export interface AuthResult {
  success: boolean;
  customerId?: number;
  customer?: Customer;
  message?: string;
}

/**
 * Authenticate customer with email and password
 * 
 * Note: WooCommerce REST API doesn't support password authentication directly.
 * This implementation uses a workaround by searching for the customer by email.
 * 
 * For production, you should implement one of these solutions:
 * 1. Use WordPress REST API with JWT Authentication plugin
 * 2. Create a custom WordPress endpoint for authentication
 * 3. Use a third-party authentication service
 * 
 * Current implementation is for demonstration purposes only.
 */
export async function authenticateCustomer(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    // Search for customer by email
    const customer = await searchCustomerByEmail(email);
    
    if (!customer) {
      return {
        success: false,
        message: 'Invalid email or password',
      };
    }

    // In a real implementation, you would verify the password here
    // For now, we're just checking if the customer exists
    // WARNING: This is NOT secure for production use!
    
    console.warn(
      'WARNING: Password verification is not implemented. ' +
      'This is a demo implementation only. ' +
      'Please implement proper authentication using WordPress REST API or JWT.'
    );

    // For demonstration, we'll accept any password if customer exists
    // In production, you MUST verify the password properly
    
    return {
      success: true,
      customerId: customer.id,
      customer: customer,
      message: 'Login successful',
    };
  } catch (error: any) {
    console.error('Authentication error:', error);
    return {
      success: false,
      message: 'Authentication failed. Please try again.',
    };
  }
}

/**
 * Register a new customer
 */
export async function registerCustomer(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
}): Promise<AuthResult> {
  try {
    // Check if customer already exists
    const existingCustomer = await searchCustomerByEmail(data.email);
    
    if (existingCustomer) {
      return {
        success: false,
        message: 'An account with this email already exists',
      };
    }

    // Create username from email
    const username = data.email.split('@')[0] + Math.random().toString(36).substring(2, 6);

    // Create new customer
    const newCustomer = await createCustomer({
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      username: username,
      password: data.password,
      billing: {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone || '',
        address_1: '',
        address_2: '',
        city: '',
        state: '',
        postcode: '',
        country: 'NG',
        company: '',
      },
      shipping: {
        first_name: data.firstName,
        last_name: data.lastName,
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
      return {
        success: false,
        message: 'Failed to create account. Please try again.',
      };
    }

    return {
      success: true,
      customerId: newCustomer.id,
      customer: newCustomer,
      message: 'Account created successfully',
    };
  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Handle specific WooCommerce errors
    if (error.message?.includes('email')) {
      return {
        success: false,
        message: 'Email address is already registered',
      };
    }
    
    if (error.message?.includes('username')) {
      return {
        success: false,
        message: 'Username is already taken',
      };
    }

    return {
      success: false,
      message: 'Registration failed. Please try again.',
    };
  }
}

/**
 * Validate customer email (check if it exists)
 */
export async function validateCustomerEmail(email: string): Promise<boolean> {
  try {
    const customer = await searchCustomerByEmail(email);
    return customer !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Request password reset
 * 
 * Note: This requires WordPress REST API or a custom endpoint
 * Current implementation is a placeholder
 */
export async function requestPasswordReset(email: string): Promise<AuthResult> {
  try {
    // Check if customer exists
    const customer = await searchCustomerByEmail(email);
    
    if (!customer) {
      // For security, we don't reveal if email exists
      return {
        success: true,
        message: 'If an account exists with this email, you will receive password reset instructions.',
      };
    }

    // In production, you would:
    // 1. Generate a reset token
    // 2. Store it in customer meta data
    // 3. Send email with reset link
    
    console.warn(
      'Password reset requires custom WordPress endpoint implementation. ' +
      'Please implement using WordPress REST API or a custom plugin.'
    );

    return {
      success: true,
      message: 'If an account exists with this email, you will receive password reset instructions.',
    };
  } catch (error) {
    console.error('Password reset request error:', error);
    return {
      success: false,
      message: 'Failed to process password reset request.',
    };
  }
}

/**
 * Reset password with token
 * 
 * Note: This requires WordPress REST API or a custom endpoint
 * Current implementation is a placeholder
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<AuthResult> {
  try {
    // In production, you would:
    // 1. Validate the reset token
    // 2. Find customer by token
    // 3. Update password using WordPress API
    // 4. Invalidate the token
    
    console.warn(
      'Password reset requires custom WordPress endpoint implementation. ' +
      'Please implement using WordPress REST API or a custom plugin.'
    );

    return {
      success: false,
      message: 'Password reset functionality requires custom WordPress implementation.',
    };
  } catch (error) {
    console.error('Password reset error:', error);
    return {
      success: false,
      message: 'Failed to reset password.',
    };
  }
}

/**
 * Change customer password
 * 
 * Note: This requires WordPress REST API or a custom endpoint
 * WooCommerce REST API doesn't support password changes
 */
export async function changeCustomerPassword(
  customerId: number,
  currentPassword: string,
  newPassword: string
): Promise<AuthResult> {
  try {
    // In production, you would:
    // 1. Verify current password using WordPress API
    // 2. Update to new password
    // 3. Optionally invalidate other sessions
    
    console.warn(
      'Password change requires WordPress authentication API. ' +
      'Please implement using WordPress REST API with JWT Authentication plugin ' +
      'or create a custom endpoint.'
    );

    return {
      success: false,
      message: 'Password change functionality requires WordPress authentication API.',
    };
  } catch (error) {
    console.error('Password change error:', error);
    return {
      success: false,
      message: 'Failed to change password.',
    };
  }
}

/**
 * Logout customer (client-side only)
 * This just provides a consistent interface - actual logout is handled in the auth context
 */
export function logoutCustomer(): AuthResult {
  return {
    success: true,
    message: 'Logged out successfully',
  };
}

/**
 * Verify customer session
 * In production, this would validate a JWT token or session cookie
 */
export async function verifyCustomerSession(customerId: number): Promise<boolean> {
  try {
    // Attempt to fetch customer data to verify they still exist
    const response = await wcApi.get(`customers/${customerId}`);
    return response.data !== null;
  } catch (error) {
    return false;
  }
}