import { Match } from '@/types';
import { storageService } from './storageService';
import { STORAGE_KEYS } from './storageKeys';
import { seedMatches } from '@/data';
import { auditService } from './auditService';
import { leagueService } from './leagueService';
import { teamService } from './teamService';
import { memberService } from './memberService';
import { seasonService } from './seasonService';
import { isRegularSeasonComplete } from '@/utils/regularSeason';
import { playoffService } from './playoffService';

function readMatches(): Match[] {
  return storageService.getCollection<Match>(
    STORAGE_KEYS.matches,
    seedMatches,
  );
}

function writeMatches(matches: Match[]): void {
  storageService.setItem(
    STORAGE_KEYS.matches,
    matches,
  );
}

async function getMatches(): Promise<Match[]> {
  return readMatches();
}

async function getMatchesByLeague(
  leagueId: string,
): Promise<Match[]> {
  return readMatches().filter(
    (match) => match.leagueId === leagueId,
  );
}

async function getMatchesByTeam(
  teamId: string,
): Promise<Match[]> {
  return readMatches().filter(
    (match) =>
      match.homeTeamId === teamId ||
      match.awayTeamId === teamId,
  );
}

async function getMatchById(
  id: string,
): Promise<Match | null> {
  return (
    readMatches().find(
      (match) => match.id === id,
    ) ?? null
  );
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

async function createMatch(
  input: CreateMatchInput,
  actorId: string,
): Promise<Match> {
  const league =
    await leagueService.getLeagueById(
      input.leagueId,
    );

  if (!league) {
    throw new Error(
      'Liga no encontrada.',
    );
  }

  if (league.status === 'paused') {
    throw new Error(
      'La liga está suspendida. No se pueden crear partidos.',
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
      'Solo el propietario o administrador puede crear partidos.',
    );
  }

  if (
    !Number.isInteger(input.round) ||
    input.round < 1
  ) {
    throw new Error(
      'La jornada debe ser un número válido mayor que 0.',
    );
  }

  if (!input.date.trim()) {
    throw new Error(
      'Debes indicar la fecha y hora del partido.',
    );
  }

  if (!input.homeTeamId || !input.awayTeamId) {
    throw new Error(
      'Debes seleccionar ambos equipos.',
    );
  }

  if (
    input.homeTeamId ===
    input.awayTeamId
  ) {
    throw new Error(
      'Un equipo no puede jugar contra sí mismo.',
    );
  }

  const homeTeam =
    await teamService.getTeamById(
      input.homeTeamId,
    );

  const awayTeam =
    await teamService.getTeamById(
      input.awayTeamId,
    );

  if (!homeTeam || !awayTeam) {
    throw new Error(
      'Uno de los equipos no existe.',
    );
  }

  if (
    homeTeam.leagueId !==
      input.leagueId ||
    awayTeam.leagueId !==
      input.leagueId
  ) {
    throw new Error(
      'Los dos equipos deben pertenecer a esta liga.',
    );
  }

  const matches = readMatches();

  const duplicate = matches.find(
    (match) =>
      match.leagueId ===
        input.leagueId &&
      match.round === input.round &&
      (
        (
          match.homeTeamId ===
            input.homeTeamId &&
          match.awayTeamId ===
            input.awayTeamId
        ) ||
        (
          match.homeTeamId ===
            input.awayTeamId &&
          match.awayTeamId ===
            input.homeTeamId
        )
      ),
  );

  if (duplicate) {
    throw new Error(
      'Ese enfrentamiento ya existe en esta jornada.',
    );
  }

  const match: Match = {
  id: `match-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}`,
  leagueId: input.leagueId,
  seasonId:
    input.seasonId ??
    league.seasonId ??
    null,
  round: input.round,
  date: input.date,
  venue: input.venue.trim(),
  homeTeamId: input.homeTeamId,
  awayTeamId: input.awayTeamId,
  homeScore: null,
  awayScore: null,
  status: 'scheduled',
  mvpPlayerId: null,
  wentToOvertime: false,

  phase: 'regular',
  playoffRound: null,
  playoffSeedHome: null,
  playoffSeedAway: null,
};

  writeMatches([
    ...matches,
    match,
  ]);

  auditService.log(
    input.leagueId,
    actorId,
    'match_created',
    `Partido J${input.round} creado: ${homeTeam.name} vs ${awayTeam.name}.`,
  );

  return match;
}

interface UpdateScoreInput {
  matchId: string;
  homeScore: number;
  awayScore: number;
  mvpPlayerId?: string | null;
  wentToOvertime: boolean;
}

async function updateScore(
  input: UpdateScoreInput,
  actorId: string,
): Promise<Match> {
  const matches = readMatches();

  const match = matches.find(
    (candidate) =>
      candidate.id === input.matchId,
  );

  if (!match) {
    throw new Error(
      'Partido no encontrado.',
    );
  }

  const league =
    await leagueService.getLeagueById(
      match.leagueId,
    );

  if (!league) {
    throw new Error(
      'Liga no encontrada.',
    );
  }

  if (league.status === 'paused') {
    throw new Error(
      'La liga está suspendida. No se pueden modificar resultados mientras esté pausada.',
    );
  }

  const membership =
    await memberService.getMemberByUser(
      match.leagueId,
      actorId,
    );

  if (
    !membership ||
    membership.status !== 'active' ||
    (membership.role !== 'owner' &&
      membership.role !== 'admin')
  ) {
    throw new Error(
      'Solo el propietario o administrador puede registrar resultados.',
    );
  }

  if (
    !Number.isInteger(
      input.homeScore,
    ) ||
    !Number.isInteger(
      input.awayScore,
    ) ||
    input.homeScore < 0 ||
    input.awayScore < 0
  ) {
    throw new Error(
      'Los resultados deben ser números enteros mayores o iguales a 0.',
    );
  }

  if (
    input.homeScore > 99 ||
    input.awayScore > 99
  ) {
    throw new Error(
      'El resultado no puede superar 99.',
    );
  }

  if (input.mvpPlayerId) {
    const {
      playerService,
    } = await import(
      './playerService'
    );

    const mvp =
      await playerService.getPlayerById(
        input.mvpPlayerId,
      );

    if (
      !mvp ||
      (
        mvp.teamId !==
          match.homeTeamId &&
        mvp.teamId !==
          match.awayTeamId
      )
    ) {
      throw new Error(
        'El MVP debe pertenecer a uno de los equipos del partido.',
      );
    }
  }

  const wasFinished =
    match.status === 'finished';

 const updatedMatch: Match = {
  ...match,
  homeScore: input.homeScore,
  awayScore: input.awayScore,
  status: 'finished',
  mvpPlayerId:
    input.mvpPlayerId ??
    match.mvpPlayerId,
  wentToOvertime:
    input.wentToOvertime,
};

  writeMatches(
    matches.map(
      (candidate) =>
        candidate.id ===
        input.matchId
          ? updatedMatch
          : candidate,
    ),
  );

if (!wasFinished) {
  auditService.log(
    match.leagueId,
    actorId,
    'match_registered',
    `Resultado registrado: ${input.homeScore}-${input.awayScore}.`,
  );

  /*
   * Comprobar si la fase regular terminó.
   *
   * Solo se ejecuta cuando se registra
   * un partido por primera vez.
   */
  if (league.seasonId) {
    const season =
      await seasonService.getActiveSeason(
        league.id,
      );

    if (
      season &&
      season.phase === 'regular'
    ) {
      const leagueTeams =
        await teamService.getTeamsByLeague(
          league.id,
        );

      const allLeagueMatches =
        readMatches();

      const regularSeasonComplete =
        isRegularSeasonComplete(
          leagueTeams.map(
            (team) => team.id,
          ),
          allLeagueMatches.filter(
            (leagueMatch) =>
              leagueMatch.leagueId ===
              league.id,
          ),
        );

      if (
        regularSeasonComplete
      ) {
        if (
          league.format ===
          'league-playoff'
        ) {
         seasonService.setPhase(
  season.id,
  'playoff',
);

await playoffService.generateTop8Playoff(
  league.id,
  season.id,
  actorId,
);

auditService.log(
  league.id,
  actorId,
  'regular_season_finished',
  'La fase regular terminó y se generó la liguilla Top 8.',
);
        } else if (
          league.format ===
          'league-knockout'
        ) {
          seasonService.setPhase(
            season.id,
            'knockout',
          );

          auditService.log(
            league.id,
            actorId,
            'regular_season_finished',
            'La fase regular terminó. La liga pasó a fase de eliminación.',
          );
        } else if (
          league.format === 'league'
        ) {
          seasonService.finish(
            season.id,
          );

          auditService.log(
            league.id,
            actorId,
            'season_finished',
            'La fase regular terminó y la temporada fue finalizada.',
          );
        }
      }
    }
  }
}
if (
  !wasFinished &&
  updatedMatch.phase === 'playoff' &&
  updatedMatch.seasonId
) {
  await playoffService.advancePlayoffRound(
    league.id,
    updatedMatch.seasonId,
    actorId,
  );
}

  return updatedMatch;
}

async function deleteMatch(
  id: string,
  actorId: string,
): Promise<void> {
  const match =
    await getMatchById(id);

  if (!match) {
    return;
  }

  const league =
    await leagueService.getLeagueById(
      match.leagueId,
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
      match.leagueId,
      actorId,
    );

  if (
    !membership ||
    membership.status !== 'active' ||
    (
      membership.role !== 'owner' &&
      membership.role !== 'admin'
    )
  ) {
    throw new Error(
      'Solo el propietario o administrador puede eliminar partidos.',
    );
  }

  writeMatches(
    readMatches().filter(
      (currentMatch) =>
        currentMatch.id !== id,
    ),
  );

  auditService.log(
    match.leagueId,
    actorId,
    'match_deleted',
    `Partido J${match.round} eliminado.`,
  );
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