import LoadingSpinner from './loading-spinner';

interface PageLoadingProps {
  text?: string;
}

export default function PageLoading({ text = 'Loading...' }: PageLoadingProps) {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <LoadingSpinner size="xl" text={text} />
      </div>
    </main>
  );
}