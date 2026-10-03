'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Package, AlertCircle, Loader2, MapPin, Image, Info } from 'lucide-react';
import { Order } from '@/types/order';
import { formatPrice } from '@/lib/utils/format-price';
import { JloReturn, JloReturnShipment, formatJloRefundStatus, formatJloReturnStatus, buildFezTrackingUrl } from '@/lib/jlo/returns';
import { getAuthHeader } from '@/lib/supabase/client';

interface ReturnRequestFormProps {
  orderId: number;
}

const COMPLAINT_TYPES = [
  { value: 'not_received', label: 'Product not received' },
  { value: 'wrong_product', label: 'Wrong product' },
  { value: 'damaged', label: 'Damaged product' },
  { value: 'not_as_described', label: 'Product significantly different from description' },
  { value: 'missing_items', label: 'Missing items' },
  { value: 'suspected_counterfeit', label: 'Suspected counterfeit' },
  { value: 'changed_mind', label: 'I changed my mind / no longer need it' },
  { value: 'other', label: 'Other' },
] as const;

type PickupQuote = {
  enabled: boolean;
  available: boolean;
  /** true when the return is our fault, so we pay for the pickup */
  free: boolean;
  fee: number;
  quoted_fee: number | null;
};

const JLO_PICKUP_QUOTE_URL = 'https://jlo.julinemart.com/api/return-pickup-quote';

