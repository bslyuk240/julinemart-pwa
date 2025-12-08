'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Package, AlertCircle, Loader2, MapPin, Image, Info } from 'lucide-react';
import { Order } from '@/types/order';
import { formatPrice } from '@/lib/utils/format-price';
import { JloReturn, JloReturnShipment, formatJloRefundStatus, formatJloReturnStatus, buildFezTrackingUrl } from '@/lib/jlo/returns';

interface ReturnRequestFormProps {
  orderId: number;
}

const RETURN_REASONS = [
  { value: 'wrong_item', label: 'Wrong item' },
  { value: 'damaged', label: 'Item damaged' },
  { value: 'not_as_described', label: 'Not as described' },
  { value: 'other', label: 'Other (add details)' },
];

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

type Resolution = 'refund' | 'replacement';
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
  const [order, setOrder] = useState<Order | null>(null);
  const [returns, setReturns] = useState<JloReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({});
  const [preferredResolution, setPreferredResolution] = useState<Resolution>('refund');
  const [reasonCode, setReasonCode] = useState('');
  const [reasonNote, setReasonNote] = useState('');
  const [imageUrls, setImageUrls] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [hubSearch, setHubSearch] = useState('');

  const method: 'dropoff' = 'dropoff';
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

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders/${orderId}`);
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

    if (!reasonCode) return toast.error('Select a reason for your return');
    if (reasonCode === 'other' && !reasonNote.trim()) return toast.error('Add details for your return');
    if (!hubId) return toast.error('Hub not found for this order.');

    try {
      setSubmitting(true);

      const urlImages = imageUrls
        .split('\n')
        .map((url) => url.trim())
        .filter(Boolean);
      const images = [...urlImages, ...uploadedImages];

      const response = await fetch(JLO_RETURNS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          refund_amount: selectedAmount,
          preferred_resolution: preferredResolution,
          reason_code: reasonCode,
          reason_note: reasonNote,
          images,
          method,
          hub_id: hubId,
        }),
      });

      const result = await response.json();
      if (!response.ok || result?.success === false) {
        throw new Error(result?.error || result?.message || 'Failed to submit return');
      }

      const payload = result?.data ?? result;
      const createdReturn = payload?.return_request || payload;

      toast.success('Return request submitted successfully');
      if (createdReturn) {
        setReturns((prev) => [createdReturn, ...prev]);
      } else {
        await fetchOrder();
      }
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
          <span className="capitalize">Dropoff Shipment</span>
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
                    <Link
                      href={`/returns/${returnId}/add-tracking`}
                      className="px-3 py-2 rounded-md bg-white text-indigo-700 border border-indigo-200 text-sm font-semibold hover:bg-indigo-100"
                    >
                      Add tracking number
                    </Link>
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
            <h2 className="font-semibold text-gray-900 mb-3">Preferred resolution</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['refund', 'replacement'] as Resolution[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPreferredResolution(option)}
                  className={`border rounded-lg p-3 text-left transition ${
                    preferredResolution === option ? 'border-primary-600 bg-primary-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <p className="font-semibold text-gray-900 capitalize">{option}</p>
                  <p className="text-xs text-gray-600">
                    {option === 'refund' ? 'Refund after inspection' : 'Replacement if stock is available'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Return method</h2>
            <div className="grid grid-cols-1 gap-3">
              <div className="border rounded-lg p-3 bg-primary-50 border-primary-600">
                <p className="font-semibold text-gray-900">Ship via Courier</p>
                <p className="text-xs text-gray-600">Take your item to any Fez Delivery location near you.</p>
                <p className="text-xs text-gray-700 mt-2">You'll get a tracking number to monitor your return.</p>
              </div>
            </div>
          </div>

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

          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Reason for return</h2>
            <div className="space-y-2">
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              >
                <option value="">Select a reason</option>
                {RETURN_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <textarea
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                rows={3}
                placeholder="Add more details (helps us process faster)"
                required={reasonCode === 'other'}
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
