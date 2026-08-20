export interface Team {
  id: string;
  leagueId: string;
  name: string;
  shortName: string;
  city: string;
  color: string;
  logoUrl: string | null;
  description: string;
  captainId: string | null;
  createdAt: string;
}
