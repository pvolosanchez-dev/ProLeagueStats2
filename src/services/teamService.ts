import { Team } from '@/types';
import { storageService } from './storageService';
import { STORAGE_KEYS } from './storageKeys';
import { seedTeams } from '@/data';
import { auditService } from './auditService';
import { leagueService } from './leagueService';
import { memberService } from './memberService';

function readTeams(): Team[] {
  return storageService.getCollection<Team>(
    STORAGE_KEYS.teams,
    seedTeams,
  );
}

function writeTeams(teams: Team[]): void {
  storageService.setItem(
    STORAGE_KEYS.teams,
    teams,
  );
}

async function getTeams(): Promise<Team[]> {
  return readTeams();
}

async function getTeamsByLeague(
  leagueId: string,
): Promise<Team[]> {
  return readTeams().filter(
    (team) => team.leagueId === leagueId,
  );
}

async function getTeamById(
  id: string,
): Promise<Team | null> {
  return (
    readTeams().find(
      (team) => team.id === id,
    ) ?? null
  );
}

async function canManageTeam(
  teamId: string,
  actorId: string,
): Promise<boolean> {
  const team = await getTeamById(teamId);

  if (!team) {
    return false;
  }

  const membership =
    await memberService.getMemberByUser(
      team.leagueId,
      actorId,
    );

  if (
    !membership ||
    membership.status !== 'active'
  ) {
    return false;
  }

  if (
    membership.role === 'owner' ||
    membership.role === 'admin'
  ) {
    return true;
  }

  return (
    membership.role === 'captain' &&
    membership.teamId === team.id
  );
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

async function createTeam(
  input: CreateTeamInput,
  actorId: string,
): Promise<Team> {
  const league =
    await leagueService.getLeagueById(
      input.leagueId,
    );

  if (!league) {
    throw new Error('Liga no encontrada.');
  }

  if (league.status === 'paused') {
    throw new Error(
      'La liga está suspendida. No se pueden crear equipos mientras esté pausada.',
    );
  }

  const membership =
    await memberService.getMemberByUser(
      input.leagueId,
      actorId,
    );

  if (
    !membership ||
    membership.status !== 'active' ||
    (membership.role !== 'owner' &&
      membership.role !== 'admin')
  ) {
    throw new Error(
      'Solo el propietario o administrador puede crear equipos.',
    );
  }

  const teams = readTeams();

  const team: Team = {
    id: `team-${Date.now()}`,
    leagueId: input.leagueId,
    name: input.name.trim(),
    shortName: input.shortName
      .trim()
      .slice(0, 4)
      .toUpperCase(),
    city: input.city.trim(),
    color: input.color,
    logoUrl: input.logoUrl,
    description:
      input.description.trim(),
    captainId: null,
    createdAt:
      new Date().toISOString(),
  };

  writeTeams([
    ...teams,
    team,
  ]);

  auditService.log(
    input.leagueId,
    actorId,
    'team_created',
    `Equipo "${team.name}" creado.`,
  );

  return team;
}

async function updateTeam(
  id: string,
  updates: Partial<Team>,
  actorId: string,
): Promise<Team> {
  const team = await getTeamById(id);

  if (!team) {
    throw new Error(
      'Equipo no encontrado.',
    );
  }

  const league =
    await leagueService.getLeagueById(
      team.leagueId,
    );

  if (
    league?.status === 'paused'
  ) {
    throw new Error(
      'La liga está suspendida.',
    );
  }

  const allowed =
    await canManageTeam(
      id,
      actorId,
    );

  if (!allowed) {
    throw new Error(
      'No tienes permisos para modificar este equipo.',
    );
  }

  /*
   * El capitán puede administrar la plantilla,
   * pero no cambiar datos sensibles del equipo.
   */
  const membership =
    await memberService.getMemberByUser(
      team.leagueId,
      actorId,
    );

  const isCaptainOnly =
    team.captainId === actorId &&
    membership?.role !== 'owner' &&
    membership?.role !== 'admin';

  const safeUpdates = isCaptainOnly
    ? {
        description:
          updates.description,
      }
    : updates;

  const updated: Team = {
    ...team,
    ...safeUpdates,
    id: team.id,
    leagueId: team.leagueId,
    captainId: team.captainId,
  };

  writeTeams(
    readTeams().map(
      (currentTeam) =>
        currentTeam.id === id
          ? updated
          : currentTeam,
    ),
  );

  auditService.log(
    team.leagueId,
    actorId,
    'team_updated',
    `Equipo "${team.name}" modificado.`,
  );

  return updated;
}

async function deleteTeam(
  id: string,
  actorId: string,
): Promise<void> {
  const team = await getTeamById(id);

  if (!team) {
    return;
  }

  const league =
    await leagueService.getLeagueById(
      team.leagueId,
    );

  if (
    league?.status === 'paused'
  ) {
    throw new Error(
      'La liga está suspendida.',
    );
  }

  const membership =
    await memberService.getMemberByUser(
      team.leagueId,
      actorId,
    );

  if (
    !membership ||
    membership.status !== 'active' ||
    (membership.role !== 'owner' &&
      membership.role !== 'admin')
  ) {
    throw new Error(
      'Solo el propietario o administrador puede eliminar equipos.',
    );
  }

  writeTeams(
    readTeams().filter(
      (currentTeam) =>
        currentTeam.id !== id,
    ),
  );

  auditService.log(
    team.leagueId,
    actorId,
    'team_deleted',
    `Equipo "${team.name}" eliminado.`,
  );
}

async function setCaptain(
  teamId: string,
  captainId: string | null,
  actorId: string,
): Promise<Team> {
  const team =
    await getTeamById(teamId);

  if (!team) {
    throw new Error(
      'Equipo no encontrado.',
    );
  }

  const league =
    await leagueService.getLeagueById(
      team.leagueId,
    );

  if (
    league?.status === 'paused'
  ) {
    throw new Error(
      'La liga está suspendida.',
    );
  }

  const membership =
    await memberService.getMemberByUser(
      team.leagueId,
      actorId,
    );

  if (
    !membership ||
    membership.status !== 'active' ||
    (membership.role !== 'owner' &&
      membership.role !== 'admin')
  ) {
    throw new Error(
      'Solo el propietario o administrador puede asignar capitanes.',
    );
  }

  if (captainId) {
    const captainMembership =
      await memberService.getMemberByUser(
        team.leagueId,
        captainId,
      );

    if (
      !captainMembership ||
      captainMembership.status !==
        'active'
    ) {
      throw new Error(
        'El capitán debe ser miembro activo de la liga.',
      );
    }

    if (
      captainMembership.teamId !==
      team.id
    ) {
      throw new Error(
        'El capitán debe pertenecer a este equipo.',
      );
    }

    memberService.updateMemberRole(
      team.leagueId,
      captainId,
      'captain',
    );
  }

  const updated: Team = {
    ...team,
    captainId,
  };

  writeTeams(
    readTeams().map(
      (currentTeam) =>
        currentTeam.id === teamId
          ? updated
          : currentTeam,
    ),
  );

  auditService.log(
    team.leagueId,
    actorId,
    'captain_assigned',
    captainId
      ? `Capitán asignado al equipo "${team.name}".`
      : `Capitán removido del equipo "${team.name}".`,
  );

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
  canManageTeam,
};