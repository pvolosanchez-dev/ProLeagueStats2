import { Notification, NotificationType } from '@/types';
import { storageService } from './storageService';
import { STORAGE_KEYS } from './storageKeys';

function readNotifications(): Notification[] {
  return storageService.getCollection<Notification>(STORAGE_KEYS.notifications, []);
}

function writeNotifications(notifications: Notification[]): void {
  storageService.setItem(STORAGE_KEYS.notifications, notifications);
}

function create(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
): Notification {
  const notification: Notification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId,
    type,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  };
  writeNotifications([...readNotifications(), notification]);
  return notification;
}

async function getByUser(userId: string): Promise<Notification[]> {
  return readNotifications()
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function getUnreadCount(userId: string): Promise<number> {
  return readNotifications().filter((n) => n.userId === userId && !n.read).length;
}

function markAsRead(id: string): void {
  writeNotifications(readNotifications().map((n) => (n.id === id ? { ...n, read: true } : n)));
}

function markAllAsRead(userId: string): void {
  writeNotifications(readNotifications().map((n) => (n.userId === userId ? { ...n, read: true } : n)));
}

export const notificationService = {
  create,
  getByUser,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