async function requestPickupQuote(body: Record<string, unknown>): Promise<PickupQuote | null> {
  try {
    const res = await fetch(JLO_PICKUP_QUOTE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return res.ok ? (json?.data as PickupQuote) : null;
  } catch {
    return null;
  }
}

type FezHub = {
  name: string;
  address: string;
  contact?: string;
  city?: string;
  state?: string;
};

const FEZ_HUBS: FezHub[] = [
  { name: 'Fez Head Office', address: '6-10 Industrial Crescent, Ilupeju, Lagos', city: 'Lagos', state: 'Lagos', contact: '02017003077' },
  { name: 'Ogba Hub', address: 'Shop i012, Ogba shopping mall, Abiodun Jagun Street, Off Wempco Road, Beside Sunday Market, Ogba, Lagos', city: 'Ogba', state: 'Lagos' },
  { name: 'Ikoyi Hub', address: 'Shop D84, Dolphin Plaza, Cooperation Drive, Dolphin Estate, Ikoyi, Lagos', city: 'Ikoyi', state: 'Lagos' },
  { name: 'Ipaja Hub', address: 'C6 Suite7, Ground Floor, Solomon Adeola Lane, Rauf Aregbesola Shopping Mall, Pako Bustop, Ipaja, Lagos', city: 'Ipaja', state: 'Lagos' },
  { name: 'Ojota Hub', address: 'Shop 18, Winter Plaza, 57 Ogudu Road, Ojota, Lagos', city: 'Ojota', state: 'Lagos' },
  { name: 'Ikota Hub', address: 'Shop E110, Road 2, Ikota Shopping Complex, Lagos', city: 'Ikota', state: 'Lagos' },
  { name: 'Osapa London Hub', address: 'Q-Mall, Lekki Beach Rd, Jakande Roundabout, Lekki, Lagos', city: 'Lekki', state: 'Lagos' },
  { name: 'Abuja Hub', address: 'Suite 64, De Avalon Plaza, Ajose Ade Ogun Crescent, Utako, Abuja', city: 'Abuja', state: 'FCT', contact: '+234 903 598 6582' },
  { name: 'Asaba Hub', address: 'Shop 19, Jossy Plaza, Off Abraka Road, Asaba, Delta State', city: 'Asaba', state: 'Delta', contact: '+234 902 561 2043' },
  { name: 'Warri Hub', address: 'Naomi Shopping Plaza, 7 Airport Road, Effurun, Warri, Delta', city: 'Warri', state: 'Delta' },
  { name: 'Ibadan Hub', address: 'Shop F1, Tejumade Square, Ago Tapa, Mokola, Ibadan', city: 'Ibadan', state: 'Oyo', contact: '+234 702 547 8617' },
  { name: 'Benin Hub', address: '16b Avielele Close, Off Ojomoh Street, Off Etete Road, GRA Benin', city: 'Benin', state: 'Edo', contact: '+234 708 271 3300 / +234 701 704 5055' },
  { name: 'Enugu Hub', address: 'Shop C1, Coal City Mega Pavilion Plaza (Tecno Plaza), Market Road, by Egbuna Junction, Ogui Road, Enugu', city: 'Enugu', state: 'Enugu', contact: '+234 802 283 2704' },
  { name: 'Ogun Hub', address: 'Shop 69, Omida Shopping Mall, Omida, Abeokuta, Ogun State', city: 'Abeokuta', state: 'Ogun', contact: '09064188120' },
  { name: 'Port Harcourt Hub', address: 'Roxy Plaza, Opposite Polaris Bank, Rumuodara, Port Harcourt', city: 'Port Harcourt', state: 'Rivers', contact: '+234 703 760 7631' },
  { name: 'Akure Hub', address: 'Cuda Complex, Opp GTBank Alagbaka, Akure', city: 'Akure', state: 'Ondo', contact: '+234 706 579 7706 / 08164928952' },
  { name: 'Osun Hub', address: 'Jato Odedosu Shopping Complex, Ayetoro Road, Owode, Osogbo, Osun State', city: 'Osogbo', state: 'Osun' },
  { name: 'Uyo Hub', address: 'Belderick House, 15 Mbaba Afia Street, Off Aka Road (Near IBB/Aka Road Junction), Uyo', city: 'Uyo', state: 'Akwa Ibom', contact: '+234 813 632 6573' },
];

type Resolution = 'refund';
const JLO_RETURNS_URL = 'https://jlo.julinemart.com/api/returns-create';
const DEFAULT_HUB_ID = '51a0aad5-c866-4ac5-83ef-22ab41ccd063';

function canOrderBeReturned(status: string) {
  return ['delivered', 'completed'].includes(status);
}

function latestReturn(returns: JloReturn[]): JloReturn | null {
  if (!returns?.length) return null;
  return [...returns].sort((a, b) => {
    const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bDate - aDate;
  })[0];
}

function extractHubId(order: Order | null) {
  if (!order?.line_items?.length) return '';
  for (const item of order.line_items) {
    const meta = (item as any)?.meta_data as { key: string; value: any }[] | undefined;
    if (!meta) continue;
    const hubMeta = meta.find((m) => m.key === 'hub_id' || m.key === '_hub_id' || m.key === 'hubId' || m.key === 'hubID');
    if (hubMeta?.value) return String(hubMeta.value);
  }
  return '';
}

export default function ReturnRequestForm({ orderId }: ReturnRequestFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [returns, setReturns] = useState<JloReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({});
  const [preferredResolution, setPreferredResolution] = useState<Resolution>('refund');
  const [complaintType, setComplaintType] = useState('');
  const [reasonNote, setReasonNote] = useState('');
  const [imageUrls, setImageUrls] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [hubSearch, setHubSearch] = useState('');

  // Pickup is only offered once the server says it's enabled.
  const [method, setMethod] = useState<'dropoff' | 'pickup'>('dropoff');
  const [pickupEnabled, setPickupEnabled] = useState(false);
  const [pickup, setPickup] = useState({
    name: '', phone: '', address: '', city: '', state: '', preferred_date: '', notes: '',
  });
  const [quote, setQuote] = useState<PickupQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [feeConfirmed, setFeeConfirmed] = useState(false);
  const hubId = useMemo(() => extractHubId(order) || DEFAULT_HUB_ID, [order]);
  const activeReturn = useMemo(() => latestReturn(returns), [returns]);
  const currency = order?.currency || 'NGN';

  const selectedAmount =
    order?.line_items?.reduce((sum, item) => {
      const qty = selectedItems[item.id] || 0;
      const unitTotal = item.quantity ? Number(item.total) / item.quantity : 0;
      return sum + unitTotal * qty;
    }, 0) || 0;

  const filteredHubs = useMemo(() => {
    const term = hubSearch.toLowerCase();
    if (!term) return FEZ_HUBS;
    return FEZ_HUBS.filter(
      (hub) =>
        hub.name.toLowerCase().includes(term) ||
        (hub.city || '').toLowerCase().includes(term) ||
        (hub.state || '').toLowerCase().includes(term) ||
        hub.address.toLowerCase().includes(term)
    );
  }, [hubSearch]);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  // Is pickup switched on? (Hidden until JLO's pickup setup is in place.)
  useEffect(() => {
    let cancelled = false;
    requestPickupQuote({ probe: true }).then((q) => {
      if (!cancelled) setPickupEnabled(Boolean(q?.enabled));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Start the pickup details from where the order was delivered; the customer
  // can change them (the item may be somewhere else now).
  useEffect(() => {
    if (!order) return;
    setPickup((prev) =>
      prev.address || prev.name
        ? prev
        : {
            ...prev,
            name: `${order.shipping?.first_name || ''} ${order.shipping?.last_name || ''}`.trim(),
            phone: order.billing?.phone || '',
            address: order.shipping?.address_1 || '',
            city: order.shipping?.city || '',
            state: order.shipping?.state || '',
          }
    );
  }, [order]);

  // Quote the pickup (free if it's our fault, otherwise the customer's fee)
  // as soon as we know why and where.
  useEffect(() => {
    setFeeConfirmed(false);
    if (method !== 'pickup' || !order || !complaintType || !pickup.state || !pickup.city) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    const timer = setTimeout(async () => {
      const q = await requestPickupQuote({
        order_id: order.id,
        reason_code: complaintType === 'changed_mind' ? 'changed_mind' : 'other',
        complaint_type: complaintType,
        pickup_state: pickup.state,
        pickup_city: pickup.city,
      });
      if (!cancelled) {
        setQuote(q);
        setQuoteLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [method, order, complaintType, pickup.state, pickup.city]);

  useEffect(() => {
    const fromQuery = searchParams.get('complaint_type');
    if (fromQuery && COMPLAINT_TYPES.some((c) => c.value === fromQuery)) {
      setComplaintType(fromQuery);
    }
    if (searchParams.get('reason') === 'warranty') {
      setReasonNote((prev) => prev || 'Warranty claim — product fault within warranty period.');
    }
  }, [searchParams]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders/${orderId}`, { headers: await getAuthHeader() });
      if (!res.ok) throw new Error('Failed to fetch order');
      const data = await res.json();

      if (!data.order) {
        toast.error('Order not found');
        router.push('/orders');
        return;
      }

      setOrder(data.order);
      setReturns(Array.isArray(data.returns) ? data.returns : []);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    if (!complaintType) return toast.error('Select the type of problem');
    if (complaintType === 'other' && !reasonNote.trim()) return toast.error('Add details about the problem');
    if (method === 'dropoff' && !hubId) return toast.error('Hub not found for this order.');

    if (method === 'pickup') {
      if (!pickup.name.trim() || !pickup.phone.trim() || !pickup.address.trim() || !pickup.city.trim() || !pickup.state.trim()) {
        return toast.error('Enter the pickup contact, address, city and state');
      }
      if (!quote?.available) return toast.error("Pickup isn't available for that area. Please choose drop-off.");
      if (quote.fee > 0 && !feeConfirmed) return toast.error('Please confirm the pickup fee to continue');
    }

    const mappedReasonCode =
      complaintType === 'wrong_product' ? 'wrong_item'
        : complaintType === 'damaged' ? 'damaged'
          : complaintType === 'not_as_described' ? 'not_as_described'
            : complaintType === 'changed_mind' ? 'changed_mind'
              : 'other';

    try {
      setSubmitting(true);

      const urlImages = imageUrls
        .split('\n')
        .map((url) => url.trim())
        .filter(Boolean);
      const images = [...urlImages, ...uploadedImages];

      const response = await fetch(JLO_RETURNS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
        body: JSON.stringify({
          order_id: order.id,
          refund_amount: selectedAmount,
          preferred_resolution: preferredResolution,
          complaint_type: complaintType,
          reason_code: mappedReasonCode,
          reason_note: reasonNote,
          images,
          method,
          ...(method === 'pickup'
            ? {
                pickup: {
                  name: pickup.name.trim(),
                  phone: pickup.phone.trim(),
                  address: pickup.address.trim(),
                  city: pickup.city.trim(),
                  state: pickup.state.trim(),
                  preferred_date: pickup.preferred_date || undefined,
                  notes: pickup.notes.trim() || undefined,
                },
                // The exact fee the customer agreed to; the server refuses if it changed.
                ...(quote && quote.fee > 0 ? { accepted_pickup_fee: quote.fee } : {}),
              }
            : { hub_id: hubId }),
        }),
      });

      const result = await response.json();
      if (!response.ok || result?.success === false) {
        throw new Error(result?.error || result?.message || 'Failed to submit return');
      }

      toast.success('Return request submitted successfully');
      // Reload so the return shows in the same shape as every other return
      // (the raw response here isn't, and would hide the track links).
      await fetchOrder();
    } catch (error: any) {
      console.error('Error submitting return:', error);
      toast.error(error?.message || 'Failed to submit return request');
    } finally {
      setSubmitting(false);
    }
  };

  const toBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
    });

  const handleImageUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    const maxFiles = 5;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 8 * 1024 * 1024;

    const validFiles = Array.from(files).slice(0, maxFiles);
    const errors: string[] = [];

    validFiles.forEach((file) => {
      if (!allowed.includes(file.type)) errors.push(`${file.name}: invalid type`);
      if (file.size > maxSize) errors.push(`${file.name}: above 8MB`);
    });

    if (errors.length) {
      toast.error(errors.join('. '));
      return;
    }

    try {
      const base64 = await Promise.all(validFiles.map((f) => toBase64(f)));
      setUploadedImages((prev) => [...prev, ...base64].slice(0, maxFiles));
    } catch {
      toast.error('Could not process images');
    }
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const renderShipment = (shipment: JloReturnShipment | undefined) => {
    if (!shipment) return null;
    const tracking = shipment.tracking_number;
    const trackingUrl = buildFezTrackingUrl(tracking);

    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-1">
        <div className="flex items-center gap-2 text-blue-900 font-semibold">
          <MapPin className="w-4 h-4" />
          <span className="capitalize">{activeReturn?.method === 'pickup' ? 'Pickup Shipment' : 'Dropoff Shipment'}</span>
        </div>
        {shipment.return_code && <p className="text-sm text-blue-800">Return Code: {shipment.return_code}</p>}
        {tracking && <p className="text-sm text-blue-800">Tracking: {tracking}</p>}
        {shipment.status && <p className="text-sm text-blue-800">Status: {shipment.status}</p>}
        {trackingUrl ? (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-sm font-medium text-blue-700 underline"
          >
            Track shipment
          </a>
        ) : null}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h2>
          <Link href="/orders" className="text-primary-600 hover:underline">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const eligible = canOrderBeReturned(order.status);
  const activeShipment = activeReturn?.return_shipment;
  const returnCode = activeShipment?.return_code || activeReturn?.return_code || '--';
  const returnId = activeReturn?.return_request_id;

  if (activeReturn) {
    const statusDisplay = formatJloReturnStatus(activeReturn.status);
    const refundDisplay = formatJloRefundStatus(activeReturn.refund_status || 'none');

    return (
      <main className="min-h-screen bg-gray-50 pb-24">
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="flex items-center gap-4 mb-6">
            <Link href={`/orders/${orderId}`} className="text-gray-600 hover:text-primary-600">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Return Status</h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-4">
              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${statusDisplay.bgColor} ${statusDisplay.color}`}
              >
                {statusDisplay.label}
              </span>
              <span className="text-gray-600 text-sm">
                Requested {activeReturn.created_at ? new Date(activeReturn.created_at).toLocaleString() : ''}
              </span>
            </div>

            <div className="grid gap-3 text-sm text-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-600">Order</span>
                <span className="font-semibold">#{order.number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Resolution</span>
                <span className="font-semibold capitalize">{activeReturn.preferred_resolution || 'refund'}</span>
              </div>
              {activeReturn.reason_code ? (
                <div className="flex justify-between">
                  <span className="text-gray-600">Reason</span>
                  <span className="font-semibold">{activeReturn.reason_code}</span>
                </div>
              ) : null}
              {activeReturn.reason_note ? (
                <div>
                  <p className="text-gray-600 mb-1">Details</p>
                  <p className="text-gray-900">{activeReturn.reason_note}</p>
                </div>
              ) : null}
            </div>

            {renderShipment(activeShipment)}

            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-indigo-800">Return Code</p>
                  <p className="text-xl font-bold text-indigo-900">{returnCode}</p>
                </div>
                {returnId ? (
                  <div className="flex gap-2">
                    {activeReturn.method !== 'pickup' ? (
                      <Link
                        href={`/returns/${returnId}/add-tracking`}
                        className="px-3 py-2 rounded-md bg-white text-indigo-700 border border-indigo-200 text-sm font-semibold hover:bg-indigo-100"
                      >
                        Add tracking number
                      </Link>
                    ) : null}
                    {activeShipment?.tracking_number ? (
                      <a
                        href={buildFezTrackingUrl(activeShipment.tracking_number) || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
                      >
                        Track return
                      </a>
                    ) : (
                      <Link
                        href={`/returns/${returnId}/track`}
                        className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
                      >
                        Track return
                      </Link>
                    )}
                  </div>
                ) : null}
              </div>
              {activeReturn.method === 'pickup' ? (
                <div className="space-y-3 text-sm text-indigo-900">
                  <div>
                    <p className="font-semibold">1) Package your item securely</p>
                    <p>Put your return code inside the package.</p>
                  </div>
                  <div>
                    <p className="font-semibold">2) We collect it from you</p>
                    {activeReturn.pickup ? (
                      <p>
                        {[activeReturn.pickup.address, activeReturn.pickup.city, activeReturn.pickup.state].filter(Boolean).join(', ')}
                        {activeReturn.pickup.preferred_date ? `. Preferred day: ${activeReturn.pickup.preferred_date}` : ''}
                      </p>
                    ) : null}
                    <p>
                      {activeReturn.status === 'pending_review'
                        ? "We're reviewing your request. Once it's approved we'll arrange the pickup and let you know."
                        : activeReturn.pickup_lane === 'local_rider'
                        ? 'A JulineMart rider will collect it. Please keep your phone on.'
                        : 'A courier will collect it. Please keep your phone on.'}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold">3) Pickup cost</p>
                    <p>
                      {Number(activeReturn.pickup_fee || 0) > 0
                        ? `${formatPrice(Number(activeReturn.pickup_fee), currency)} will be deducted from your refund.`
                        : 'Free: the problem is on our side.'}
                    </p>
                  </div>
                </div>
              ) : (
              <>
              <div className="space-y-3 text-sm text-indigo-900">
                <div>
                  <p className="font-semibold">1) Package your item securely</p>
                  <p>Include your return code inside the package.</p>
                </div>
                <div>
                  <p className="font-semibold">2) Take it to the nearest Fez Delivery location</p>
                  <p>Destination: JulineMart Warri Hub, No. 9 Jesus is Lord Street, Effurun, Warri, Delta</p>
                  <a
                    href="https://www.fezdelivery.co/blogz/the-closest-fez-delivery-office-to-you-a-highlight-of-fez-delivery-hubs-nationwide"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-700 underline font-medium"
                  >
                    Find Fez location near you
                  </a>
                </div>
                <div>
                  <p className="font-semibold">3) Get a tracking number from Fez</p>
                  <p>They&apos;ll share it on the waybill/receipt.</p>
                </div>
                <div>
                  <p className="font-semibold">4) Enter the tracking number</p>
                  <p>Share it with us so we can monitor your return.</p>
                </div>
              </div>
              {order?.shipping?.state || order?.billing?.state ? (
                <div className="rounded-md border border-indigo-100 bg-white/70 p-3 text-sm text-indigo-900">
                  <p className="font-semibold mb-1">Nearby Fez locations (suggested)</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Search Fez Delivery in {order.shipping?.state || order.billing?.state}</li>
                    <li>Ask the attendant to tag destination as JulineMart Warri Hub</li>
                    <li>Keep your waybill — it has your tracking number</li>
                  </ul>
                </div>
              ) : null}
              </>
              )}
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-2">
              <p className="text-sm font-semibold text-emerald-900">Refund Status</p>
              <span
                className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${refundDisplay.bgColor} ${refundDisplay.color}`}
              >
                {refundDisplay.label}
              </span>
              {activeReturn.refund_amount ? (
                <p className="text-sm text-emerald-900">
                  Amount: {formatPrice(activeReturn.refund_amount, activeReturn.refund_currency || currency)}
                </p>
              ) : null}
              {activeReturn.refund_completed_at ? (
                <p className="text-xs text-emerald-800">
                  Completed: {new Date(activeReturn.refund_completed_at).toLocaleString()}
                </p>
              ) : null}
            </div>

            <Link
              href={`/orders/${orderId}`}
              className="block w-full text-center py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
            >
              Back to Order
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!eligible) {
    return (
      <main className="min-h-screen bg-gray-50 pb-24">
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="flex items-center gap-4 mb-6">
            <Link href={`/orders/${orderId}`} className="text-gray-600 hover:text-primary-600">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Request Return</h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Not Eligible for Return</h2>
              <p className="text-gray-600 mb-6">Returns are available after your order is delivered/completed.</p>
              <Link
                href={`/orders/${orderId}`}
                className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Back to Order
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/orders/${orderId}`} className="text-gray-600 hover:text-primary-600">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Request Return</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Order Number</span>
              <span className="font-medium">#{order.number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Order Date</span>
              <span className="font-medium">{new Date(order.date_created).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Select items to return</h2>
          <div className="space-y-4">
            {order.line_items.map((item) => {
              const selectedQty = selectedItems[item.id] || 0;
              const unitPrice = item.quantity ? Number(item.total) / item.quantity : 0;
              return (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">Ordered qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm text-gray-600">{formatPrice(unitPrice, currency)} each</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-700">Return qty</label>
                    <input
                      type="number"
                      min={0}
                      max={item.quantity}
                      value={selectedQty}
                      onChange={(e) => {
                        const value = Math.min(Math.max(parseInt(e.target.value, 10) || 0, 0), item.quantity);
                        setSelectedItems((prev) => ({ ...prev, [item.id]: value }));
                      }}
                      className="w-24 border border-gray-300 rounded-lg px-3 py-2"
                    />
                    <span className="text-sm text-gray-700">Value: {formatPrice(unitPrice * selectedQty, currency)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex justify-between text-sm text-gray-700">
            <span>Estimated value</span>
            <span className="font-semibold">{formatPrice(selectedAmount, currency)}</span>
          </div>
        </div>

        <form className="bg-white rounded-xl shadow-sm p-6 space-y-5" onSubmit={handleSubmit}>
          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Return method</h2>
            <div className="grid grid-cols-1 gap-3">
              <label
                className={`border rounded-lg p-3 cursor-pointer ${
                  method === 'dropoff' ? 'bg-primary-50 border-primary-600' : 'border-gray-200 bg-white'
                }`}
              >
                <input type="radio" name="return_method" className="sr-only" checked={method === 'dropoff'} onChange={() => setMethod('dropoff')} />
                <p className="font-semibold text-gray-900">Drop off at a Fez location (free)</p>
                <p className="text-xs text-gray-600">Take your item to any Fez Delivery location near you.</p>
                <p className="text-xs text-gray-700 mt-2">You'll get a tracking number to monitor your return.</p>
              </label>
              {pickupEnabled ? (
                <label
                  className={`border rounded-lg p-3 cursor-pointer ${
                    method === 'pickup' ? 'bg-primary-50 border-primary-600' : 'border-gray-200 bg-white'
                  }`}
                >
                  <input type="radio" name="return_method" className="sr-only" checked={method === 'pickup'} onChange={() => setMethod('pickup')} />
                  <p className="font-semibold text-gray-900">We collect it from you</p>
                  <p className="text-xs text-gray-600">A rider or courier picks the item up from your address.</p>
                  <p className="text-xs text-gray-700 mt-2">
                    Free when the problem is on our side. Otherwise a pickup fee is taken off your refund.
                  </p>
                </label>
              ) : null}
            </div>
          </div>

          {method === 'pickup' ? (
            <div className="rounded-xl border border-gray-100 p-4 space-y-3">
              <h2 className="font-semibold text-gray-900">Pickup details</h2>
              <p className="text-sm text-gray-600">Where should we collect the item from?</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={pickup.name}
                  onChange={(e) => setPickup((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Contact name"
                  autoComplete="name"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  value={pickup.phone}
                  onChange={(e) => setPickup((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="Phone (08012345678)"
                  autoComplete="tel"
                  inputMode="tel"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <input
                value={pickup.address}
                onChange={(e) => setPickup((p) => ({ ...p, address: e.target.value }))}
                placeholder="Street address"
                autoComplete="street-address"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={pickup.city}
                  onChange={(e) => setPickup((p) => ({ ...p, city: e.target.value }))}
                  placeholder="Town / city"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  value={pickup.state}
                  onChange={(e) => setPickup((p) => ({ ...p, state: e.target.value }))}
                  placeholder="State"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-gray-600">
                  Preferred day (optional)
                  <input
                    type="date"
                    value={pickup.preferred_date}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setPickup((p) => ({ ...p, preferred_date: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-gray-600">
                  Note for the rider (optional)
                  <input
                    value={pickup.notes}
                    onChange={(e) => setPickup((p) => ({ ...p, notes: e.target.value }))}
                    maxLength={300}
                    placeholder="Gate code, landmark…"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </label>
              </div>

              {!complaintType ? (
                <p className="text-sm text-gray-600">Choose the problem below to see what the pickup costs.</p>
              ) : quoteLoading ? (
                <p className="text-sm text-gray-600">Checking the pickup cost…</p>
              ) : quote && !quote.available ? (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  We can&apos;t collect from that area yet. Please choose drop-off instead.
                </p>
              ) : quote?.free ? (
                <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  Pickup is free. The problem is on our side, so we cover it.
                </p>
              ) : quote ? (
                <div className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                  <p>
                    Pickup costs <strong>{formatPrice(quote.fee, currency)}</strong>. It&apos;s taken off your refund. Drop-off is free.
                  </p>
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={feeConfirmed}
                      onChange={(e) => setFeeConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4"
                    />
                    <span>I agree that {formatPrice(quote.fee, currency)} will be deducted from my refund.</span>
                  </label>
                </div>
              ) : null}
            </div>
          ) : null}

          {method === 'dropoff' ? (
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-3 border border-gray-100">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-gray-900">Nearby Fez Hubs</h2>
              <input
                value={hubSearch}
                onChange={(e) => setHubSearch(e.target.value)}
                placeholder="Search city/state"
                className="w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <p className="text-sm text-gray-600">Find the closest drop-off hub. Tap a hub to view on map.</p>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {filteredHubs.map((hub, idx) => (
                <a
                  key={`${hub.name}-${idx}`}
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hub.name}, ${hub.address}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block border border-gray-200 rounded-lg p-3 hover:border-primary-300 hover:bg-primary-50/40 transition"
                >
                  <p className="font-semibold text-gray-900">{hub.name}</p>
                  <p className="text-sm text-gray-700">{hub.address}</p>
                  {hub.contact ? <p className="text-xs text-gray-600 mt-1">Contact: {hub.contact}</p> : null}
                </a>
              ))}
              {filteredHubs.length === 0 ? <p className="text-sm text-gray-500">No hubs match your search.</p> : null}
            </div>
          </div>
          ) : null}

          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Report a problem</h2>
            <div className="space-y-2">
              {COMPLAINT_TYPES.map((item) => (
                <label
                  key={item.value}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-3 cursor-pointer transition ${
                    complaintType === item.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 bg-white active:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="complaint_type"
                    value={item.value}
                    checked={complaintType === item.value}
                    onChange={() => setComplaintType(item.value)}
                    className="h-4 w-4 text-primary-600"
                  />
                  <span className="text-sm text-gray-900">{item.label}</span>
                </label>
              ))}
              <textarea
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm"
                rows={3}
                placeholder="Add more details or upload photos below"
                required={complaintType === 'other'}
              />
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Photos (optional)</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 border border-dashed border-gray-300 rounded-lg p-3 cursor-pointer hover:border-primary-500 transition">
                <Image className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Upload photos</p>
                  <p className="text-xs text-gray-600">Add up to 5 images (JPEG, PNG, WEBP, max 8MB each).</p>
                </div>
                <input type="file" accept="image/*" multiple onChange={(e) => handleImageUpload(e.target.files)} className="hidden" />
              </label>

              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {uploadedImages.map((src, idx) => (
                    <div key={idx} className="relative rounded-lg overflow-hidden border border-gray-200">
                      <img src={src} alt={`Uploaded ${idx + 1}`} className="h-24 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeUploadedImage(idx)}
                        className="absolute top-1 right-1 bg-white/80 text-xs px-2 py-1 rounded hover:bg-white"
                        aria-label="Remove image"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-start gap-3">
                <Image className="w-5 h-5 text-gray-500 mt-1" />
                <textarea
                  value={imageUrls}
                  onChange={(e) => setImageUrls(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Paste image URLs (one per line)"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Submit Return Request'}
          </button>
        </form>
      </div>
    </main>
  );
}
