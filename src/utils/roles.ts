import { Role } from '@/types';

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  captain: 'Capitán',
  player: 'Jugador',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: 'Control total sobre la liga y sus equipos',
  admin: 'Gestiona ligas, calendarios y resultados',
  captain: 'Administra la plantilla de su equipo',
  player: 'Consulta sus estadísticas y su equipo',
};

export const ROLE_BADGE_CLASSES: Record<Role, string> = {
  owner: 'bg-accent-100 text-accent-800 border border-accent-200',
  admin: 'bg-secondary-100 text-secondary-800 border border-secondary-200',
  captain: 'bg-primary-100 text-primary-800 border border-primary-200',
  player: 'bg-neutral-100 text-neutral-700 border border-neutral-200',
};

export function canManageLeague(role: Role): boolean {
  return role === 'owner' || role === 'admin';
}

export function canManageTeam(role: Role): boolean {
  return role === 'owner' || role === 'admin' || role === 'captain';
}
