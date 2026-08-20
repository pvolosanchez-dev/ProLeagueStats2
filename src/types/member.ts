import { Role } from './auth';

export type MemberStatus = 'active' | 'expelled';

export interface LeagueMember {
  id: string;
  leagueId: string;
  userId: string;
  role: Role;
  teamId: string | null;
  status: MemberStatus;
  joinedAt: string;
}
