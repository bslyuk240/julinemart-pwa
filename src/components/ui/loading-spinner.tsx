import Spinner from './spinner';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
}

/** Spinner with an optional caption. Kept for existing callers; new code can use Spinner or PageLoading. */
export default function LoadingSpinner({ size = 'md', text = 'Loading...', fullScreen = false }: LoadingSpinnerProps) {
  const content = (
    <div role="status" className="flex flex-col items-center justify-center gap-3">
      <Spinner size={size === 'sm' ? 'sm' : size === 'md' ? 'md' : 'lg'} />
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}
