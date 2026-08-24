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
  return (
    <div
      className={`${sizeClasses[size]} flex shrink-0 items-center justify-center overflow-hidden rounded-lg font-bold text-white shadow-sm`}
      style={{
        backgroundColor: color,
      }}
      title={name}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={name}
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display =
              'none';
          }}
        />
      ) : (
        shortName.slice(0, 3)
      )}
    </div>
  );
}