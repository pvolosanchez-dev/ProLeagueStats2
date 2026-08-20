export type SeasonStatus = 'active' | 'finished' | 'draft';

export interface Season {
  id: string;
  leagueId: string;
  name: string;
  status: SeasonStatus;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}
