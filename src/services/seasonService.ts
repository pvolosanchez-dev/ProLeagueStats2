import { Season } from '@/types';
import { storageService } from './storageService';
import { STORAGE_KEYS } from './storageKeys';
import { seedSeasons } from '@/data';

function readSeasons(): Season[] {
  const seasons =
    storageService.getCollection<Season>(
      STORAGE_KEYS.seasons,
      seedSeasons,
    );

  const migrated = seasons.map(
    (season) => ({
      ...season,
      phase:
        season.phase ??
        'regular',
    }),
  );

  storageService.setItem(
    STORAGE_KEYS.seasons,
    migrated,
  );

  return migrated;
}

function writeSeasons(
  seasons: Season[],
): void {
  storageService.setItem(
    STORAGE_KEYS.seasons,
    seasons,
  );
}

async function getByLeague(
  leagueId: string,
): Promise<Season[]> {
  return readSeasons()
    .filter(
      (s) => s.leagueId === leagueId,
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    );
}

async function getActiveSeason(
  leagueId: string,
): Promise<Season | null> {
  return (
    readSeasons().find(
      (s) =>
        s.leagueId === leagueId &&
        s.status === 'active',
    ) ?? null
  );
}

function create(
  leagueId: string,
  name: string,
): Season {
  const season: Season = {
    id: `season-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`,
    leagueId,
    name,
    status: 'draft',
    phase: 'regular',
    startDate: null,
    endDate: null,
    createdAt:
      new Date().toISOString(),
  };

  writeSeasons([
    ...readSeasons(),
    season,
  ]);

  return season;
}

function activate(
  seasonId: string,
): void {
  const seasons = readSeasons();

  const season = seasons.find(
    (s) => s.id === seasonId,
  );

  if (!season) return;

  writeSeasons(
    seasons.map((s) => {
      if (
        s.leagueId ===
          season.leagueId &&
        s.status === 'active'
      ) {
        return {
          ...s,
          status:
            'finished' as const,
        };
      }

      if (s.id === seasonId) {
        return {
          ...s,
          status: 'active' as const,
          phase: 'regular',
        };
      }

      return s;
    }),
  );
}

function setPhase(
  seasonId: string,
  phase: Season['phase'],
): Season | null {
  const seasons = readSeasons();

  let updatedSeason: Season | null =
    null;

  const next = seasons.map(
    (season) => {
      if (season.id !== seasonId) {
        return season;
      }

      updatedSeason = {
        ...season,
        phase,
      };

      return updatedSeason;
    },
  );

  writeSeasons(next);

  return updatedSeason;
}

function finish(
  seasonId: string,
): void {
  const seasons = readSeasons();

  writeSeasons(
    seasons.map((s) =>
      s.id === seasonId
        ? {
            ...s,
            status:
              'finished' as const,
          }
        : s,
    ),
  );
}

export const seasonService = {
  getByLeague,
  getActiveSeason,
  create,
  activate,
  setPhase,
  finish,
};