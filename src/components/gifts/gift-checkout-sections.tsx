'use client';

import type { ReactNode } from 'react';
import { CreditCard, Truck } from 'lucide-react';
import { formatPrice } from '@/lib/utils/format-price';
import type { PaymentGateway } from '@/lib/woocommerce/shipping';

export function GiftCheckoutSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm md:p-5">
      <div className="mb-4 flex items-center gap-3">
        {icon}
        <h2 className="text-sm font-semibold text-gray-900 md:text-base">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function GiftShippingMethodSection({
  shippingFee,
  loading,
  error,
  hasAddress,
}: {
  shippingFee: number | null;
  loading: boolean;
  error: string | null;
  hasAddress: boolean;
}) {
  return (
    <GiftCheckoutSection icon={<Truck className="h-6 w-6 text-primary-600" />} title="Shipping Method">
      <label className="flex cursor-default items-start gap-3 rounded-lg border-2 border-primary-600 bg-primary-50 p-4">
        <input type="radio" name="gift-shipping" checked readOnly className="mt-1 h-4 w-4 text-primary-600" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-gray-900">Gift delivery</p>
            <p className="shrink-0 font-semibold text-primary-600">
              {!hasAddress
                ? 'Enter city & state'
                : loading
                  ? 'Calculating…'
                  : error
                    ? '—'
                    : shippingFee === 0
                      ? 'FREE'
                      : formatPrice(shippingFee ?? 0)}
            </p>
          </div>
        </div>
      </label>
      {loading ? <p className="mt-2 text-sm text-gray-500">Calculating delivery fee…</p> : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </GiftCheckoutSection>
  );
}

export function GiftPaymentMethodSection({
  gateways,
  selectedPayment,
  onSelect,
  loading,
}: {
  gateways: PaymentGateway[];
  selectedPayment: string;
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  return (
    <GiftCheckoutSection icon={<CreditCard className="h-6 w-6 text-primary-600" />} title="Payment Method">
      {loading ? (
        <p className="text-sm text-gray-500">Loading payment methods…</p>
      ) : gateways.length === 0 ? (
        <p className="text-sm text-gray-500">No payment methods available.</p>
      ) : (
        <div className="space-y-3">
          {gateways.map((gateway) => (
            <label
              key={gateway.id}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-colors ${
                selectedPayment === gateway.id
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                name="gift-payment"
                value={gateway.id}
                checked={selectedPayment === gateway.id}
                onChange={(e) => onSelect(e.target.value)}
                className="mt-1 h-4 w-4 text-primary-600"
              />
              <div className="min-w-0">
                <p className="font-medium text-gray-900">{gateway.title}</p>
                {gateway.description ? (
                  <p className="mt-1 text-sm text-gray-600">{gateway.description}</p>
                ) : null}
              </div>
            </label>
          ))}
        </div>
      )}
    </GiftCheckoutSection>
  );
}
