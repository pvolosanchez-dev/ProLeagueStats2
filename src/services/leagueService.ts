import {
  League,
  LeagueFormat,
  PlayoffFormatConfig,
  Sport,
} from '@/types';
import { storageService } from './storageService';
import { STORAGE_KEYS } from './storageKeys';
import { seedLeagues } from '@/data';
import { memberService } from './memberService';
import { seasonService } from './seasonService';
import { auditService } from './auditService';

function readLeagues(): League[] {
  const leagues =
    storageService.getCollection<League>(
      STORAGE_KEYS.leagues,
      seedLeagues,
    );

  const migrated = leagues.map(
    (league) => ({
      ...league,
      sport: 'Fútbol' as const,
      playoffFormat:
        league.playoffFormat ?? {
          quarterfinal: 'single-match',
          semifinal: 'single-match',
          final: 'single-match',
        },
    }),
  );

  storageService.setItem(
    STORAGE_KEYS.leagues,
    migrated,
  );

  return migrated;
}

function writeLeagues(
  leagues: League[],
): void {
  storageService.setItem(
    STORAGE_KEYS.leagues,
    leagues,
  );
}

function generateInviteCode(): string {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  let code = '';

  for (let i = 0; i < 6; i++) {
    code +=
      chars[
        Math.floor(
          Math.random() *
            chars.length,
        )
      ];
  }

  return code;
}

async function getLeagues(): Promise<
  League[]
> {
  return readLeagues();
}

async function getLeagueById(
  id: string,
): Promise<League | null> {
  return (
    readLeagues().find(
      (league) =>
        league.id === id,
    ) ?? null
  );
}

async function getLeagueByInviteCode(
  code: string,
): Promise<League | null> {
  return (
    readLeagues().find(
      (league) =>
        league.inviteCode.toUpperCase() ===
        code.toUpperCase(),
    ) ?? null
  );
}

interface CreateLeagueInput {
  name: string;
  description: string;
  sport: Sport;
  color: string;
  logoUrl: string | null;
  isPublic: boolean;
  inviteCode: string | null;
  format: LeagueFormat;
  playoffFormat: PlayoffFormatConfig;
  ownerId: string;
}

async function createLeague(
  input: CreateLeagueInput,
): Promise<League> {
  const leagues =
    readLeagues();

  const league: League = {
    id: `league-${Date.now()}`,
    name: input.name.trim(),
    description:
      input.description.trim(),
    sport: 'Fútbol',
    color: input.color,
    logoUrl: input.logoUrl,
    isPublic: input.isPublic,
    inviteCode:
      input.inviteCode?.trim() ||
      generateInviteCode(),
    format: input.format,
    playoffFormat:
      input.format ===
      'league-playoff'
        ? input.playoffFormat
        : {
            quarterfinal: 'single-match',
            semifinal: 'single-match',
            final: 'single-match',
          },
    status: 'active',
    ownerId: input.ownerId,
    seasonId: null,
    createdAt:
      new Date().toISOString(),
  };

  writeLeagues([
    ...leagues,
    league,
  ]);

  memberService.createMember(
    league.id,
    input.ownerId,
    'owner',
  );

  const season =
    seasonService.create(
      league.id,
      'Temporada 1',
    );

  seasonService.activate(
    season.id,
  );

  writeLeagues(
    readLeagues().map(
      (currentLeague) =>
        currentLeague.id ===
        league.id
          ? {
              ...currentLeague,
              seasonId:
                season.id,
            }
          : currentLeague,
    ),
  );

  auditService.log(
    league.id,
    input.ownerId,
    'league_created',
    `Liga "${league.name}" creada.`,
  );

  return {
    ...league,
    seasonId: season.id,
  };
}

async function updateLeague(
  id: string,
  updates: Partial<League>,
): Promise<League> {
  const leagues =
    readLeagues();

  const league =
    leagues.find(
      (item) => item.id === id,
    );

  if (!league) {
    throw new Error(
      'Liga no encontrada.',
    );
  }

  const updated: League = {
    ...league,
    ...updates,
    id: league.id,
    ownerId: league.ownerId,
    sport: 'Fútbol',
    playoffFormat:
      updates.playoffFormat ??
      league.playoffFormat ??
      {
        quarterfinal: 'single-match',
        semifinal: 'single-match',
        final: 'single-match',
      },
  };

  writeLeagues(
    leagues.map(
      (item) =>
        item.id === id
          ? updated
          : item,
    ),
  );

  return updated;
}

async function togglePause(
  id: string,
  actorId: string,
): Promise<League> {
  const leagues =
    readLeagues();

  const league =
    leagues.find(
      (item) => item.id === id,
    );

  if (!league) {
    throw new Error(
      'Liga no encontrada.',
    );
  }

  const newStatus =
    league.status ===
    'active'
      ? 'paused'
      : 'active';

  const updated = {
    ...league,
    status: newStatus,
  };

  writeLeagues(
    leagues.map(
      (item) =>
        item.id === id
          ? updated
          : item,
    ),
  );

  auditService.log(
    id,
    actorId,
    newStatus === 'paused'
      ? 'league_paused'
      : 'league_resumed',
    `Liga ${
      newStatus === 'paused'
        ? 'pausada'
        : 'reanudada'
    }.`,
  );

  return updated;
}

async function deleteLeague(
  id: string,
  actorId: string,
): Promise<void> {
  const leagues =
    readLeagues();

  const league =
    leagues.find(
      (item) => item.id === id,
    );

  if (!league) {
    throw new Error(
      'Liga no encontrada.',
    );
  }

  if (
    league.ownerId !== actorId
  ) {
    throw new Error(
      'Solo el propietario puede eliminar esta liga.',
    );
  }

  writeLeagues(
    leagues.filter(
      (item) =>
        item.id !== id,
    ),
  );

  auditService.log(
    id,
    actorId,
    'league_deleted',
    `Liga "${league.name}" eliminada.`,
  );
}

async function getLeaguesByUser(
  userId: string,
): Promise<League[]> {
  const memberships =
    await memberService.getMembershipsByUser(
      userId,
    );

  const leagueIds =
    memberships.map(
      (membership) =>
        membership.leagueId,
    );

  return readLeagues().filter(
    (league) =>
      leagueIds.includes(
        league.id,
      ),
  );
}

export const leagueService = {
  getLeagues,
  getLeagueById,
  getLeagueByInviteCode,
  createLeague,
  updateLeague,
  togglePause,
  deleteLeague,
  getLeaguesByUser,
  generateInviteCode,
};