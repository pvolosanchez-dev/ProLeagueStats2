import { Notification, NotificationType } from '@/types';
import { supabase } from '@/lib/supabaseClient';

function mapNotification(row: any): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as NotificationType,
    title: row.title,
    message: row.message,
    read: row.read,
    createdAt: row.created_at,
  };
}

async function create(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      user_id: userId,
      type,
      title,
      message,
      read: false,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'No se pudo crear la notificación.');
  }

  return mapNotification(data);
}

async function getByUser(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapNotification);
}

async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function markAsRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) throw new Error(error.message);
}

export const notificationService = {
  create,
  getByUser,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
