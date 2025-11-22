import Image from 'next/image';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
}

export default function LoadingSpinner({ 
  size = 'md', 
  text = 'Loading...',
  fullScreen = false 
}: LoadingSpinnerProps) {
  const logoSrc = process.env.NEXT_PUBLIC_LOGO_URL || '/images/logo.png';
  
  const sizes = {
    sm: { width: 32, height: 32, text: 'text-xs' },
    md: { width: 48, height: 48, text: 'text-sm' },
    lg: { width: 64, height: 64, text: 'text-base' },
    xl: { width: 80, height: 80, text: 'text-lg' },
  };

  const { width, height, text: textSize } = sizes[size];

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Animated Logo Container */}
      <div className="relative">
        {/* Spinning Circle Border */}
        <div 
          className="absolute inset-0 rounded-full border-4 border-gray-200 border-t-primary-600 animate-spin"
          style={{ width: width + 16, height: height + 16, margin: -8 }}
        />
        
        {/* Logo */}
        <div className="relative animate-pulse">
          <Image
            src={logoSrc}
            alt="Loading"
            width={width}
            height={height}
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Loading Text */}
      {text && (
        <p className={`${textSize} font-medium text-gray-600 animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}