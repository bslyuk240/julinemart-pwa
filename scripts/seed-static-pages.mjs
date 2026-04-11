import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const envPath = path.join(repoRoot, '.env.local');

function parseEnv(content) {
  const env = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    env[key] = value;
  }
  return env;
}

async function loadEnv() {
  const content = await fs.readFile(envPath, 'utf8');
  const env = parseEnv(content);
  Object.assign(process.env, env);
}

function deriveProjectRefFromAnonKey(anonKey) {
  if (!anonKey) return null;

  const parts = anonKey.split('.');
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payloadJson = Buffer.from(padded, 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson);
    return typeof payload.ref === 'string' && payload.ref ? payload.ref : null;
  } catch {
    return null;
  }
}

function resolveSupabaseUrl() {
  const explicitUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || null;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const projectRef = deriveProjectRefFromAnonKey(anonKey);

  if (!projectRef) return explicitUrl;
  if (!explicitUrl) return `https://${projectRef}.supabase.co`;

  try {
    const hostname = new URL(explicitUrl).hostname;
    if (hostname.includes(projectRef)) return explicitUrl;
  } catch {
    // Fall through to the derived project URL.
  }

  return `https://${projectRef}.supabase.co`;
}

function resolveSupabaseKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    null
  );
}

function resolveWpUrl() {
  return process.env.NEXT_PUBLIC_WP_URL || process.env.WP_URL || null;
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonWithRetry(url, attempts = 3, timeoutMs = 15000) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'JulineMart static page seeder',
          Accept: 'application/json',
        },
      });

      clearTimeout(timer);
      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} for ${url}`);
      } else {
        return await response.json();
      }
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
    }

    if (attempt < attempts) {
      await wait(1000 * attempt);
    }
  }

  throw lastError ?? new Error(`Failed to fetch ${url}`);
}

const pageGroups = [
  { canonicalSlug: 'about', targetSlugs: ['about'] },
  { canonicalSlug: 'contact', targetSlugs: ['contact'] },
  { canonicalSlug: 'acceptable-use-policy', targetSlugs: ['acceptable-use-policy'] },
  { canonicalSlug: 'privacy-policy', targetSlugs: ['privacy-policy'] },
  {
    canonicalSlug: 'refund_returns',
    targetSlugs: ['refund_returns', 'refund-and-returns-policy', 'refund-policy'],
  },
  {
    canonicalSlug: 'terms-of-service',
    targetSlugs: ['terms-of-service', 'terms-and-conditions'],
  },
  { canonicalSlug: 'shipping-policy', targetSlugs: ['shipping-policy'] },
  { canonicalSlug: 'become-a-vendor', targetSlugs: ['become-a-vendor'] },
  { canonicalSlug: 'account-deletion', targetSlugs: ['account-deletion'] },
];

const fallbackPages = {
  'shipping-policy': {
    title: 'Shipping Policy',
    content: `
      <p><strong>Shipping Policy</strong></p>
      <p>Shipping rates are calculated at checkout based on destination, package size, and the selected delivery method.</p>
      <p><strong>Fulfillment</strong></p>
      <ul class="wp-block-list">
        <li>Orders are processed as quickly as possible after confirmation.</li>
        <li>Delivery estimates vary by courier and destination.</li>
        <li>Tracking details are provided where available.</li>
        <li>Support can help with shipment questions after checkout.</li>
      </ul>
      <p><strong>Delivery Expectations</strong></p>
      <ul class="wp-block-list">
        <li>Standard handling may take 24-48 hours before dispatch.</li>
        <li>Remote locations may take longer than major cities.</li>
        <li>Shipping fees are non-refundable unless stated otherwise.</li>
      </ul>
    `.trim(),
  },
  'account-deletion': {
    title: 'JulineMart Account Deletion',
    content: `
      <p><strong>Privacy Request</strong></p>
      <p>Users may request deletion of their JulineMart account and associated personal data at any time.</p>
      <p><strong>How to request account deletion</strong></p>
      <p>Send a deletion request to <a href="mailto:info@julinemart.com">info@julinemart.com</a> from the email address registered on your JulineMart account. Our team will verify your identity before the request is processed.</p>
      <p><strong>What data will be deleted</strong></p>
      <ul class="wp-block-list">
        <li>Profile information</li>
        <li>Saved addresses</li>
        <li>Login credentials</li>
        <li>Preferences</li>
        <li>Marketing data</li>
      </ul>
      <p><strong>Data that may be retained</strong></p>
      <ul class="wp-block-list">
        <li>Transaction records, retained for up to 7 years for tax and accounting compliance</li>
        <li>Vendor payout records, retained for up to 7 years</li>
        <li>Support communications, retained for up to 3 years</li>
      </ul>
      <p><strong>Backup retention</strong></p>
      <p>Deleted data may remain in secure backups for up to 90 days before permanent removal.</p>
      <p><strong>Support contact</strong></p>
      <p>For account deletion requests or follow-up questions, contact <a href="mailto:info@julinemart.com">info@julinemart.com</a>.</p>
    `.trim(),
  },
};

async function fetchWpPageBySlug(baseUrl, slug) {
  const endpoints = ['pages', 'posts', 'awsm_job_openings'];

  for (const endpoint of endpoints) {
    const url = `${baseUrl.replace(/\/+$/, '')}/wp-json/wp/v2/${endpoint}?slug=${encodeURIComponent(slug)}`;
    let data;
    try {
      data = await fetchJsonWithRetry(url);
    } catch (error) {
      console.error(`Failed to fetch ${slug} from ${endpoint}:`, error?.message || error);
      continue;
    }

    if (!Array.isArray(data) || data.length === 0) continue;

    const page = data[0];
    return {
      id: String(page.id ?? slug),
      title: page.title?.rendered ?? '',
      content: page.content?.rendered ?? '',
      slug: page.slug ?? slug,
      date: page.date ?? '',
      modified: page.modified ?? page.date ?? '',
      link: page.link ?? `/page/${slug}`,
    };
  }

  return null;
}

function buildVendorPageContent(content) {
  return String(content ?? '').replace(
    /href=(['"])https:\/\/admin\.julinemart\.com\/vendor-register\/?\1/gi,
    'href="https://vendors.julinemart.com"'
  );
}

async function main() {
  await loadEnv();

  const supabaseUrl = resolveSupabaseUrl();
  const supabaseKey = resolveSupabaseKey();
  const wpUrl = resolveWpUrl();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase URL or service role key in environment.');
  }

  if (!wpUrl) {
    throw new Error('Missing NEXT_PUBLIC_WP_URL in environment.');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rows = [];
  const missing = [];

  for (const group of pageGroups) {
    const sourcePage = await fetchWpPageBySlug(wpUrl, group.canonicalSlug);
    const fallbackPage = fallbackPages[group.canonicalSlug];
    if (!sourcePage && !fallbackPage) {
      missing.push(group.canonicalSlug);
      continue;
    }

    const title = (sourcePage?.title ?? fallbackPage?.title ?? '').trim();
    const sourceContent = sourcePage?.content ?? fallbackPage?.content ?? '';
    const content = group.canonicalSlug === 'become-a-vendor'
      ? buildVendorPageContent(sourceContent)
      : sourceContent;
    const createdAt = sourcePage?.date || new Date().toISOString();
    const updatedAt = sourcePage?.modified || sourcePage?.date || new Date().toISOString();

    for (const slug of group.targetSlugs) {
      rows.push({
        slug,
        title,
        content,
        seo_title: null,
        seo_description: null,
        is_active: true,
        created_at: createdAt,
        updated_at: updatedAt,
      });
    }
  }

  if (rows.length === 0) {
    throw new Error('No static pages were collected for seeding.');
  }

  const { data, error } = await supabase
    .from('static_pages')
    .upsert(rows, { onConflict: 'slug' })
    .select('slug');

  if (error) {
    throw error;
  }

  console.log(`Seeded ${data?.length ?? 0} static pages into Supabase.`);
  if (missing.length > 0) {
    console.log(`Missing source pages: ${missing.join(', ')}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
