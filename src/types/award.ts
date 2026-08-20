export type AwardType =
  | 'ballon_or'
  | 'best_player'
  | 'top_scorer'
  | 'top_assister'
  | 'best_goalkeeper';

export interface AwardCandidate {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  teamColor: string;
  goals: number;
  assists: number;
  mvpAwards: number;
  performancePoints: number;
  pointBreakdown: { label: string; points: number }[];
  rank: number;
}

export const AWARD_LABELS: Record<AwardType, string> = {
  ballon_or: 'Balón de Oro',
  best_player: 'Mejor Jugador',
  top_scorer: 'Mejor Goleador',
  top_assister: 'Mejor Asistente',
  best_goalkeeper: 'Mejor Portero',
};

export const AWARD_DESCRIPTIONS: Record<AwardType, string> = {
  ballon_or: 'El premio al jugador más completo de la temporada según rendimiento.',
  best_player: 'El jugador con mayor impacto en los partidos.',
  top_scorer: 'El máximo goleador de la temporada.',
  top_assister: 'El jugador con más asistencias de la temporada.',
  best_goalkeeper: 'El portero con mejor rendimiento.',
};
