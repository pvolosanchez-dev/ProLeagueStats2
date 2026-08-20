import { useEffect, useState } from 'react';
import { Notification } from '@/types';
import { notificationService } from '@/services';
import { useAuth } from './useAuth';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    let active = true;
    notificationService.getByUser(user.id).then((notifs) => {
      if (active) {
        setNotifications(notifs);
        setUnreadCount(notifs.filter((n) => !n.read).length);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [user]);

  const markAsRead = (id: string) => {
    notificationService.markAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    if (!user) return;
    notificationService.markAllAsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
}
