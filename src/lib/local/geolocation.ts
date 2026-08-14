/** Client-side geolocation helpers for local discovery. */

export type GeoCoords = { latitude: number; longitude: number };

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

export function requestCurrentPosition(): Promise<GeoCoords> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported on this device'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
    );
  });
}

export const CHECKOUT_FULFILLMENT_KEY = 'jlo_checkout_fulfillment';

export type CheckoutFulfillmentPref = 'delivery' | 'store_pickup' | 'reservation';

export function readCheckoutFulfillmentPref(): CheckoutFulfillmentPref | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(CHECKOUT_FULFILLMENT_KEY);
  if (raw === 'store_pickup' || raw === 'reservation' || raw === 'delivery') return raw;
  return null;
}

export function setCheckoutFulfillmentPref(value: CheckoutFulfillmentPref) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(CHECKOUT_FULFILLMENT_KEY, value);
}

export function clearCheckoutFulfillmentPref() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(CHECKOUT_FULFILLMENT_KEY);
}
