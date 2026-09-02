'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { User, Mail, Lock, Eye, EyeOff, Phone, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import GoogleSignInButton from '@/components/auth/google-sign-in-button';
import { trackSignupSuccess } from '@/lib/gtag';

export default function SignupPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });
  // Pre-fill from a link elsewhere in the app (e.g. after a giveaway entry) —
  // read directly from window.location.search in an effect rather than
  // next/navigation's useSearchParams(), which would require wrapping this
  // page in a Suspense boundary it doesn't otherwise need.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const firstName = params.get('firstName');
    const lastName = params.get('lastName');
    const email = params.get('email');
    const phone = params.get('phone');
    if (!firstName && !lastName && !email && !phone) return;
    setFormData((prev) => ({
      ...prev,
      firstName: firstName || prev.firstName,
      lastName: lastName || prev.lastName,
      email: email || prev.email,
      phone: phone || prev.phone,
    }));
  }, []);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validationMessages = {
    firstNameRequired: 'First name is required',
    lastNameRequired: 'Last name is required',
    emailRequired: 'Email is required',
    emailInvalid: 'Invalid email address',
    phoneInvalid: 'Invalid Nigerian phone number',
    credentialRequired: 'Password is required',
    credentialTooShort: 'Password must be at least 8 characters',
    credentialWeak: 'Password must contain uppercase, lowercase, and number',
    confirmRequired: 'Please confirm your password',
    confirmMismatch: 'Passwords do not match',
    termsRequired: 'You must agree to the terms and conditions',
  } as const;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.firstName.trim()) errs.firstName = validationMessages.firstNameRequired;
    if (!formData.lastName.trim()) errs.lastName = validationMessages.lastNameRequired;
    if (!formData.email.trim()) errs.email = validationMessages.emailRequired;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = validationMessages.emailInvalid;
    if (formData.phone && !/^(\+234|0)[789]\d{9}$/.test(formData.phone.replace(/\s/g, '')))
      errs.phone = validationMessages.phoneInvalid;
    if (!formData.password) errs.password = validationMessages.credentialRequired;
    else if (formData.password.length < 8) errs.password = validationMessages.credentialTooShort;
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password))
      errs.password = validationMessages.credentialWeak;
    if (!formData.confirmPassword) errs.confirmPassword = validationMessages.confirmRequired;
    else if (formData.password !== formData.confirmPassword) errs.confirmPassword = validationMessages.confirmMismatch;
    if (!formData.agreeToTerms) errs.agreeToTerms = validationMessages.termsRequired;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) { toast.error('Please fix the errors in the form'); return; }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone || null,
          },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes('already')) {
          setErrors({ email: 'An account with this email already exists' });
          toast.error('Email already registered. Try logging in.');
        } else {
          toast.error(error.message);
        }
        return;
      }

      // Also save phone to customers table immediately
      const { data: { user } } = await supabase.auth.getUser();
      if (user && formData.phone) {
        await supabase.from('customers').update({ phone: formData.phone }).eq('id', user.id);
      }

      // Enrich the SIGNUP audit log with IP + name (DB trigger creates the row;
      // this enriches it server-side so IP is captured from the request context).
      if (user) {
        fetch('/api/audit/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            email: user.email,
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone || null,
            provider: 'email',
          }),
        }).catch(() => { /* non-critical */ });
      }

      toast.success('Account created! Welcome to JulineMart!');
      trackSignupSuccess({ method: 'email' });
      // SIGNUP is logged server-side via the handle_new_customer DB trigger.
      router.push('/account');
    } catch (err: any) {
      console.error('Registration error:', err);
      toast.error('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const logoSrc = process.env.NEXT_PUBLIC_LOGO_URL || '/images/logo.png';

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full mx-auto space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <Image src={logoSrc} alt="JulineMart" width={60} height={60} className="mx-auto" />
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Create your account</h2>
          <p className="mt-2 text-sm text-gray-600">Join thousands of happy shoppers</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-6">
            <GoogleSignInButton text="signup" redirectTo="/account" />
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300" /></div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">Or sign up with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" type="text" name="firstName" value={formData.firstName} onChange={handleChange}
                error={errors.firstName} placeholder="John" fullWidth autoComplete="given-name" disabled={isLoading} />
              <Input label="Last Name" type="text" name="lastName" value={formData.lastName} onChange={handleChange}
                error={errors.lastName} placeholder="Doe" fullWidth autoComplete="family-name" disabled={isLoading} />
            </div>

            <Input label="Email Address" type="email" name="email" value={formData.email} onChange={handleChange}
              error={errors.email} startIcon={<Mail className="w-5 h-5" />} placeholder="you@example.com"
              fullWidth autoComplete="email" disabled={isLoading} />

            <Input label="Phone Number (Optional)" type="tel" name="phone" value={formData.phone}
              onChange={handleChange} error={errors.phone} startIcon={<Phone className="w-5 h-5" />}
              placeholder="08012345678" helperText="Format: 08012345678 or +2348012345678"
              fullWidth autoComplete="tel" disabled={isLoading} />

            <Input label="Password" type={showPassword ? 'text' : 'password'} name="password"
              value={formData.password} onChange={handleChange} error={errors.password}
              startIcon={<Lock className="w-5 h-5" />}
              endIcon={
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="focus:outline-none" tabIndex={-1}>
                  {showPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                </button>
              }
              placeholder="Min. 8 characters" helperText="Must include uppercase, lowercase, and number"
              fullWidth autoComplete="new-password" disabled={isLoading} />

            <Input label="Confirm Password" type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword"
              value={formData.confirmPassword} onChange={handleChange} error={errors.confirmPassword}
              startIcon={<Lock className="w-5 h-5" />}
              endIcon={
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="focus:outline-none" tabIndex={-1}>
                  {showConfirmPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                </button>
              }
              placeholder="Re-enter password" fullWidth autoComplete="new-password" disabled={isLoading} />

            <div>
              <label className="flex items-start">
                <input type="checkbox" name="agreeToTerms" checked={formData.agreeToTerms} onChange={handleChange}
                  className="w-4 h-4 mt-0.5 text-primary-600 border-gray-300 rounded" disabled={isLoading} />
                <span className="ml-2 text-sm text-gray-600">
                  I agree to the{' '}
                  <Link href="/page/terms-of-service" className="text-primary-600 hover:text-primary-700 font-medium">Terms & Conditions</Link>
                  {' '}and{' '}
                  <Link href="/page/privacy-policy" className="text-primary-600 hover:text-primary-700 font-medium">Privacy Policy</Link>
                </span>
              </label>
              {errors.agreeToTerms && <p className="mt-1.5 text-sm text-red-600">{errors.agreeToTerms}</p>}
            </div>

            <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isLoading} disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">Sign in</Link>
            </p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-800">
              <p className="font-medium mb-1">Free Account Benefits</p>
              <ul className="space-y-1">
                <li>• Fast checkout process</li>
                <li>• Order tracking &amp; history</li>
                <li>• Exclusive deals &amp; offers</li>
                <li>• Wishlist &amp; saved items</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link href="/" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
