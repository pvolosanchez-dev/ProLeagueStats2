export type SeasonStatus =
  | 'active'
  | 'finished'
  | 'draft';

export type SeasonPhase =
  | 'regular'
  | 'playoff'
  | 'knockout';

export interface Season {
  id: string;
  leagueId: string;
  name: string;
  status: SeasonStatus;
  phase: SeasonPhase;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}