'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, MapPin, Package, RefreshCw, Truck } from 'lucide-react';

type TrackingEvent = {
  status?: string;
  description?: string;
  location?: string;
  timestamp?: string;
  created_at?: string;
};

const parseTrackingPayload = (payload: any, fallbackReturnId: string) => {
  const tracking =
    payload?.tracking_number ||
    payload?.tracking ||
    payload?.tracking_no ||
    payload?.tracking_no1 ||
    payload?.trackingNo ||
    payload?.return_shipment?.tracking_number ||
    payload?.return_shipment?.fez_tracking ||
    payload?.return_shipments?.[0]?.tracking_number ||
    payload?.return_shipments?.[0]?.fez_tracking ||
    null;

  const returnCode =
    payload?.return_code ||
    payload?.returnId ||
    payload?.return_id ||
    payload?.return_shipments?.[0]?.return_code ||
    fallbackReturnId;

  const status =
    payload?.status ||
    payload?.current_status ||
    payload?.return_shipment?.status ||
    payload?.return_shipments?.[0]?.status ||
    null;

  const events = Array.isArray(payload?.events)
    ? payload.events
    : Array.isArray(payload?.history)
    ? payload.history
    : [];

  return { tracking, returnCode, status, events };
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

  const loadTracking = async () => {
    if (!returnId || !trackingGetUrl) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(trackingGetUrl);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || data?.error || 'Failed to fetch tracking');
      }
      const payload = data?.data ?? data;
      const { tracking, returnCode: parsedReturnCode, status: parsedStatus, events: parsedEvents } =
        parseTrackingPayload(payload, returnId);
      setTrackingNumber(tracking);
      setReturnCode(parsedReturnCode);
      setStatus(parsedStatus);
      setEvents(parsedEvents);
    } catch (err: any) {
      console.error('Error fetching tracking', err);
      setError(err?.message || 'Failed to fetch tracking');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTracking();
    const interval = setInterval(loadTracking, 120000); // 2 minutes
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnId]);

  const statusLabel = useMemo(() => {
    const s = (status || '').toLowerCase();
    if (s.includes('deliver')) return 'Delivered';
    if (s.includes('transit')) return 'In Transit';
    if (s.includes('pickup')) return 'Pickup Scheduled';
    if (s.includes('received') || s.includes('hub')) return 'Received at Hub';
    return status || 'In Transit';
  }, [status]);

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
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-primary-600"
            aria-label="Back"
          >
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
              <p className="text-lg font-semibold text-gray-900">{returnCode || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Tracking number</p>
              <p className="text-lg font-semibold text-gray-900">{trackingNumber || 'Not provided'}</p>
            </div>
            <div className="ml-auto flex items-center gap-2 text-sm text-gray-700">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <button onClick={loadTracking} className="underline font-medium">
                Refresh
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-800">
            <Truck className="w-4 h-4 text-primary-600" />
            <span className="font-semibold">{statusLabel}</span>
            {status && <span className="text-gray-500">({status})</span>}
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
              Fetching tracking...
            </div>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : events.length ? (
            <ul className="space-y-3">
              {events.map((ev, idx) => (
                <li key={idx} className="border border-gray-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {ev.status || ev.description || 'Update'}
                  </p>
                  {ev.description && <p className="text-sm text-gray-700">{ev.description}</p>}
                  {ev.location && <p className="text-xs text-gray-600">Location: {ev.location}</p>}
                  {(ev.timestamp || ev.created_at) && (
                    <p className="text-xs text-gray-500">
                      {new Date(ev.timestamp || ev.created_at || '').toLocaleString()}
                    </p>
                  )}
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
