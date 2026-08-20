import { Team } from '@/types';
import { storageService } from './storageService';
import { STORAGE_KEYS } from './storageKeys';
import { seedTeams } from '@/data';
import { auditService } from './auditService';

function readTeams(): Team[] {
  return storageService.getCollection<Team>(STORAGE_KEYS.teams, seedTeams);
}

function writeTeams(teams: Team[]): void {
  storageService.setItem(STORAGE_KEYS.teams, teams);
}

async function getTeams(): Promise<Team[]> {
  return readTeams();
}

async function getTeamsByLeague(leagueId: string): Promise<Team[]> {
  return readTeams().filter((team) => team.leagueId === leagueId);
}

async function getTeamById(id: string): Promise<Team | null> {
  return readTeams().find((team) => team.id === id) ?? null;
}

interface CreateTeamInput {
  leagueId: string;
  name: string;
  shortName: string;
  city: string;
  color: string;
  logoUrl: string | null;
  description: string;
}

async function createTeam(input: CreateTeamInput, actorId: string): Promise<Team> {
  const teams = readTeams();
  const team: Team = {
    id: `team-${Date.now()}`,
    leagueId: input.leagueId,
    name: input.name.trim(),
    shortName: input.shortName.trim().slice(0, 4).toUpperCase(),
    city: input.city.trim(),
    color: input.color,
    logoUrl: input.logoUrl,
    description: input.description.trim(),
    captainId: null,
    createdAt: new Date().toISOString(),
  };
  writeTeams([...teams, team]);
  auditService.log(input.leagueId, actorId, 'team_created', `Equipo "${team.name}" creado.`);
  return team;
}

async function updateTeam(id: string, updates: Partial<Team>, actorId: string): Promise<Team> {
  const teams = readTeams();
  const team = teams.find((t) => t.id === id);
  if (!team) throw new Error('Equipo no encontrado.');
  const updated = { ...team, ...updates, id: team.id, leagueId: team.leagueId };
  writeTeams(teams.map((t) => (t.id === id ? updated : t)));
  auditService.log(team.leagueId, actorId, 'team_updated', `Equipo "${team.name}" modificado.`);
  return updated;
}

async function deleteTeam(id: string, actorId: string): Promise<void> {
  const team = readTeams().find((t) => t.id === id);
  if (!team) return;
  writeTeams(readTeams().filter((t) => t.id !== id));
  auditService.log(team.leagueId, actorId, 'team_deleted', `Equipo "${team.name}" eliminado.`);
}

async function setCaptain(teamId: string, captainId: string | null, actorId: string): Promise<Team> {
  const teams = readTeams();
  const team = teams.find((t) => t.id === teamId);
  if (!team) throw new Error('Equipo no encontrado.');
  const updated = { ...team, captainId };
  writeTeams(teams.map((t) => (t.id === teamId ? updated : t)));
  auditService.log(team.leagueId, actorId, 'captain_assigned', captainId ? `Capitán asignado al equipo "${team.name}".` : `Capitán removido del equipo "${team.name}".`);
  return updated;
}

export const teamService = {
  getTeams,
  getTeamsByLeague,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  setCaptain,
};
