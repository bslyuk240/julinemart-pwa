'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  CreditCard, 
  Plus, 
  Edit2, 
  Trash2,
  Check,
  Shield,
  AlertCircle,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useCustomerAuth } from '@/context/customer-auth-context';
import PageLoading from '@/components/ui/page-loading';

interface SavedCard {
  id: string;
  authorization_code: string;
  card_type: string;
  last4: string;
  exp_month: string;
  exp_year: string;
  bank: string;
  country_code: string;
  is_default: boolean;
}

// Declare Paystack type
declare global {
  interface Window {
    PaystackPop: any;
  }
}

export default function PaymentMethodsPage() {
  const router = useRouter();
  const { customer, customerId, isAuthenticated, isLoading: authLoading, refreshCustomer } = useCustomerAuth();
  
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
      if (!isAuthenticated) {
        router.push('/login?redirect=/account/payments');
      } else {
        loadPaymentMethods();
      }
    }
  }, [authLoading, isAuthenticated, customer]);

  const loadPaymentMethods = async () => {
    if (!customer) return;

    try {
      setPageLoading(true);
      
      console.log('🔍 Loading payment methods for customer:', customerId);
      console.log('🔍 Customer meta_data:', customer.meta_data);
      
      // Get saved cards from customer meta_data
      const savedCardsData = customer.meta_data?.find(
        (meta) => meta.key === '_saved_payment_cards'
      );

      console.log('🔍 Found saved cards data:', savedCardsData);

      if (savedCardsData && savedCardsData.value) {
        const cards = typeof savedCardsData.value === 'string'
          ? JSON.parse(savedCardsData.value)
          : savedCardsData.value;
        
        console.log('✅ Parsed cards:', cards);
        setSavedCards(Array.isArray(cards) ? cards : []);
      } else {
        console.log('⚠️ No saved cards found in meta_data');
        setSavedCards([]);
      }
    } catch (error) {
      console.error('❌ Error loading payment methods:', error);
      toast.error('Failed to load payment methods');
      setSavedCards([]);
    } finally {
      setPageLoading(false);
    }
  };

  const handleAddPaymentMethod = () => {
    if (!customer || !customerId) {
      toast.error('Please log in to add payment method');
      return;
    }

    if (typeof window === 'undefined' || !window.PaystackPop) {
      toast.error('Payment system not loaded. Please refresh the page.');
      return;
    }

    const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
    
    if (!paystackPublicKey) {
      toast.error('Payment configuration error');
      console.error('Missing Paystack public key');
      return;
    }

    setLoading(true);

    try {
      const handler = window.PaystackPop.setup({
        key: paystackPublicKey,
        email: customer.email,
        amount: 50 * 100, // ₦50 in kobo (minimum charge for card verification)
        currency: 'NGN',
        ref: `CARD_VERIFY_${customerId}_${Date.now()}`,
        metadata: {
          custom_fields: [
            {
              display_name: 'Purpose',
              variable_name: 'purpose',
              value: 'Card Verification',
            },
            {
              display_name: 'Customer ID',
              variable_name: 'customer_id',
              value: customerId.toString(),
            },
          ],
        },
        onClose: function() {
          console.log('Payment window closed');
          setLoading(false);
          toast.info('Card addition cancelled');
        },
        callback: function(response: any) {
          console.log('Payment successful:', response);
          // Call the async handler without await
          handleCardAdded(response);
        },
      });

      handler.openIframe();
    } catch (error) {
      console.error('Error initializing Paystack:', error);
      toast.error('Failed to open payment window');
      setLoading(false);
    }
  };

  const handleCardAdded = async (response: any) => {
    try {
      setLoading(true);
      toast.info('Verifying card details...');

      const verifyResponse = await fetch('/api/payments/verify-paystack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: response.reference }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json().catch(() => null);
        console.error('Verification failed:', errorData);
        throw new Error('Failed to verify transaction');
      }

      const verifyData = await verifyResponse.json();

      if (verifyData.success && verifyData.authorization) {
        const auth = verifyData.authorization;
        const newCard: SavedCard = {
          id: `card_${Date.now()}`,
          authorization_code: auth.authorization_code,
          card_type: auth.card_type || auth.brand || 'card',
          last4: auth.last4,
          exp_month: auth.exp_month,
          exp_year: auth.exp_year,
          bank: auth.bank,
          country_code: auth.country_code,
          is_default: savedCards.length === 0,
        };

        const updatedCards = [...savedCards, newCard];

        const saveResult = await saveCards(updatedCards);

        if (saveResult.ok) {
          toast.success('Card added successfully! ₦50 verification charge will be refunded.');
          await refreshCustomer();
          await loadPaymentMethods();
        } else {
          throw new Error(saveResult.message || 'Failed to save card');
        }
      } else {
        console.error('Verification data invalid:', verifyData);
        throw new Error('Card verification failed');
      }
    } catch (error) {
      console.error('Error adding card:', error);
      toast.error('Failed to save card. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  const handleDelete = async (cardId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    try {
      setLoading(true);

      const updatedCards = savedCards.filter(card => card.id !== cardId);

      if (updatedCards.length > 0 && !updatedCards.some(c => c.is_default)) {
        updatedCards[0].is_default = true;
      }

      const saved = await saveCards(updatedCards);

      if (saved.ok) {
        toast.success('Payment method removed');
        await refreshCustomer();
        await loadPaymentMethods();
      } else {
        throw new Error(saved.message || 'Failed to remove card');
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      toast.error('Failed to remove payment method');
    } finally {
      setLoading(false);
    }
  };
  const handleSetDefault = async (cardId: string) => {
    try {
      setLoading(true);

      const updatedCards = savedCards.map(card => ({
        ...card,
        is_default: card.id === cardId,
      }));

      const saved = await saveCards(updatedCards);

      if (saved.ok) {
        toast.success('Default payment method updated');
        await refreshCustomer();
        await loadPaymentMethods();
      } else {
        throw new Error(saved.message || 'Failed to update default card');
      }
    } catch (error) {
      console.error('Error setting default card:', error);
      toast.error('Failed to update default payment method');
    } finally {
      setLoading(false);
    }
  };

  // Save cards via API route, fallback to direct WooCommerce call if API fails
  const saveCards = async (
    cards: SavedCard[]
  ): Promise<{ ok: boolean; message?: string }> => {
    try {
      const apiRes = await fetch('/api/customers/save-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, cards }),
      });

      if (apiRes.ok) {
        const data = await apiRes.json().catch(() => null);
        return { ok: true, message: data?.meta_data ? 'saved' : undefined };
      }

      const apiErr = await apiRes.json().catch(() => null);

      // Attempt fallback to direct WooCommerce update
      const { updateCustomerMeta } = await import('@/lib/woocommerce/customers');
      const wcRes = await updateCustomerMeta(
        customerId!,
        '_saved_payment_cards',
        cards
      );
      if (wcRes !== null) return { ok: true };

      return { ok: false, message: apiErr?.error || 'Failed to save card' };
    } catch (error) {
      console.error('Error saving cards:', error);
      return { ok: false, message: (error as any)?.message };
    }
  };
const getCardIcon = (cardType: string) => {
    return <CreditCard className="w-6 h-6 text-white" />;
  };

  const getCardBrandColor = (cardType: string) => {
    const colors: Record<string, string> = {
      visa: 'from-blue-500 to-blue-700',
      mastercard: 'from-red-500 to-orange-600',
      verve: 'from-green-500 to-green-700',
      default: 'from-purple-500 to-purple-700',
    };
    return colors[cardType.toLowerCase()] || colors.default;
  };

  if (authLoading || pageLoading) {
    return <PageLoading text="Loading payment methods..." />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/account"
            className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden md:inline">Back to Account</span>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Payment Methods</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage your payment methods for faster checkout
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1">
              Secure Payment Processing
            </h3>
            <p className="text-sm text-blue-700">
              All payment information is encrypted and securely processed through Paystack. 
              We never store your full card details on our servers.
            </p>
          </div>
        </div>

        {/* Verification Notice */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-orange-900 mb-1">
              Card Verification Charge
            </h3>
            <p className="text-sm text-orange-700">
              A temporary ₦50 charge will be made to verify your card. 
              This amount will be refunded to your account within 24 hours.
            </p>
          </div>
        </div>

        {/* Payment Methods List */}
        {savedCards.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No payment methods saved
            </h3>
            <p className="text-gray-600 mb-6">
              Add a payment method for faster and more convenient checkout.
            </p>
            <Button
              variant="primary"
              onClick={handleAddPaymentMethod}
              disabled={loading}
            >
              <Plus className="w-4 h-4 mr-2" />
              {loading ? 'Processing...' : 'Add Payment Method'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {savedCards.map((card) => (
              <div
                key={card.id}
                className="bg-white rounded-lg shadow-sm p-6 relative"
              >
                {/* Card Info */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 bg-gradient-to-br ${getCardBrandColor(card.card_type)} rounded-lg flex items-center justify-center shadow-lg`}>
                      {getCardIcon(card.card_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 capitalize">
                          {card.card_type}
                        </h3>
                        {card.is_default && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                            <Check className="w-3 h-3" />
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 font-mono">
                        •••• •••• •••• {card.last4}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Expires {card.exp_month}/{card.exp_year}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bank Info */}
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Bank:</span> {card.bank}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {card.country_code}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {!card.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(card.id)}
                      disabled={loading}
                      className="flex-1"
                    >
                      Set as Default
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(card.id)}
                    disabled={loading}
                    className="text-red-600 hover:text-red-700 hover:border-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Add New Card Button */}
            <button
              onClick={handleAddPaymentMethod}
              disabled={loading}
              className="w-full bg-white rounded-lg shadow-sm p-6 border-2 border-dashed border-gray-300 hover:border-primary-400 hover:bg-primary-50/50 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-primary-100 flex items-center justify-center transition-colors">
                  <Plus className="w-5 h-5 text-gray-600 group-hover:text-primary-600 transition-colors" />
                </div>
                <span className="font-medium text-gray-700 group-hover:text-primary-700 transition-colors">
                  {loading ? 'Processing...' : 'Add New Payment Method'}
                </span>
              </div>
            </button>
          </div>
        )}

        {/* Payment Info */}
        <div className="mt-8 bg-gray-100 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-600" />
            How We Protect Your Information
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span>All transactions are encrypted with 256-bit SSL</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span>We never store your full card details</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span>PCI-DSS compliant payment processing via Paystack</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span>24/7 fraud monitoring and protection</span>
            </li>
            <li className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span>Only authorization tokens are stored securely</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}




