import Image from 'next/image';

interface InlineLoadingProps {
  size?: number;
  className?: string;
}

export default function InlineLoading({ size = 16, className = '' }: InlineLoadingProps) {
  const logoSrc = process.env.NEXT_PUBLIC_LOGO_URL || '/images/logo.png';
  
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Spinning border */}
        <div 
          className="absolute inset-0 rounded-full border-2 border-current border-t-transparent animate-spin opacity-30"
        />
        {/* Logo */}
        <Image
          src={logoSrc}
          alt=""
          width={size}
          height={size}
          className="object-contain animate-pulse"
        />
      </div>
    </div>
  );
}