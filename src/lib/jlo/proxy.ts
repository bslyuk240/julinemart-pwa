/** Server-side JLO Netlify function proxy helpers for PWA API routes. */

export function getJloBaseUrl(): string {
  return (
    process.env.JLO_API_BASE_URL ||
    process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
    ''
  ).replace(/\/$/, '');
}

export type JloProxyResult<T = unknown> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string; detail?: string };

/**
 * Fetch a JLO Netlify function and parse JSON safely.
 * Non-JSON (SPA HTML / Netlify 404 page) usually means the function is not deployed yet.
 */
export async function fetchJloFunction<T = unknown>(
  functionPath: string,
  init?: RequestInit
): Promise<JloProxyResult<T>> {
  const base = getJloBaseUrl();
  if (!base) {
    return {
      ok: false,
      status: 503,
      error: 'Catalog not configured. Set JLO_API_BASE_URL or NEXT_PUBLIC_JLO_CATALOG_URL.',
    };
  }

  const path = functionPath.replace(/^\//, '');
  const url = `${base}/.netlify/functions/${path}`;

  try {
    const res = await fetch(url, init);
    const text = await res.text();

    try {
      const data = JSON.parse(text) as T;
      if (!res.ok) {
        const err = (data as { error?: string; message?: string })?.error
          || (data as { message?: string })?.message
          || `JLO returned ${res.status}`;
        return { ok: false, status: res.status, error: err, detail: text.slice(0, 300) };
      }
      return { ok: true, status: res.status, data };
    } catch {
      const looksLikeHtml = text.trimStart().startsWith('<!');
      return {
        ok: false,
        status: 502,
        error: looksLikeHtml
          ? 'Gift API not found on JLO — deploy julinemart-logistics-orchestrator or set JLO_API_BASE_URL=http://localhost:8888 with netlify dev running.'
          : 'Invalid response from JLO catalog API.',
        detail: text.slice(0, 200),
      };
    }
  } catch (err) {
    return {
      ok: false,
      status: 502,
      error: 'Could not reach JLO catalog API.',
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}
