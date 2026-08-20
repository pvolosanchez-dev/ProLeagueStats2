import { Match } from '@/types';
import { storageService } from './storageService';
import { STORAGE_KEYS } from './storageKeys';
import { seedMatches } from '@/data';
import { auditService } from './auditService';

function readMatches(): Match[] {
  return storageService.getCollection<Match>(STORAGE_KEYS.matches, seedMatches);
}

function writeMatches(matches: Match[]): void {
  storageService.setItem(STORAGE_KEYS.matches, matches);
}

async function getMatches(): Promise<Match[]> {
  return readMatches();
}

async function getMatchesByLeague(leagueId: string): Promise<Match[]> {
  return readMatches().filter((match) => match.leagueId === leagueId);
}

async function getMatchesByTeam(teamId: string): Promise<Match[]> {
  return readMatches().filter(
    (match) => match.homeTeamId === teamId || match.awayTeamId === teamId,
  );
}

async function getMatchById(id: string): Promise<Match | null> {
  return readMatches().find((match) => match.id === id) ?? null;
}

interface CreateMatchInput {
  leagueId: string;
  seasonId: string | null;
  round: number;
  date: string;
  venue: string;
  homeTeamId: string;
  awayTeamId: string;
}

async function createMatch(input: CreateMatchInput, actorId: string): Promise<Match> {
  const matches = readMatches();
  const match: Match = {
    id: `match-${Date.now()}`,
    leagueId: input.leagueId,
    seasonId: input.seasonId,
    round: input.round,
    date: input.date,
    venue: input.venue,
    homeTeamId: input.homeTeamId,
    awayTeamId: input.awayTeamId,
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    mvpPlayerId: null,
  };
  writeMatches([...matches, match]);
  auditService.log(input.leagueId, actorId, 'match_created', `Partido J${input.round} creado.`);
  return match;
}

interface UpdateScoreInput {
  matchId: string;
  homeScore: number;
  awayScore: number;
  mvpPlayerId?: string | null;
}

async function updateScore(input: UpdateScoreInput, actorId: string): Promise<Match> {
  const matches = readMatches();
  const match = matches.find((candidate) => candidate.id === input.matchId);
  if (!match) throw new Error('Partido no encontrado.');

  const wasFinished = match.status === 'finished';
  const updatedMatch: Match = {
    ...match,
    homeScore: input.homeScore,
    awayScore: input.awayScore,
    status: 'finished',
    mvpPlayerId: input.mvpPlayerId ?? match.mvpPlayerId,
  };
  writeMatches(matches.map((candidate) => (candidate.id === input.matchId ? updatedMatch : candidate)));

  if (!wasFinished) {
    auditService.log(match.leagueId, actorId, 'match_registered', `Resultado registrado: ${input.homeScore}-${input.awayScore}.`);
  }
  return updatedMatch;
}

async function deleteMatch(id: string, actorId: string): Promise<void> {
  const match = readMatches().find((m) => m.id === id);
  if (!match) return;
  writeMatches(readMatches().filter((m) => m.id !== id));
  auditService.log(match.leagueId, actorId, 'match_deleted', `Partido J${match.round} eliminado.`);
}

export const matchService = {
  getMatches,
  getMatchesByLeague,
  getMatchesByTeam,
  getMatchById,
  createMatch,
  updateScore,
  deleteMatch,
};
