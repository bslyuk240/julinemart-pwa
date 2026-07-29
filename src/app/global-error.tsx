'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          padding: '24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>😕</div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: '#111' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px', maxWidth: '320px' }}>
            We&apos;ve been notified and are looking into it. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '10px 24px',
              background: '#7c3aed',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
