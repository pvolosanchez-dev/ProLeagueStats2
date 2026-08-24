export type Sport = 'Fútbol';

export type LeagueFormat =
  | 'league'
  | 'league-playoff'
  | 'league-knockout'
  | 'custom';

export type PlayoffSeriesFormat =
  | 'single-match'
  | 'home-and-away';

export interface PlayoffFormatConfig {
  quarterfinal: PlayoffSeriesFormat;
  semifinal: PlayoffSeriesFormat;
  final: PlayoffSeriesFormat;
}

export type LeagueStatus =
  | 'active'
  | 'paused';

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
  playoffFormat: PlayoffFormatConfig;
  status: LeagueStatus;
  ownerId: string;
  seasonId: string | null;
  createdAt: string;
}

export const FORMAT_LABELS: Record<
  LeagueFormat,
  string
> = {
  league: 'Liga',
  'league-playoff': 'Liga + Liguilla',
  'league-knockout': 'Liga + Eliminación',
  custom: 'Personalizado',
};

export const FORMAT_DESCRIPTIONS: Record<
  LeagueFormat,
  string
> = {
  league:
    'Fase de liga. El campeón es el líder de la tabla.',
  'league-playoff':
    'Fase de liga seguida de una liguilla entre los primeros 8.',
  'league-knockout':
    'Fase de liga seguida de eliminatorias directas.',
  custom:
    'Formato configurable para competiciones con reglas especiales.',
};