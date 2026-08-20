import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks';
import { formatDateTime } from '@/utils/date';

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error-500 px-1 text-xs font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg animate-scale-in">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-neutral-900">Notificaciones</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                >
                  <CheckCheck size={14} />
                  Marcar todas
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-400">Sin notificaciones</p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {notifications.slice(0, 10).map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => {
                      markAsRead(notif.id);
                      navigate('/dashboard/notifications');
                      setOpen(false);
                    }}
                    className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50 ${
                      !notif.read ? 'bg-primary-50/50' : ''
                    }`}
                  >
                    <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${!notif.read ? 'bg-primary-500' : 'bg-transparent'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-neutral-900">{notif.title}</p>
                      <p className="text-xs text-neutral-500 line-clamp-2">{notif.message}</p>
                      <p className="mt-0.5 text-xs text-neutral-400">{formatDateTime(notif.createdAt)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => {
                navigate('/dashboard/notifications');
                setOpen(false);
              }}
              className="block w-full border-t border-neutral-200 px-4 py-3 text-center text-sm font-medium text-primary-600 hover:bg-neutral-50"
            >
              Ver todas
            </button>
          </div>
        </>
      )}
    </div>
  );
}
