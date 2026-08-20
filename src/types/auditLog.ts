export interface AuditLog {
  id: string;
  leagueId: string;
  actorId: string;
  action: string;
  details: string;
  createdAt: string;
}
