'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ProductCustomisationSchema } from '@/types/custom-order';
import {
  buildCartCustomisation,
  computeCustomisationAdjustment,
  validateCustomisation,
} from '@/lib/custom-order';

type Props = {
  productId: string;
  productName: string;
  open: boolean;
  onClose: () => void;
  onConfirm: (customisationSpec: {
    schema_id: string;
    field_values: Record<string, string | number>;
    price_adjustment: number;
    summary_lines: string[];
  }) => void;
};

export default function GiftBuilderCustomiseSheet({
  productId,
  productName,
  open,
  onClose,
  onConfirm,
}: Props) {
  const [schema, setSchema] = useState<ProductCustomisationSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string | number>>({});

  useEffect(() => {
    if (!open || !productId) return;
    setLoading(true);
    setError(null);
    setValues({});
    fetch(`/api/gifts/product-customisation?product_id=${encodeURIComponent(productId)}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) throw new Error(json.error || 'Could not load customisation');
        setSchema({
          id: json.data.schema_id,
          product_id: json.data.product_id,
          vendor_id: json.data.vendor_id ?? '',
          requires_approval: Boolean(json.data.requires_approval),
          fields: json.data.fields,
          production_days_min: json.data.production_days_min,
          production_days_max: json.data.production_days_max,
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load customisation'))
      .finally(() => setLoading(false));
  }, [open, productId]);

  const adjustment = useMemo(
    () => (schema ? computeCustomisationAdjustment(schema, values) : 0),
    [schema, values]
  );

  if (!open) return null;

  const handleConfirm = () => {
    if (!schema) return;
    const err = validateCustomisation(schema, values);
    if (err) {
      setError(err);
      return;
    }
    const customisation = buildCartCustomisation(schema, values);
    onConfirm({
      schema_id: customisation.schema_id,
      field_values: customisation.field_values,
      price_adjustment: customisation.price_adjustment,
      summary_lines: customisation.summary_lines,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 font-semibold text-gray-900">
              <Sparkles className="h-4 w-4 text-primary-600" />
              Personalise
            </p>
            <p className="text-sm text-gray-600">{productName}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading options…</p>
        ) : error && !schema ? (
          <p className="text-sm text-amber-700">{error}</p>
        ) : schema ? (
          <div className="space-y-3">
            {schema.fields.map((field) => (
              <div key={field.id}>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {field.label}
                  {field.required ? <span className="text-rose-600"> *</span> : null}
                </label>
                {field.type === 'dropdown' ? (
                  <select
                    className="min-h-[44px] w-full rounded-xl border border-gray-200 px-3 text-sm"
                    value={String(values[field.id] ?? '')}
                    onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                  >
                    <option value="">Select…</option>
                    {(field.options || []).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'long_text' ? (
                  <textarea
                    className="min-h-[80px] w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                    value={String(values[field.id] ?? '')}
                    onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                    placeholder={field.placeholder}
                  />
                ) : (
                  <Input
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={String(values[field.id] ?? '')}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [field.id]: field.type === 'number' ? Number(e.target.value) : e.target.value,
                      }))
                    }
                    placeholder={field.placeholder}
                  />
                )}
              </div>
            ))}
            {adjustment > 0 ? (
              <p className="text-xs text-gray-500">Included in your box total (+₦{adjustment.toLocaleString()})</p>
            ) : null}
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <Button className="w-full" onClick={handleConfirm}>
              Add to box
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
