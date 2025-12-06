'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Hash, Loader2 } from 'lucide-react';

type TrackingPayload = {
   return_request_id?: string;
  return_shipment_id?: string;
  return_shipment?: {
    return_shipment_id: string;
    tracking_number: string | null;
  };
   tracking_number?: string | null;
};

// Extract shipment ID from various possible response structures
const extractShipmentId = (payload: TrackingPayload): string | null => {
  // Check nested return_shipment first
  if (payload?.return_shipment?.return_shipment_id) {
    return payload.return_shipment.return_shipment_id;
  }
  // Check top-level return_shipment_id
  if (payload?.return_shipment_id) {
    return payload.return_shipment_id;
  }
  return null;
};

const parseTrackingResponse = (payload: TrackingPayload) => {
  const shipment = payload?.return_shipment;
  return {
    tracking: shipment?.tracking_number || payload?.tracking_number || null,
    shipmentId: extractShipmentId(payload),
  };
};

export default function AddTrackingPage() {
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
        const res = await fetch(trackingGetUrl);
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
        headers: { 'Content-Type': 'application/json' },
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
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="container mx-auto px-4 py-6 max-w-xl space-y-6">
        <div className="flex items-center gap-4">
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
              <Loader2 className="w-4 h-4 animate-spin" />
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
