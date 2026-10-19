'use client';

import { clsx } from 'clsx';
import { useMobileTier } from '@/components/mobile/mobile-tier-context';
import MobileTopBar from '@/components/mobile/shell/mobile-top-bar';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Hash } from 'lucide-react';
import { getAuthHeader } from '@/lib/supabase/client';
import Spinner from '@/components/ui/spinner';

const extractShipmentId = (candidate: any): string | null => {
  if (!candidate) return null;
  if (candidate.return_shipment_id) return String(candidate.return_shipment_id);
  if (candidate.return_shipment?.return_shipment_id) return String(candidate.return_shipment.return_shipment_id);
  return null;
};

const parseTrackingResponse = (raw: any) => {
  const payload = raw?.data ?? raw;
  const shipment =
    payload?.return_shipment ||
    payload?.data?.return_shipment ||
    (payload?.return_shipment_id ? payload : null);

  return {
    tracking: shipment?.tracking_number || payload?.tracking_number || null,
    shipmentId: extractShipmentId(shipment || payload),
  };
};

export default function AddTrackingPage() {
  // Mobile tier (docs/mobile-tier-plan.md, wave 3): top bar and pinned actions below md.
  const tier = useMobileTier() !== null;
  const params = useParams();
  const router = useRouter();
  const returnId = params?.returnId as string;
  const trackingGetUrl = useMemo(() => (returnId ? `/api/returns/${encodeURIComponent(returnId)}/tracking` : ''), [returnId]);

  const [trackingNumber, setTrackingNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTracking, setCurrentTracking] = useState<string | null>(null);
  const [shipmentId, setShipmentId] = useState<string | null>(null);

  useEffect(() => {
    const loadCurrent = async () => {
      if (!returnId) return;
      setLoading(true);
      try {
          // Fetch tracking data from the return endpoint
        const res = await fetch(trackingGetUrl, { headers: await getAuthHeader() });
        const data = await res.json().catch(() => ({}));
        
        // Try to parse tracking from the response
        if (res.ok) {
          // Try data.data first (wrapped response), then data directly
          const payload = data?.data || data;
          const parsed = parseTrackingResponse(payload);
          if (parsed.tracking) setCurrentTracking(parsed.tracking);
          if (parsed.shipmentId) setShipmentId(parsed.shipmentId);
        }
      } catch (err) {
        console.error('Error loading tracking', err);
      } finally {
        setLoading(false);
      }
    };

    loadCurrent();
  }, [returnId, trackingGetUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) {
      return toast.error('Please enter a tracking number.');
    }
    
    // Use shipmentId if available, otherwise fall back to returnId
    // This handles cases where the return_shipment_id was not returned separately
    const idToUse = shipmentId || returnId;
    if (!idToUse) {
      return toast.error('Unable to identify the shipment. Please refresh and try again.');
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/return-shipments/${encodeURIComponent(idToUse)}/tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
        body: JSON.stringify({ tracking_number: trackingNumber.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success === false) {
        throw new Error(result?.message || result?.error || 'Failed to save tracking');
      }
      toast.success('Tracking number saved successfully.');
      router.push(`/returns/${returnId}/track`);
    } catch (err: any) {
      console.error('Error saving tracking:', err);
      toast.error(err?.message || 'Could not save tracking number.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!returnId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Invalid return ID</p>
      </div>
    );
  }

  return (
    <main className={clsx('min-h-screen bg-gray-50 pb-24', tier && 'max-md:bg-m-surface-low max-md:pb-4')}>
      <div className="container mx-auto px-4 py-6 max-w-xl space-y-6">
        {tier && (
          <div className="sticky top-0 z-m-header -mx-4 -mt-6 bg-m-surface-low md:hidden">
            <MobileTopBar title="Add tracking number" backHref={`/returns/${returnId}/track`} />
          </div>
        )}
        <div className={clsx('flex items-center gap-4', tier && 'max-md:hidden')}>
          <Link href={`/returns/${returnId}/track`} className="text-gray-600 hover:text-primary-600">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <p className="text-sm text-gray-600">Return</p>
            <h1 className="text-xl font-bold text-gray-900">Add Tracking Number</h1>
            <p className="text-sm text-gray-600">Return ID: {returnId}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 text-gray-800">
            <Hash className="w-5 h-5 text-primary-600" />
            <div>
              <p className="font-semibold text-gray-900">Fez tracking number</p>
              <p className="text-sm text-gray-600">Found on the receipt Fez gave you.</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Spinner size="sm" />
              Loading current tracking...
            </div>
          ) : currentTracking ? (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
              Current tracking on file: <span className="font-semibold">{currentTracking}</span>
            </div>
          ) : (
            <p className="text-sm text-gray-600">No tracking number saved yet. Please enter your Fez tracking number below.</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Tracking number</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="e.g. FEZ123456789"
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold disabled:opacity-60"
            >
              {submitting ? 'Saving...' : 'Save tracking number'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
