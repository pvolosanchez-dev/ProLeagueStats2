export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface LeagueJoinRequest {
  id: string;
  leagueId: string;
  userId: string;
  status: RequestStatus;
  message: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface TeamJoinRequest {
  id: string;
  teamId: string;
  leagueId: string;
  userId: string;
  status: RequestStatus;
  message: string;
  createdAt: string;
  resolvedAt: string | null;
}
