/**
 * Courier-ready checkout rules. Keep in sync with
 * julinemart-logistics-orchestrator/netlify/functions/services/deliveryDetails.js
 */

import { NIGERIAN_STATES } from '@/lib/constants/nigeria-states';

const STATE_ALIASES: Record<string, string> = {
  fct: 'FCT',
  abuja: 'FCT',
  'federal capital territory': 'FCT',
  akwaibom: 'Akwa Ibom',
  'akwa-ibom': 'Akwa Ibom',
  crossriver: 'Cross River',
  'cross-river': 'Cross River',
};

const CITY_MAY_MATCH_STATE = new Set([
  'lagos',
  'fct',
  'kano',
  'kaduna',
  'katsina',
  'sokoto',
  'bauchi',
  'gombe',
]);

function fold(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[._,]/g, ' ')
    .replace(/\s+/g, ' ');
}

function stripStateSuffix(value: unknown): string {
  return fold(value).replace(/\s+state$/, '').trim();
}

export function normalizeNigerianState(raw: unknown): string {
  const folded = stripStateSuffix(raw);
  if (!folded) return '';
  const compact = folded.replace(/[\s-]/g, '');
  const alias = STATE_ALIASES[folded] || STATE_ALIASES[compact];
  if (alias) return alias;
  return NIGERIAN_STATES.find((state) => fold(state) === folded) || '';
}

export function cityLooksLikeState(city: unknown, state: unknown): boolean {
  const rawCity = String(city || '').trim();
  if (/\bstate$/i.test(rawCity)) return true;
  const cityFolded = stripStateSuffix(city);
  if (!cityFolded) return false;
  const destState = normalizeNigerianState(state);
  const cityAsState = normalizeNigerianState(city);
  if (!cityAsState || !destState) return false;
  if (fold(cityAsState) !== fold(destState)) return false;
  return !CITY_MAY_MATCH_STATE.has(fold(cityAsState));
}

export function sanitizePersonName(raw: unknown): string {
  return String(raw || '')
    .replace(/[^A-Za-zÀ-ÿ' -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isFullPersonName(raw: unknown): boolean {
  const tokens = sanitizePersonName(raw)
    .split(' ')
    .filter((part) => part.replace(/['-]/g, '').length >= 2);
  return tokens.length >= 2;
}

export function isValidEmail(raw: unknown): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(raw || '').trim());
}

export function localNgPhoneDigits(raw: unknown): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('234')) return digits.slice(3);
  if (digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export function isValidNgPhone(raw: unknown): boolean {
  return /^[789]\d{9}$/.test(localNgPhoneDigits(raw));
}

export function namePartError(raw: unknown, label: string): string | null {
  const cleaned = sanitizePersonName(raw);
  if (!cleaned) return `${label} is required`;
  if (cleaned.replace(/['-]/g, '').length < 2) return `${label} is too short`;
  return null;
}

export function fullNameError(raw: unknown, label = 'Full name'): string | null {
  const cleaned = sanitizePersonName(raw);
  if (!cleaned) return `${label} is required`;
  if (!isFullPersonName(cleaned)) {
    return `${label} must be first and last name (e.g. John Doe)`;
  }
  return null;
}

export function cityError(city: unknown, state: unknown): string | null {
  const trimmed = String(city || '').trim();
  if (!trimmed) return 'City / town is required';
  if (cityLooksLikeState(trimmed, state)) {
    const destState = normalizeNigerianState(state) || normalizeNigerianState(city);
    return `Enter the town, not the state (e.g. Akure — not ${destState || 'Ondo'} State)`;
  }
  return null;
}

export function streetError(raw: unknown): string | null {
  const trimmed = String(raw || '').trim();
  if (!trimmed || trimmed.length < 5) return 'Enter a street address (not just the city)';
  return null;
}

export function phoneError(raw: unknown): string | null {
  if (!String(raw || '').trim()) return 'Phone number is required';
  if (!isValidNgPhone(raw)) return 'Enter a valid Nigerian phone number (e.g. 08012345678)';
  return null;
}

export function emailError(raw: unknown, required = true): string | null {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return required ? 'Email is required' : null;
  if (!isValidEmail(trimmed)) return 'Enter a valid email address';
  return null;
}

export function firstError(errors: Array<string | null | undefined>): string | null {
  return errors.find((message): message is string => Boolean(message)) || null;
}
