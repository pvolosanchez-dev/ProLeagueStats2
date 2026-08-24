export type MatchStatus =
  | 'scheduled'
  | 'finished';

export type MatchPhase =
  | 'regular'
  | 'playoff'
  | 'knockout';

export type PlayoffRound =
  | 'quarterfinal'
  | 'semifinal'
  | 'final';

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
  wentToOvertime: boolean;

  phase: MatchPhase;

  playoffRound:
    | PlayoffRound
    | null;

  playoffSeriesId:
    | string
    | null;

  playoffLeg:
    | 1
    | 2
    | null;

  playoffSeedHome:
    | number
    | null;

  playoffSeedAway:
    | number
    | null;
}