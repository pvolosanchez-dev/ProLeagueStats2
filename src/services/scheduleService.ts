import { Match } from '@/types';
import { storageService } from './storageService';
import { STORAGE_KEYS } from './storageKeys';
import { teamService } from './teamService';
import { leagueService } from './leagueService';
import { seasonService } from './seasonService';
import { memberService } from './memberService';
import { auditService } from './auditService';

function readMatches(): Match[] {
  return storageService.getCollection<Match>(
    STORAGE_KEYS.matches,
    [],
  );
}

function writeMatches(matches: Match[]): void {
  storageService.setItem(STORAGE_KEYS.matches, matches);
}

function createId(): string {
  return `match-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createRegularMatch(
  leagueId: string,
  seasonId: string,
  round: number,
  homeTeamId: string,
  awayTeamId: string,
  offsetDays: number,
): Match {
  return {
    id: createId(),
    leagueId,
    seasonId,
    round,
    date: new Date(
      Date.now() + offsetDays * 24 * 60 * 60 * 1000,
    ).toISOString(),
    venue: '',
    homeTeamId,
    awayTeamId,
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    mvpPlayerId: null,
    wentToOvertime: false,
    phase: 'regular',
    playoffRound: null,
    playoffSeriesId: null,
    playoffLeg: null,
    playoffSeedHome: null,
    playoffSeedAway: null,
  };
}

/**
 * Genera automáticamente el calendario de la fase regular usando
 * el algoritmo de círculo. Si hay un número impar de equipos se agrega
 * un BYE virtual por jornada.
 *
 * `legs = 1`: todos contra todos una vez.
 * `legs = 2`: todos contra todos ida y vuelta, invirtiendo localía.
 */
async function generateSeasonSchedule(
  leagueId: string,
  seasonId: string,
  actorId: string,
  legs: 1 | 2 = 1,
): Promise<Match[]> {
  const league = await leagueService.getLeagueById(leagueId);

  if (!league) {
    throw new Error('Liga no encontrada.');
  }

  if (league.status === 'paused') {
    throw new Error('La liga está suspendida.');
  }

  const membership = await memberService.getMemberByUser(
    leagueId,
    actorId,
  );

  if (
    !membership ||
    membership.status !== 'active' ||
    (membership.role !== 'owner' && membership.role !== 'admin')
  ) {
    throw new Error(
      'Solo el propietario o administrador puede generar el calendario.',
    );
  }

  const season = await seasonService.getActiveSeason(leagueId);

  if (!season || season.id !== seasonId) {
    throw new Error(
      'La temporada indicada no corresponde a la temporada activa de esta liga.',
    );
  }

  if (season.phase !== 'regular') {
    throw new Error(
      'El calendario de la fase regular solo puede generarse durante la fase regular.',
    );
  }

  const teams = await teamService.getTeamsByLeague(leagueId);

  if (teams.length < 2) {
    throw new Error('Se necesitan al menos 2 equipos para generar el calendario.');
  }

  const matches = readMatches();

  const existingSeasonMatches = matches.filter(
    (match) =>
      match.leagueId === leagueId &&
      match.seasonId === seasonId &&
      match.phase === 'regular',
  );

  if (existingSeasonMatches.length > 0) {
    return existingSeasonMatches;
  }

  const rotation = teams.map((team) => team.id);
  const bye = `bye-${seasonId}`;

  if (rotation.length % 2 !== 0) {
    rotation.push(bye);
  }

  const roundsPerLeg = rotation.length - 1;
  const matchesPerRound = rotation.length / 2;
  const generated: Match[] = [];

  for (let roundIndex = 0; roundIndex < roundsPerLeg; roundIndex += 1) {
    const round = roundIndex + 1;

    for (let pairIndex = 0; pairIndex < matchesPerRound; pairIndex += 1) {
      const first = rotation[pairIndex];
      const second = rotation[rotation.length - 1 - pairIndex];

      if (first === bye || second === bye) {
        continue;
      }

      const homeTeamId =
        roundIndex % 2 === 0 ? first : second;
      const awayTeamId =
        roundIndex % 2 === 0 ? second : first;

      generated.push(
        createRegularMatch(
          leagueId,
          seasonId,
          round,
          homeTeamId,
          awayTeamId,
          roundIndex * 7,
        ),
      );
    }

    const fixed = rotation[0];
    const rest = rotation.slice(1);
    rest.unshift(rest.pop()!);
    rotation.splice(0, rotation.length, fixed, ...rest);
  }

  if (legs === 2) {
    const firstLegMatches = [...generated];

    firstLegMatches.forEach((match) => {
      generated.push({
        ...match,
        id: createId(),
        round: match.round + roundsPerLeg,
        date: new Date(
          Date.now() +
            (match.round - 1 + roundsPerLeg) *
              7 *
              24 *
              60 *
              60 *
              1000,
        ).toISOString(),
        homeTeamId: match.awayTeamId,
        awayTeamId: match.homeTeamId,
      });
    });
  }

  writeMatches([...matches, ...generated]);

  auditService.log(
    leagueId,
    actorId,
    'schedule_generated',
    `Calendario de temporada generado: ${generated.length} partidos en ${
      roundsPerLeg * legs
    } jornadas.`,
  );

  return generated;
}

export const scheduleService = {
  generateSeasonSchedule,
};
