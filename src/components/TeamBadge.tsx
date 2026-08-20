interface TeamBadgeProps {
  name: string;
  shortName: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
};

export function TeamBadge({ name, shortName, color, size = 'md' }: TeamBadgeProps) {
  return (
    <div
      className={`${sizeClasses[size]} flex shrink-0 items-center justify-center rounded-lg font-bold text-white shadow-sm`}
      style={{ backgroundColor: color }}
      title={name}
    >
      {shortName.slice(0, 3)}
    </div>
  );
}
