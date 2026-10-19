import Spinner from './spinner';

interface PageLoadingProps {
  text?: string;
}

/** Whole-page loading state: a small spinner and a short line of text, centred. */
export default function PageLoading({ text = 'Loading...' }: PageLoadingProps) {
  return (
    <main className="flex min-h-[70dvh] items-center justify-center p-4" aria-busy="true">
      {/* Full-screen backdrop, so no band of page background shows below the centred block. */}
      <div aria-hidden className="fixed inset-0 -z-10 bg-gray-50" />
      <div role="status" className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        {text && <p className="text-sm text-gray-500">{text}</p>}
      </div>
    </main>
  );
}
