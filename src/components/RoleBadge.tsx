import { Role } from '@/types';
import { ROLE_LABELS, ROLE_BADGE_CLASSES } from '@/utils/roles';

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={`badge ${ROLE_BADGE_CLASSES[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}
