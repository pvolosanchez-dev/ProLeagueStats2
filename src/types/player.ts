export type Position =
  | 'Portero'
  | 'Defensa'
  | 'Mediocampista'
  | 'Delantero';

export interface PlayerStats {
  gamesPlayed: number;
  goals: number;
  assists: number;
  mvpAwards: number;
}

export interface Player {
  id: string;
  userId: string | null;
  teamId: string;
  name: string;
  position: Position;
  jerseyNumber: number;
  photoUrl: string | null;
  stats: PlayerStats;
}