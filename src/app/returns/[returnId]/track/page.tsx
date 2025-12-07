'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, MapPin, RefreshCw, Truck } from 'lucide-react';
import { buildFezTrackingUrl } from '@/lib/jlo/returns';

type TrackingEvent = {
  status?: string;
  description?: string;
  location?: string;
  timestamp?: string;
};

type TrackingPayload = {
  data?: any;
  return_shipment?: {
    return_shipment_id: string;
    return_code: string | null;
    tracking_number: string | null;
    status: string | null;
    events?: TrackingEvent[];
  };
  return_shipment_id?: string;
  tracking_number?: string | null;
  return_code?: string | null;
  status?: string | null;
  events?: TrackingEvent[];
};

export default function TrackReturnPage() {
  const params = useParams();
  const router = useRouter();
  const returnId = params?.returnId as string;

  const trackingGetUrl = useMemo(
    () => (returnId ? `/api/returns/${encodeURIComponent(returnId)}/tracking` : ''),
    [returnId]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState<string | null>(null);
  const [returnCode, setReturnCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const fezTrackingUrl = trackingNumber ? buildFezTrackingUrl(trackingNumber) : null;

  const statusLabel = useMemo(() => {
    switch ((status || '').toLowerCase()) {
      case 'awaiting_tracking':
        return 'Awaiting tracking number';
      case 'in_transit':
        return 'In transit';
      case 'delivered_to_hub':
        return 'Delivered to Hub';
      case 'inspection_in_progress':
        return 'Inspection in progress';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'refund_processing':
        return 'Refund processing';
      case 'refund_completed':
        return 'Refund completed';
      default:
        return status || '--';
    }
  }, [status]);

  const loadTracking = async () => {
    if (!returnId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(trackingGetUrl);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || data?.error || 'Failed to fetch tracking');
      }
      const payload: TrackingPayload = data?.data ?? data ?? {};
      const shipment =
        payload?.return_shipment ||
        payload?.data?.return_shipment ||
        (payload?.return_shipment_id ? (payload as any) : null);

      setTrackingNumber(shipment?.tracking_number || payload?.tracking_number || null);
      setReturnCode(shipment?.return_code || payload?.return_code || null);
      setStatus(shipment?.status || payload?.status || null);
      const timeline = shipment?.events || payload?.events || [];
      setEvents(Array.isArray(timeline) ? timeline : []);
    } catch (err: any) {
      console.error('Tracking fetch error:', err);
      setError(err?.message || 'Failed to load tracking');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTracking();
    const interval = setInterval(loadTracking, 120000);
    return () => clearInterval(interval);
  }, [returnId]);

  if (!returnId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Invalid return ID</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-gray-600 hover:text-primary-600" aria-label="Back">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <p className="text-sm text-gray-600">Return</p>
            <h1 className="text-xl font-bold text-gray-900">Track Return</h1>
            <p className="text-sm text-gray-600">Return ID: {returnId}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-xs uppercase text-gray-500">Return code</p>
              <p className="text-lg font-semibold text-gray-900">{returnCode || '--'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Tracking number</p>
              <p className="text-lg font-semibold text-gray-900">{trackingNumber || 'Awaiting tracking'}</p>
            </div>
            <div className="ml-auto flex items-center gap-2 text-sm text-gray-700">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <button onClick={loadTracking} className="underline font-medium">
                Refresh
              </button>
              {fezTrackingUrl ? (
                <a
                  href={fezTrackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-medium text-primary-700"
                >
                  Track on Fez
                </a>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-800">
            <Truck className="w-4 h-4 text-primary-600" />
            <span className="font-semibold">{statusLabel}</span>
            {status ? <span className="text-gray-500">({status})</span> : null}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-primary-600" />
            <p className="text-sm font-semibold text-gray-900">Tracking timeline</p>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading tracking...
            </div>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : events.length ? (
            <ul className="space-y-3">
              {events.map((ev, idx) => (
                <li key={idx} className="border border-gray-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-gray-900">{ev.status || ev.description || 'Update'}</p>
                  {ev.description ? <p className="text-sm text-gray-700">{ev.description}</p> : null}
                  {ev.location ? <p className="text-xs text-gray-600">Location: {ev.location}</p> : null}
                  {ev.timestamp ? (
                    <p className="text-xs text-gray-500">{new Date(ev.timestamp).toLocaleString()}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600">No tracking updates yet.</p>
          )}
        </div>

        <div className="text-center text-sm text-gray-600">
          Need to add or fix the tracking number?{' '}
          <Link href={`/returns/${returnId}/add-tracking`} className="text-primary-600 underline font-semibold">
            Add tracking number
          </Link>
        </div>
      </div>
    </main>
  );
}
