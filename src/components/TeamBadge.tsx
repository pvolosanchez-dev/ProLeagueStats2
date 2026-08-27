import { useState } from 'react';

interface TeamBadgeProps {
  name: string;
  shortName: string;
  color: string;
  logoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
};

export function TeamBadge({
  name,
  shortName,
  color,
  logoUrl,
  size = 'md',
}: TeamBadgeProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showLogo = Boolean(logoUrl) && !imageFailed;

  return (
    <div
      className={`${sizeClasses[size]} flex shrink-0 items-center justify-center overflow-hidden rounded-lg font-bold text-white shadow-sm`}
      style={{ backgroundColor: color }}
      title={name}
    >
      {showLogo ? (
        <img
          src={logoUrl!}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        shortName.slice(0, 3)
      )}
    </div>
  );
}
