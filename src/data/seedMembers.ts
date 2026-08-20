import { LeagueMember } from '@/types';

export const seedMembers: LeagueMember[] = [
  {
    id: 'member-elite-owner',
    leagueId: 'league-elite',
    userId: 'user-owner',
    role: 'owner',
    teamId: 'team-aguilas',
    status: 'active',
    joinedAt: '2026-01-10T00:00:00.000Z',
  },
  {
    id: 'member-elite-admin',
    leagueId: 'league-elite',
    userId: 'user-admin',
    role: 'admin',
    teamId: null,
    status: 'active',
    joinedAt: '2026-01-10T00:00:00.000Z',
  },
  {
    id: 'member-elite-captain',
    leagueId: 'league-elite',
    userId: 'user-captain',
    role: 'captain',
    teamId: 'team-aguilas',
    status: 'active',
    joinedAt: '2026-01-10T00:00:00.000Z',
  },
  {
    id: 'member-elite-player',
    leagueId: 'league-elite',
    userId: 'user-player',
    role: 'player',
    teamId: 'team-lobos',
    status: 'active',
    joinedAt: '2026-01-10T00:00:00.000Z',
  },
  {
    id: 'member-regional-admin',
    leagueId: 'league-regional',
    userId: 'user-admin',
    role: 'owner',
    teamId: null,
    status: 'active',
    joinedAt: '2026-01-15T00:00:00.000Z',
  },
];
