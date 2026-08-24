import {
  Match,
  PlayoffRound,
  Standing,
} from '@/types';

import { storageService } from './storageService';
import { STORAGE_KEYS } from './storageKeys';
import { teamService } from './teamService';
import { auditService } from './auditService';
import { seasonService } from './seasonService';
import { leagueService } from './leagueService';
import { playoffSeriesService } from './playoffSeriesService';
import { calculateStandings } from '@/utils/standings';

function readMatches(): Match[] {
  return storageService.getCollection<Match>(
    STORAGE_KEYS.matches,
    [],
  );
}

function writeMatches(
  matches: Match[],
): void {
  storageService.setItem(
    STORAGE_KEYS.matches,
    matches,
  );
}

function createId(
  prefix: string,
): string {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

async function getLeagueStandings(
  leagueId: string,
  matches: Match[],
): Promise<Standing[]> {
  const teams =
    await teamService.getTeamsByLeague(
      leagueId,
    );

  return calculateStandings(
    teams.map(
      (team) => team.id,
    ),
    matches.filter(
      (match) =>
        match.leagueId ===
          leagueId &&
        match.phase ===
          'regular',
    ),
  );
}

function getFormatKey(
  round: PlayoffRound,
): 'quarterfinal' | 'semifinal' | 'final' {
  if (round === 'quarterfinal') {
    return 'quarterfinal';
  }

  if (round === 'semifinal') {
    return 'semifinal';
  }

  return 'final';
}

function createPlayoffMatch(
  {
    leagueId,
    seasonId,
    round,
    homeTeamId,
    awayTeamId,
    playoffSeriesId,
    playoffLeg,
    seedHome,
    seedAway,
    offsetHours,
  }: {
    leagueId: string;
    seasonId: string;
    round: PlayoffRound;
    homeTeamId: string;
    awayTeamId: string;
    playoffSeriesId: string;
    playoffLeg: 1 | 2 | null;
    seedHome: number | null;
    seedAway: number | null;
    offsetHours: number;
  },
): Match {
  return {
    id: createId('playoff'),
    leagueId,
    seasonId,
    round: 0,
    date: new Date(
      Date.now() +
        offsetHours *
          60 *
          60 *
          1000,
    ).toISOString(),
    venue: '',
    homeTeamId,
    awayTeamId,
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    mvpPlayerId: null,
    wentToOvertime: false,
    phase: 'playoff',
    playoffRound: round,
    playoffSeriesId,
    playoffLeg,
    playoffSeedHome:
      seedHome,
    playoffSeedAway:
      seedAway,
  };
}

function createSeriesMatches(
  {
    leagueId,
    seasonId,
    round,
    homeTeamId,
    awayTeamId,
    seedHome,
    seedAway,
    seriesIndex,
    playoffFormat,
  }: {
    leagueId: string;
    seasonId: string;
    round: PlayoffRound;
    homeTeamId: string;
    awayTeamId: string;
    seedHome: number | null;
    seedAway: number | null;
    seriesIndex: number;
    playoffFormat:
      'single-match' |
      'home-and-away';
  },
): Match[] {
  const seriesId = createId(
    `${round}-${seriesIndex + 1}`,
  );

  if (
    playoffFormat ===
    'single-match'
  ) {
    return [
      createPlayoffMatch({
        leagueId,
        seasonId,
        round,
        homeTeamId,
        awayTeamId,
        playoffSeriesId:
          seriesId,
        playoffLeg: 1,
        seedHome,
        seedAway,
        offsetHours:
          seriesIndex,
      }),
    ];
  }

  return [
    createPlayoffMatch({
      leagueId,
      seasonId,
      round,
      homeTeamId,
      awayTeamId,
      playoffSeriesId:
        seriesId,
      playoffLeg: 1,
      seedHome,
      seedAway,
      offsetHours:
        seriesIndex * 2,
    }),

    createPlayoffMatch({
      leagueId,
      seasonId,
      round,
      homeTeamId:
        awayTeamId,
      awayTeamId:
        homeTeamId,
      playoffSeriesId:
        seriesId,
      playoffLeg: 2,
      seedHome:
        seedAway,
      seedAway:
        seedHome,
      offsetHours:
        seriesIndex * 2 + 1,
    }),
  ];
}

export async function generateTop8Playoff(
  leagueId: string,
  seasonId: string,
  actorId: string,
): Promise<Match[]> {
  const matches =
    readMatches();

  const existingPlayoffMatches =
    matches.filter(
      (match) =>
        match.leagueId ===
          leagueId &&
        match.seasonId ===
          seasonId &&
        match.phase ===
          'playoff',
    );

  if (
    existingPlayoffMatches.length > 0
  ) {
    return existingPlayoffMatches;
  }

  const season =
    await seasonService.getActiveSeason(
      leagueId,
    );

  if (!season) {
    throw new Error(
      'No existe una temporada activa para esta liga.',
    );
  }

  if (
    season.id !==
    seasonId
  ) {
    throw new Error(
      'La temporada indicada no corresponde a la temporada activa de esta liga.',
    );
  }

  if (
    season.phase !==
    'playoff'
  ) {
    throw new Error(
      'La temporada todavía no está en fase de liguilla.',
    );
  }

  const league =
    await leagueService.getLeagueById(
      leagueId,
    );

  if (!league) {
    throw new Error(
      'Liga no encontrada.',
    );
  }

  if (
    league.format !==
    'league-playoff'
  ) {
    throw new Error(
      'Esta liga no utiliza el formato Liga + Liguilla.',
    );
  }

  const teams =
    await teamService.getTeamsByLeague(
      leagueId,
    );

  if (teams.length < 8) {
    throw new Error(
      'Se necesitan al menos 8 equipos para generar la liguilla.',
    );
  }

  const standings =
    await getLeagueStandings(
      leagueId,
      matches,
    );

  const top8 =
    standings.slice(0, 8);

  if (
    top8.length < 8
  ) {
    throw new Error(
      'No hay suficientes equipos clasificados para generar la liguilla.',
    );
  }

  const standingsByPosition =
    new Map<
      number,
      Standing
    >();

  top8.forEach(
    (
      standing,
      index,
    ) => {
      standingsByPosition.set(
        index + 1,
        standing,
      );
    },
  );

  const pairings:
    Array<
      [number, number]
    > = [
      [1, 8],
      [2, 7],
      [3, 6],
      [4, 5],
    ];

  const newMatches: Match[] = [];

  const playoffFormat =
    league.playoffFormat
      .quarterfinal;

  for (
    let index = 0;
    index < pairings.length;
    index++
  ) {
    const [
      seedHome,
      seedAway,
    ] = pairings[index];

    const home =
      standingsByPosition.get(
        seedHome,
      );

    const away =
      standingsByPosition.get(
        seedAway,
      );

    if (
      !home ||
      !away
    ) {
      throw new Error(
        'No se pudo construir uno de los cruces de la liguilla.',
      );
    }

    newMatches.push(
      ...createSeriesMatches({
        leagueId,
        seasonId,
        round:
          'quarterfinal',
        homeTeamId:
          home.teamId,
        awayTeamId:
          away.teamId,
        seedHome,
        seedAway,
        seriesIndex:
          index,
        playoffFormat,
      }),
    );
  }

  writeMatches([
    ...matches,
    ...newMatches,
  ]);

  auditService.log(
    leagueId,
    actorId,
    'playoff_generated',
    playoffFormat ===
      'home-and-away'
      ? 'Cuartos generados a ida y vuelta: 1-8, 2-7, 3-6 y 4-5.'
      : 'Cuartos generados a partido único: 1-8, 2-7, 3-6 y 4-5.',
  );

  return newMatches;
}

function getRoundSeries(
  matches: Match[],
  round: PlayoffRound,
): string[] {
  return [
    ...new Set(
      matches
        .filter(
          (match) =>
            match.phase ===
              'playoff' &&
            match.playoffRound ===
              round &&
            match.playoffSeriesId,
        )
        .map(
          (match) =>
            match.playoffSeriesId as string,
        ),
    ),
  ];
}

async function areRoundSeriesDecided(
  seriesIds: string[],
): Promise<boolean> {
  for (
    const seriesId of seriesIds
  ) {
    const result =
      playoffSeriesService.getSeriesResult(
        seriesId,
      );

    if (!result.decided) {
      return false;
    }
  }

  return true;
}

async function getSeriesWinner(
  seriesId: string,
): Promise<string> {
  const result =
    playoffSeriesService.getSeriesResult(
      seriesId,
    );

  if (
    !result.decided ||
    !result.winnerTeamId
  ) {
    throw new Error(
      'La serie todavía no está decidida.',
    );
  }

  return result.winnerTeamId;
}

async function generateNextRound(
  leagueId: string,
  seasonId: string,
  actorId: string,
  round: 'semifinal' | 'final',
  sourceRound: 'quarterfinal' | 'semifinal',
): Promise<Match[]> {
  const matches =
    readMatches();

  const existing =
    matches.filter(
      (match) =>
        match.leagueId ===
          leagueId &&
        match.seasonId ===
          seasonId &&
        match.phase ===
          'playoff' &&
        match.playoffRound ===
          round,
    );

  if (
    existing.length > 0
  ) {
    return existing;
  }

  const sourceSeriesIds =
    getRoundSeries(
      matches,
      sourceRound,
    );

  if (
    sourceSeriesIds.length === 0
  ) {
    return [];
  }

  const decided =
    await areRoundSeriesDecided(
      sourceSeriesIds,
    );

  if (!decided) {
    return [];
  }

  const orderedSeries =
    matches
      .filter(
        (match) =>
          match.phase ===
            'playoff' &&
          match.playoffRound ===
            sourceRound &&
          match.playoffSeriesId &&
          match.playoffLeg === 1,
      )
      .sort(
        (a, b) =>
          (a.playoffSeedHome ??
            99) -
          (b.playoffSeedHome ??
            99),
      );

  const uniqueSeries =
    [
      ...new Map(
        orderedSeries.map(
          (match) => [
            match.playoffSeriesId,
            match,
          ],
        ),
      ).values(),
    ];

  if (
    round === 'semifinal' &&
    uniqueSeries.length !== 4
  ) {
    return [];
  }

  if (
    round === 'final' &&
    uniqueSeries.length !== 2
  ) {
    return [];
  }

  const winners: string[] = [];

  for (
    const series of uniqueSeries
  ) {
    if (
      !series.playoffSeriesId
    ) {
      return [];
    }

    winners.push(
      await getSeriesWinner(
        series.playoffSeriesId,
      ),
    );
  }

  const league =
    await leagueService.getLeagueById(
      leagueId,
    );

  if (!league) {
    throw new Error(
      'Liga no encontrada.',
    );
  }

  const format =
    league.playoffFormat[
      getFormatKey(round)
    ];

  const generated: Match[] = [];

  if (
    round === 'semifinal'
  ) {
    generated.push(
      ...createSeriesMatches({
        leagueId,
        seasonId,
        round,
        homeTeamId:
          winners[0],
        awayTeamId:
          winners[3],
        seedHome: null,
        seedAway: null,
        seriesIndex: 0,
        playoffFormat: format,
      }),
    );

    generated.push(
      ...createSeriesMatches({
        leagueId,
        seasonId,
        round,
        homeTeamId:
          winners[1],
        awayTeamId:
          winners[2],
        seedHome: null,
        seedAway: null,
        seriesIndex: 1,
        playoffFormat: format,
      }),
    );
  }

  if (
    round === 'final'
  ) {
    generated.push(
      ...createSeriesMatches({
        leagueId,
        seasonId,
        round,
        homeTeamId:
          winners[0],
        awayTeamId:
          winners[1],
        seedHome: null,
        seedAway: null,
        seriesIndex: 0,
        playoffFormat: format,
      }),
    );
  }

  if (
    generated.length === 0
  ) {
    return [];
  }

  writeMatches([
    ...matches,
    ...generated,
  ]);

  auditService.log(
    leagueId,
    actorId,
    `${round}_generated`,
    round === 'semifinal'
      ? 'Semifinales generadas automáticamente.'
      : 'Final generada automáticamente.',
  );

  return generated;
}

export async function advancePlayoffRound(
  leagueId: string,
  seasonId: string,
  actorId: string,
): Promise<Match[]> {
  const matches =
    readMatches();

  const quarterfinals =
    getRoundSeries(
      matches,
      'quarterfinal',
    );

  if (
    quarterfinals.length > 0
  ) {
    const quartersDecided =
      await areRoundSeriesDecided(
        quarterfinals,
      );

    if (
      !quartersDecided
    ) {
      return [];
    }

    return generateNextRound(
      leagueId,
      seasonId,
      actorId,
      'semifinal',
      'quarterfinal',
    );
  }

  const semifinals =
    getRoundSeries(
      matches,
      'semifinal',
    );

  if (
    semifinals.length > 0
  ) {
    const semifinalsDecided =
      await areRoundSeriesDecided(
        semifinals,
      );

    if (
      !semifinalsDecided
    ) {
      return [];
    }

    return generateNextRound(
      leagueId,
      seasonId,
      actorId,
      'final',
      'semifinal',
    );
  }

  const finals =
    getRoundSeries(
      matches,
      'final',
    );

  if (
    finals.length > 0
  ) {
    const finalDecided =
      await areRoundSeriesDecided(
        finals,
      );

    if (!finalDecided) {
      return [];
    }

    const season =
      await seasonService.getActiveSeason(
        leagueId,
      );

    if (
      season &&
      season.id ===
        seasonId
    ) {
      seasonService.finish(
        season.id,
      );

      auditService.log(
        leagueId,
        actorId,
        'season_finished',
        'La final terminó. La temporada ha finalizado oficialmente.',
      );
    }

    return [];
  }

  return [];
}

export const playoffService = {
  generateTop8Playoff,
  advancePlayoffRound,
};