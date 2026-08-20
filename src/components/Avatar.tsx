import { User } from '@/types';
import { ROLE_LABELS } from '@/utils/roles';

interface AvatarProps {
  user: Pick<User, 'name' | 'avatarColor'>;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-xl',
};

export function Avatar({ user, size = 'md' }: AvatarProps) {
  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className={`${sizeClasses[size]} flex shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-sm`}
      style={{ backgroundColor: user.avatarColor }}
      title={user.name}
    >
      {initials}
    </div>
  );
}

export { ROLE_LABELS };
