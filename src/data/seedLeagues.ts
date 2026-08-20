import { League } from '@/types';

export const seedLeagues: League[] = [
  {
    id: 'league-elite',
    name: 'Liga Elite de Fútbol',
    description:
      'La máxima categoría del fútbol regional. Seis equipos compiten a doble vuelta por el título de campeón.',
    sport: 'Fútbol',
    color: '#0ea5e9',
    logoUrl: null,
    isPublic: true,
    inviteCode: 'ELITE26',
    format: 'league',
    status: 'active',
    ownerId: 'user-owner',
    seasonId: 'season-elite-1',
    createdAt: '2026-01-10T00:00:00.000Z',
  },
  {
    id: 'league-regional',
    name: 'Copa Regional de Fútbol',
    description:
      'Torneo regional con cuatro equipos emergentes que luchan por el ascenso a la Liga Elite.',
    sport: 'Fútbol',
    color: '#f59e0b',
    logoUrl: null,
    isPublic: true,
    inviteCode: 'REGIO26',
    format: 'league-playoff',
    status: 'active',
    ownerId: 'user-admin',
    seasonId: 'season-regional-1',
    createdAt: '2026-01-15T00:00:00.000Z',
  },
];
