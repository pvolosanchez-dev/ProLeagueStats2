import { League, Role } from '@/types';
import { memberService } from './memberService';

type Permission =
  | 'league:manage'
  | 'league:pause'
  | 'league:delete'
  | 'team:create'
  | 'team:manage'
  | 'team:manage_own'
  | 'match:manage'
  | 'member:manage'
  | 'member:assign_admin'
  | 'member:assign_captain'
  | 'member:expel'
  | 'request:manage'
  | 'season:manage'
  | 'audit:view';

const PERMISSION_MATRIX: Record<Role, Permission[]> = {
  owner: [
    'league:manage', 'league:pause', 'league:delete',
    'team:create', 'team:manage', 'team:manage_own',
    'match:manage', 'member:manage', 'member:assign_admin',
    'member:assign_captain', 'member:expel',
    'request:manage', 'season:manage', 'audit:view',
  ],
  admin: [
    'league:manage', 'league:pause',
    'team:create', 'team:manage',
    'match:manage', 'member:manage', 'member:assign_captain',
    'member:expel', 'request:manage', 'season:manage', 'audit:view',
  ],
  captain: ['team:manage_own', 'match:manage'],
  player: [],
};

async function getRoleInLeague(leagueId: string, userId: string): Promise<Role | null> {
  const member = await memberService.getMemberByUser(leagueId, userId);
  if (!member || member.status === 'expelled') return null;
  return member.role;
}

async function can(league: League, userId: string, permission: Permission): Promise<boolean> {
  if (league.ownerId === userId) return true;
  const role = await getRoleInLeague(league.id, userId);
  if (!role) return false;
  return PERMISSION_MATRIX[role].includes(permission);
}

export const permissionService = {
  getRoleInLeague,
  can,
  PERMISSION_MATRIX,
};

export type { Permission };
