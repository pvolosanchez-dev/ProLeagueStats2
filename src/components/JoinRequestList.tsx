import { Avatar } from './Avatar';
import { User } from '@/types';
import { formatDateTime } from '@/utils/date';
import { Check, X } from 'lucide-react';

interface JoinRequestListProps {
  requests: { id: string; userId: string; message: string; createdAt: string }[];
  users: User[];
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

export function JoinRequestList({ requests, users, onApprove, onReject }: JoinRequestListProps) {
  const userMap = new Map(users.map((u) => [u.id, u]));

  if (requests.length === 0) {
    return <p className="py-8 text-center text-sm text-neutral-400">No hay solicitudes pendientes</p>;
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => {
        const user = userMap.get(req.userId);
        return (
          <div key={req.id} className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3">
            {user && <Avatar user={user} size="sm" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-neutral-900">{user?.name ?? 'Usuario'}</p>
              <p className="text-xs text-neutral-500">{req.message || 'Sin mensaje'}</p>
              <p className="text-xs text-neutral-400">{formatDateTime(req.createdAt)}</p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => onApprove(req.id)}
                className="rounded-lg bg-success-50 p-2 text-success-600 hover:bg-success-100 transition-colors"
                title="Aceptar"
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => onReject(req.id)}
                className="rounded-lg bg-error-50 p-2 text-error-600 hover:bg-error-100 transition-colors"
                title="Rechazar"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
