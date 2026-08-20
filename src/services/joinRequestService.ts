import { LeagueJoinRequest, TeamJoinRequest, RequestStatus } from '@/types';
import { storageService } from './storageService';
import { STORAGE_KEYS } from './storageKeys';

function readLeagueRequests(): LeagueJoinRequest[] {
  return storageService.getCollection<LeagueJoinRequest>(STORAGE_KEYS.leagueRequests, []);
}

function writeLeagueRequests(requests: LeagueJoinRequest[]): void {
  storageService.setItem(STORAGE_KEYS.leagueRequests, requests);
}

function readTeamRequests(): TeamJoinRequest[] {
  return storageService.getCollection<TeamJoinRequest>(STORAGE_KEYS.teamRequests, []);
}

function writeTeamRequests(requests: TeamJoinRequest[]): void {
  storageService.setItem(STORAGE_KEYS.teamRequests, requests);
}

async function createLeagueRequest(leagueId: string, userId: string, message: string): Promise<LeagueJoinRequest> {
  const requests = readLeagueRequests();
  const existing = requests.find(
    (r) => r.leagueId === leagueId && r.userId === userId && r.status === 'pending',
  );
  if (existing) throw new Error('Ya tienes una solicitud pendiente para esta liga.');

  const request: LeagueJoinRequest = {
    id: `lr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    leagueId,
    userId,
    status: 'pending',
    message,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };
  writeLeagueRequests([...requests, request]);
  return request;
}

async function getLeagueRequestsByLeague(leagueId: string): Promise<LeagueJoinRequest[]> {
  return readLeagueRequests()
    .filter((r) => r.leagueId === leagueId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function getLeagueRequestsByUser(userId: string): Promise<LeagueJoinRequest[]> {
  return readLeagueRequests()
    .filter((r) => r.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function resolveLeagueRequest(requestId: string, status: RequestStatus): LeagueJoinRequest | null {
  const requests = readLeagueRequests();
  let resolved: LeagueJoinRequest | null = null;
  const next = requests.map((r) => {
    if (r.id === requestId) {
      resolved = { ...r, status, resolvedAt: new Date().toISOString() };
      return resolved;
    }
    return r;
  });
  writeLeagueRequests(next);
  return resolved;
}

function cancelLeagueRequest(requestId: string): void {
  writeLeagueRequests(readLeagueRequests().filter((r) => r.id !== requestId));
}

async function createTeamRequest(teamId: string, leagueId: string, userId: string, message: string): Promise<TeamJoinRequest> {
  const requests = readTeamRequests();
  const existing = requests.find(
    (r) => r.teamId === teamId && r.userId === userId && r.status === 'pending',
  );
  if (existing) throw new Error('Ya tienes una solicitud pendiente para este equipo.');

  const request: TeamJoinRequest = {
    id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    teamId,
    leagueId,
    userId,
    status: 'pending',
    message,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };
  writeTeamRequests([...requests, request]);
  return request;
}

async function getTeamRequestsByTeam(teamId: string): Promise<TeamJoinRequest[]> {
  return readTeamRequests()
    .filter((r) => r.teamId === teamId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function getTeamRequestsByUser(userId: string): Promise<TeamJoinRequest[]> {
  return readTeamRequests()
    .filter((r) => r.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function resolveTeamRequest(requestId: string, status: RequestStatus): TeamJoinRequest | null {
  const requests = readTeamRequests();
  let resolved: TeamJoinRequest | null = null;
  const next = requests.map((r) => {
    if (r.id === requestId) {
      resolved = { ...r, status, resolvedAt: new Date().toISOString() };
      return resolved;
    }
    return r;
  });
  writeTeamRequests(next);
  return resolved;
}

function cancelTeamRequest(requestId: string): void {
  writeTeamRequests(readTeamRequests().filter((r) => r.id !== requestId));
}

export const joinRequestService = {
  createLeagueRequest,
  getLeagueRequestsByLeague,
  getLeagueRequestsByUser,
  resolveLeagueRequest,
  cancelLeagueRequest,
  createTeamRequest,
  getTeamRequestsByTeam,
  getTeamRequestsByUser,
  resolveTeamRequest,
  cancelTeamRequest,
};
