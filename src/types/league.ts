export type Sport = 'Fútbol' | 'Baloncesto' | 'Voleibol';

export type LeagueFormat = 'league' | 'league-playoff' | 'league-knockout' | 'custom';

export type LeagueStatus = 'active' | 'paused';

export interface League {
  id: string;
  name: string;
  description: string;
  sport: Sport;
  color: string;
  logoUrl: string | null;
  isPublic: boolean;
  inviteCode: string;
  format: LeagueFormat;
  status: LeagueStatus;
  ownerId: string;
  seasonId: string | null;
  createdAt: string;
}

export const FORMAT_LABELS: Record<LeagueFormat, string> = {
  league: 'Liga',
  'league-playoff': 'Liga + Liguilla',
  'league-knockout': 'Liga + Eliminación',
  custom: 'Personalizado',
};

export const FORMAT_DESCRIPTIONS: Record<LeagueFormat, string> = {
  league: 'Todos contra todos a doble vuelta. El campeón es el líder de la tabla.',
  'league-playoff': 'Fase de liga seguida de una liguilla final entre los mejores clasificados.',
  'league-knockout': 'Fase de liga seguida de eliminatorias directas.',
  custom: 'Formato configurable para competiciones con reglas especiales.',
};
