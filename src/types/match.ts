export type MatchStatus = 'scheduled' | 'finished';

export interface Match {
  id: string;
  leagueId: string;
  seasonId: string | null;
  round: number;
  date: string;
  venue: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  mvpPlayerId: string | null;
}
