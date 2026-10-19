import Spinner from './spinner';

interface PageLoadingProps {
  text?: string;
}

/** Whole-page loading state: a small spinner and a short line of text, centred. */
export default function PageLoading({ text = 'Loading...' }: PageLoadingProps) {
  return (
    <main className="flex min-h-[70dvh] items-center justify-center bg-gray-50 p-4" aria-busy="true">
      <div role="status" className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        {text && <p className="text-sm text-gray-500">{text}</p>}
      </div>
    </main>
  );
}
