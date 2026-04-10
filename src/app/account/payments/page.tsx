'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, Plus, Trash2, Check, Shield, AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useCustomerAuth } from '@/context/customer-auth-context';
import { getSavedCards, saveCard, setDefaultCard, deleteCard } from '@/lib/supabase/customers';
import type { SavedCard } from '@/types/customer';
import PageLoading from '@/components/ui/page-loading';

declare global { interface Window { PaystackPop: any; } }

export default function PaymentMethodsPage() {
  const router = useRouter();
  const { user, customer, isAuthenticated, isLoading: authLoading } = useCustomerAuth();

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);

  // Load Paystack script
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.PaystackPop) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) { router.push('/login?redirect=/account/payments'); return; }
      loadCards();
    }
  }, [authLoading, isAuthenticated]);

  const loadCards = async () => {
    if (!user) return;
    setPageLoading(true);
    try {
      const cards = await getSavedCards(user.id);
      setSavedCards(cards);
    } catch { toast.error('Failed to load payment methods'); }
    finally { setPageLoading(false); }
  };

  const handleAddCard = () => {
    if (!user || !customer) { toast.error('Please log in to add a payment method'); return; }
    if (!window.PaystackPop) { toast.error('Payment system not loaded. Please refresh.'); return; }
    const key = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
    if (!key) { toast.error('Payment configuration error'); return; }

    setLoading(true);
    const handler = window.PaystackPop.setup({
      key,
      email: customer.email,
      amount: 50 * 100,
      currency: 'NGN',
      ref: `CARD_VERIFY_${user.id.slice(0, 8)}_${Date.now()}`,
      onClose: () => { setLoading(false); toast.info('Card addition cancelled'); },
      callback: (response: any) => handleCardAdded(response),
    });
    handler.openIframe();
  };

  const handleCardAdded = async (response: any) => {
    if (!user || !customer) return;
    try {
      setLoading(true);
      toast.info('Verifying card...');

      const res = await fetch('/api/payments/verify-paystack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: response.reference }),
      });
      if (!res.ok) throw new Error('Verification failed');
      const data = await res.json();

      if (data.success && data.authorization) {
        const auth = data.authorization;
        const newCard = await saveCard(user.id, {
          authorization_code: auth.authorization_code,
          card_type: auth.card_type || auth.brand || 'card',
          last4: auth.last4,
          exp_month: auth.exp_month,
          exp_year: auth.exp_year,
          bank: auth.bank,
          country_code: auth.country_code,
          email: customer.email,
          is_default: savedCards.length === 0,
        });
        setSavedCards(prev => [...prev, newCard]);
        toast.success('Card added! ₦50 verification charge will be refunded.');
      } else {
        throw new Error('Card verification failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save card');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (cardId: string) => {
    if (!user) return;
    setLoading(true);
    try {
      await setDefaultCard(user.id, cardId);
      setSavedCards(prev => prev.map(c => ({ ...c, is_default: c.id === cardId })));
      toast.success('Default card updated');
    } catch { toast.error('Failed to update default card'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (cardId: string) => {
    if (!confirm('Remove this payment method?')) return;
    setLoading(true);
    try {
      await deleteCard(cardId);
      const remaining = savedCards.filter(c => c.id !== cardId);
      // If deleted card was default, make first remaining the default
      if (remaining.length > 0 && savedCards.find(c => c.id === cardId)?.is_default) {
        await setDefaultCard(user!.id, remaining[0].id);
        remaining[0].is_default = true;
      }
      setSavedCards(remaining);
      toast.success('Payment method removed');
    } catch { toast.error('Failed to remove payment method'); }
    finally { setLoading(false); }
  };

  const cardBrandColor: Record<string, string> = {
    visa: 'text-blue-700',
    mastercard: 'text-red-600',
    verve: 'text-green-700',
  };

  if (authLoading || pageLoading) return <PageLoading text="Loading payment methods..." />;

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Link href="/account" className="flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-6">
          <ArrowLeft className="w-5 h-5" /><span>Back to Account</span>
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Methods</h1>
            <p className="text-sm text-gray-600 mt-1">Manage your saved payment cards</p>
          </div>
          <Button onClick={handleAddCard} disabled={loading} variant="primary" className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Card
          </Button>
        </div>

        {/* Security notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Secure Card Storage</p>
            <p>Cards are tokenised by Paystack. We never store your full card details. A ₦50 verification charge is made and refunded.</p>
          </div>
        </div>

        {savedCards.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No payment methods saved</h3>
            <p className="text-gray-600 mb-5">Add a card for faster checkout</p>
            <Button onClick={handleAddCard} disabled={loading} variant="primary">
              <Plus className="w-4 h-4 mr-2" /> Add Payment Method
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {savedCards.map(card => (
              <div key={card.id}
                className={`bg-white rounded-xl shadow-sm p-5 border-2 ${card.is_default ? 'border-primary-500' : 'border-transparent'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <CreditCard className={`w-6 h-6 ${cardBrandColor[card.card_type?.toLowerCase() || ''] || 'text-gray-600'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 capitalize">
                        {card.card_type || 'Card'} •••• {card.last4}
                      </p>
                      <p className="text-sm text-gray-600">
                        Expires {card.exp_month}/{card.exp_year}
                        {card.bank ? ` · ${card.bank}` : ''}
                      </p>
                      {card.is_default && (
                        <span className="inline-flex items-center gap-1 text-xs text-primary-600 font-medium mt-0.5">
                          <Check className="w-3 h-3" /> Default
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!card.is_default && (
                      <Button onClick={() => handleSetDefault(card.id)} disabled={loading}
                        variant="outline" size="sm">Set Default</Button>
                    )}
                    <Button onClick={() => handleDelete(card.id)} disabled={loading}
                      variant="outline" size="sm" className="text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
          <Lock className="w-4 h-4" />
          <span>Powered by Paystack — your card details are encrypted and secure</span>
        </div>
      </div>
    </main>
  );
}
