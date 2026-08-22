import { storageService } from './storageService';
import { STORAGE_KEYS } from './storageKeys';
import { playerService } from './playerService';
import { matchService } from './matchService';

export interface MatchPlayerStat {
  id: string;
  matchId: string;
  playerId: string;
  goals: number;
  assists: number;
  isMvp: boolean;
}

function readStats(): MatchPlayerStat[] {
  return storageService.getCollection<MatchPlayerStat>(
    STORAGE_KEYS.matchPlayerStats,
    [],
  );
}

function writeStats(
  stats: MatchPlayerStat[],
): void {
  storageService.setItem(
    STORAGE_KEYS.matchPlayerStats,
    stats,
  );
}

async function getStatsByMatch(
  matchId: string,
): Promise<MatchPlayerStat[]> {
  return readStats().filter(
    (stat) => stat.matchId === matchId,
  );
}

async function getStatsByPlayer(
  playerId: string,
): Promise<MatchPlayerStat[]> {
  return readStats().filter(
    (stat) => stat.playerId === playerId,
  );
}

function validateNumber(
  value: number,
  field: string,
): void {
  if (
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new Error(
      `${field} debe ser un número entero mayor o igual a 0.`,
    );
  }
}

export interface SaveMatchPlayerStatInput {
  playerId: string;
  goals: number;
  assists: number;
  isMvp: boolean;
}

async function saveMatchStats(
  matchId: string,
  statsInput: SaveMatchPlayerStatInput[],
): Promise<MatchPlayerStat[]> {
  const match =
    await matchService.getMatchById(
      matchId,
    );

  if (!match) {
    throw new Error(
      'Partido no encontrado.',
    );
  }

  if (
    match.status !== 'finished'
  ) {
    throw new Error(
      'Primero debes registrar el resultado del partido.',
    );
  }

  const homePlayers =
    await playerService.getPlayersByTeam(
      match.homeTeamId,
    );

  const awayPlayers =
    await playerService.getPlayersByTeam(
      match.awayTeamId,
    );

  const validPlayers = [
    ...homePlayers,
    ...awayPlayers,
  ];

  const validPlayerIds = new Set(
    validPlayers.map(
      (player) => player.id,
    ),
  );

  const uniquePlayerIds =
    new Set<string>();

  let mvpCount = 0;

  let homeGoals = 0;
  let awayGoals = 0;

  for (const input of statsInput) {
    if (
      uniquePlayerIds.has(
        input.playerId,
      )
    ) {
      throw new Error(
        'Un jugador no puede aparecer dos veces en el mismo partido.',
      );
    }

    uniquePlayerIds.add(
      input.playerId,
    );

    if (
      !validPlayerIds.has(
        input.playerId,
      )
    ) {
      throw new Error(
        'Uno de los jugadores no pertenece a los equipos de este partido.',
      );
    }

    validateNumber(
      input.goals,
      'Los goles',
    );

    validateNumber(
      input.assists,
      'Las asistencias',
    );

    const player =
      validPlayers.find(
        (candidate) =>
          candidate.id ===
          input.playerId,
      );

    if (player) {
      if (
        player.teamId ===
        match.homeTeamId
      ) {
        homeGoals +=
          input.goals;
      } else if (
        player.teamId ===
        match.awayTeamId
      ) {
        awayGoals +=
          input.goals;
      }
    }

    if (input.isMvp) {
      mvpCount++;
    }
  }

  if (
    mvpCount > 1
  ) {
    throw new Error(
      'Solo puede haber un MVP por partido.',
    );
  }

  if (
    homeGoals !==
      (match.homeScore ?? 0) ||
    awayGoals !==
      (match.awayScore ?? 0)
  ) {
    throw new Error(
      `Los goles registrados por jugador (${homeGoals}-${awayGoals}) deben coincidir con el resultado (${match.homeScore}-${match.awayScore}).`,
    );
  }

  const allStats =
    readStats();

  const previousStats =
    allStats.filter(
      (stat) =>
        stat.matchId ===
        matchId,
    );

  /*
   * Revertir las estadísticas
   * anteriores antes de aplicar
   * las nuevas.
   */
  for (const previous of previousStats) {
    const player =
      await playerService.getPlayerById(
        previous.playerId,
      );

    if (!player) {
      continue;
    }

    await playerService.updatePlayer(
      player.id,
      {
        stats: {
          ...player.stats,

          gamesPlayed:
            Math.max(
              0,
              player.stats.gamesPlayed -
                1,
            ),

          goals:
            Math.max(
              0,
              player.stats.goals -
                previous.goals,
            ),

          assists:
            Math.max(
              0,
              player.stats.assists -
                previous.assists,
            ),

          mvpAwards:
            Math.max(
              0,
              player.stats.mvpAwards -
                (previous.isMvp
                  ? 1
                  : 0),
            ),
        },
      },
    );
  }

  const nextStats =
    allStats.filter(
      (stat) =>
        stat.matchId !==
        matchId,
    );

  const savedStats =
    statsInput.map(
      (input) => ({
        id: `match-stat-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,

        matchId,

        playerId:
          input.playerId,

        goals:
          input.goals,

        assists:
          input.assists,

        isMvp:
          input.isMvp,
      }),
    );

  const meaningfulStats =
    savedStats.filter(
      (stat) =>
        stat.goals > 0 ||
        stat.assists > 0 ||
        stat.isMvp,
    );

  writeStats([
    ...nextStats,
    ...meaningfulStats,
  ]);

  /*
   * Aplicar las nuevas
   * estadísticas.
   */
  for (const stat of savedStats) {
    const player =
      await playerService.getPlayerById(
        stat.playerId,
      );

    if (!player) {
      continue;
    }

    await playerService.updatePlayer(
      player.id,
      {
        stats: {
          ...player.stats,

          gamesPlayed:
            player.stats.gamesPlayed +
            1,

          goals:
            player.stats.goals +
            stat.goals,

          assists:
            player.stats.assists +
            stat.assists,

          mvpAwards:
            player.stats.mvpAwards +
            (stat.isMvp
              ? 1
              : 0),
        },
      },
    );
  }

  return meaningfulStats;
}

async function deleteMatchStats(
  matchId: string,
): Promise<void> {
  const existing =
    await getStatsByMatch(
      matchId,
    );

  for (const stat of existing) {
    const player =
      await playerService.getPlayerById(
        stat.playerId,
      );

    if (!player) {
      continue;
    }

    await playerService.updatePlayer(
      player.id,
      {
        stats: {
          ...player.stats,

          gamesPlayed:
            Math.max(
              0,
              player.stats.gamesPlayed -
                1,
            ),

          goals:
            Math.max(
              0,
              player.stats.goals -
                stat.goals,
            ),

          assists:
            Math.max(
              0,
              player.stats.assists -
                stat.assists,
            ),

          mvpAwards:
            Math.max(
              0,
              player.stats.mvpAwards -
                (stat.isMvp
                  ? 1
                  : 0),
            ),
        },
      },
    );
  }

  writeStats(
    readStats().filter(
      (stat) =>
        stat.matchId !==
        matchId,
    ),
  );
}

export const matchPlayerStatsService = {
  getStatsByMatch,
  getStatsByPlayer,
  saveMatchStats,
  deleteMatchStats,
};