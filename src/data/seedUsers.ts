import { StoredUser } from '@/types';

export const seedUsers: StoredUser[] = [
  {
    id: 'user-owner',
    name: 'Marco Fuentes',
    email: 'owner@proleague.demo',
    password: 'demo1234',
    avatarColor: '#f59e0b',
    avatarUrl: null,
    createdAt: '2026-01-05T00:00:00.000Z',
  },
  {
    id: 'user-admin',
    name: 'Elena Rivas',
    email: 'admin@proleague.demo',
    password: 'demo1234',
    avatarColor: '#0ea5e9',
    avatarUrl: null,
    createdAt: '2026-01-05T00:00:00.000Z',
  },
  {
    id: 'user-captain',
    name: 'Diego Salazar',
    email: 'captain@proleague.demo',
    password: 'demo1234',
    avatarColor: '#ef4444',
    avatarUrl: null,
    createdAt: '2026-01-05T00:00:00.000Z',
  },
  {
    id: 'user-player',
    name: 'Tomás Herrera',
    email: 'player@proleague.demo',
    password: 'demo1234',
    avatarColor: '#22c55e',
    avatarUrl: null,
    createdAt: '2026-01-05T00:00:00.000Z',
  },
];
