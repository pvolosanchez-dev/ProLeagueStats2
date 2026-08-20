import { AuditLog } from '@/types';
import { storageService } from './storageService';
import { STORAGE_KEYS } from './storageKeys';

function readLogs(): AuditLog[] {
  return storageService.getCollection<AuditLog>(STORAGE_KEYS.auditLogs, []);
}

function writeLogs(logs: AuditLog[]): void {
  storageService.setItem(STORAGE_KEYS.auditLogs, logs);
}

function log(leagueId: string, actorId: string, action: string, details: string): void {
  const entry: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    leagueId,
    actorId,
    action,
    details,
    createdAt: new Date().toISOString(),
  };
  writeLogs([...readLogs(), entry]);
}

async function getByLeague(leagueId: string): Promise<AuditLog[]> {
  return readLogs()
    .filter((l) => l.leagueId === leagueId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export const auditService = {
  log,
  getByLeague,
};
