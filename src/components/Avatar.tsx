import { useState } from 'react';
import { User } from '@/types';
import { ROLE_LABELS } from '@/utils/roles';

interface AvatarProps {
  user: Pick<User, 'name' | 'avatarColor' | 'avatarUrl' | 'profileGifUrl'>;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-16 h-16 text-xl' };

export function Avatar({ user, size = 'md' }: AvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const initials = user.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  const gifUrl = user.profileGifUrl?.trim() || null;
  const photoUrl = user.avatarUrl?.trim() || null;
  const imageUrl = gifUrl && failedUrl !== gifUrl ? gifUrl : photoUrl && failedUrl !== photoUrl ? photoUrl : null;

  return (
    <div className={`${sizeClasses[size]} flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white shadow-sm`} style={{ backgroundColor: user.avatarColor }} title={user.name}>
      {imageUrl ? (
        <img key={imageUrl} src={imageUrl} alt={user.name} className="h-full w-full object-cover" onError={() => setFailedUrl(imageUrl)} />
      ) : initials}
    </div>
  );
}

export { ROLE_LABELS };
