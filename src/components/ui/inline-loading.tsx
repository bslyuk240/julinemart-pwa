import Spinner from './spinner';

interface InlineLoadingProps {
  size?: number;
  className?: string;
}

/** Small spinner that inherits the text colour. Kept for existing callers; prefer Spinner. */
export default function InlineLoading({ size = 16, className = '' }: InlineLoadingProps) {
  return <Spinner size={size <= 20 ? 'sm' : size <= 28 ? 'md' : 'lg'} tone="current" className={className} />;
}
