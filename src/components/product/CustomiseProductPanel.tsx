'use client';

import { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import JulineMartProtectBadge from '@/components/trust/JulineMartProtectBadge';
import type { ProductCustomisationSchema } from '@/types/custom-order';
import {
  buildCartCustomisation,
  computeCustomisationAdjustment,
  productionWindowLabel,
  validateCustomisation,
} from '@/lib/custom-order';
import { useCartStore } from '@/store/cart-store';
import type { Product, ProductVariation } from '@/types/product';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

type Props = {
  product: Product;
  schema: ProductCustomisationSchema;
  selectedVariation?: ProductVariation | null;
  basePrice: number;
  requiresSelection?: boolean;
};

export default function CustomiseProductPanel({
  product,
  schema,
  selectedVariation,
  basePrice,
  requiresSelection = false,
}: Props) {
  const router = useRouter();
  const addToCart = useCartStore((s) => s.addItem);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string | number>>({});

  const adjustment = useMemo(
    () => computeCustomisationAdjustment(schema, values),
    [schema, values]
  );
  const totalPrice = basePrice + adjustment;
  const windowLabel = productionWindowLabel(schema);

  const setField = (id: string, value: string | number) => {
    setValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleAdd = () => {
    if (requiresSelection && !selectedVariation) {
      toast.error('Please choose your options first');
      return;
    }
    const err = validateCustomisation(schema, values);
    if (err) {
      toast.error(err);
      return;
    }
    const customisation = buildCartCustomisation(schema, values);
    const variationPayload = selectedVariation
      ? {
          id: selectedVariation.id,
          supabaseId: selectedVariation.supabaseId,
          attributes: selectedVariation.attributes.reduce<Record<string, string>>((acc, attr) => {
            acc[attr.name] = attr.option;
            return acc;
          }, {}),
          price: basePrice,
          regularPrice: parseFloat(selectedVariation.regular_price || '0') || basePrice,
          salePrice: selectedVariation.sale_price
            ? parseFloat(selectedVariation.sale_price)
            : undefined,
          image: selectedVariation.image?.src,
          sku: selectedVariation.sku,
          stockQuantity: selectedVariation.stock_quantity ?? null,
          stockStatus: selectedVariation.stock_status,
        }
      : undefined;

    addToCart(product, 1, variationPayload, customisation);
    toast.success('Custom order added to cart');
    router.push('/checkout');
  };

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        className="w-full border-primary-200 text-primary-700 hover:bg-primary-50"
        onClick={() => setOpen(true)}
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Customise this item
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-primary-100 bg-primary-50/40 p-4 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">Make it yours</p>
          {windowLabel && <p className="text-xs text-gray-600 mt-0.5">{windowLabel}</p>}
          {schema.requires_approval && (
            <p className="text-xs text-amber-700 mt-1">Seller will confirm details before production.</p>
          )}
        </div>
        <JulineMartProtectBadge variant="compact" />
      </div>

      <div className="space-y-3">
        {schema.fields.map((field) => (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              {field.label}
              {field.required ? ' *' : ''}
            </label>
            {field.type === 'dropdown' && field.options?.length ? (
              <select
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                value={String(values[field.id] ?? '')}
                onChange={(e) => setField(field.id, e.target.value)}
              >
                <option value="">Select…</option>
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                    {opt.price_delta ? ` (+₦${opt.price_delta.toLocaleString()})` : ''}
                  </option>
                ))}
              </select>
            ) : field.type === 'long_text' ? (
              <textarea
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white min-h-[80px]"
                placeholder={field.placeholder}
                value={String(values[field.id] ?? '')}
                onChange={(e) => setField(field.id, e.target.value)}
              />
            ) : (
              <input
                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                placeholder={field.placeholder}
                min={field.min}
                max={field.max}
                value={String(values[field.id] ?? '')}
                onChange={(e) =>
                  setField(
                    field.id,
                    field.type === 'number' ? Number(e.target.value) : e.target.value
                  )
                }
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Your price</span>
        <span className="font-bold text-primary-700">₦{totalPrice.toLocaleString()}</span>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="button" className="flex-1" onClick={handleAdd}>
          Add custom order
        </Button>
      </div>
    </div>
  );
}
