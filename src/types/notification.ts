export type NotificationType =
  | 'league_request'
  | 'league_request_approved'
  | 'league_request_rejected'
  | 'team_request'
  | 'team_request_approved'
  | 'team_request_rejected'
  | 'player_added'
  | 'role_changed'
  | 'match_registered'
  | 'league_paused'
  | 'league_resumed'
  | 'admin_announcement';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}
