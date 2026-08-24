export type AwardType =
  | 'ballon_or'
  | 'golden_boot'
  | 'puskas'
  | 'best_player'
  | 'top_scorer'
  | 'top_assister'
  | 'best_goalkeeper';

export type AwardVotingStatus =
  | 'not_started'
  | 'open'
  | 'closed';

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
  tournamentStage?: string;
  tournamentPosition?: number | null;
  rank: number;
}

export interface PuskasNomination {
  id: string;
  leagueId: string;
  seasonId: string;
  playerId: string;
  playerName: string;
  teamId: string;
  nominatedByUserId: string;
  createdAt: string;
  voteCount: number;
  isWinner: boolean;
  winningVideoUrl: string | null;
  winningVideoDurationSeconds: number | null;
}

export interface AwardVote {
  id: string;
  leagueId: string;
  seasonId: string;
  awardType: AwardType;
  voterUserId: string | null;
  candidatePlayerId: string;
  automatic: boolean;
  weight: number;
  createdAt: string;
}

export interface SeasonAward {
  id: string;
  leagueId: string;
  seasonId: string;
  type: AwardType;
  winnerPlayerId: string | null;
  votingStatus: AwardVotingStatus;
  votingStartedAt: string | null;
  votingEndsAt: string | null;
  winnerVoteCount: number;
  winningVideoUrl: string | null;
  winningVideoDurationSeconds: number | null;
  createdAt: string;
  finalizedAt: string | null;
}

export const AWARD_LABELS: Record<AwardType, string> = {
  ballon_or: 'Balón de Oro',
  golden_boot: 'Bota de Oro',
  puskas: 'Premio Puskás',
  best_player: 'Mejor Jugador',
  top_scorer: 'Mejor Goleador',
  top_assister: 'Mejor Asistente',
  best_goalkeeper: 'Mejor Portero',
};

export const AWARD_DESCRIPTIONS: Record<AwardType, string> = {
  ballon_or: 'El Top 20 se determina por rendimiento. El ganador final se decide exclusivamente por votos.',
  golden_boot: 'Se determina automáticamente por goles y asistencias.',
  puskas: 'Premio al mejor gol de la temporada mediante nominaciones y votación.',
  best_player: 'Premio histórico de compatibilidad.',
  top_scorer: 'Premio histórico de compatibilidad.',
  top_assister: 'Premio histórico de compatibilidad.',
  best_goalkeeper: 'Premio histórico de compatibilidad.',
};

export const AWARD_POINT_VALUES = {
  goal: 4,
  assist: 3,
  mvp: 5,
  champion: 10,
  runnerUp: 5,
  semifinalist: 2,
  quarterfinalist: 1,
} as const;

export const BALLOON_AUTOMATIC_VOTES = [5, 4, 3] as const;
export const AWARD_VOTING_DURATION_MS = 24 * 60 * 60 * 1000;
export const MAX_BALLON_CANDIDATES = 20;
export const MAX_GOLDEN_BOOT_CANDIDATES = 15;
export const MAX_PUSKAS_NOMINATIONS_PER_PLAYER = 2;
export const MAX_PUSKAS_VIDEO_DURATION_SECONDS = 30;
