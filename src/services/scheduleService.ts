import { Match } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { teamService } from './teamService';
import { leagueService } from './leagueService';
import { seasonService } from './seasonService';
import { memberService } from './memberService';
import { auditService } from './auditService';

function createId(): string {
  return `match-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mapMatch(row: any): Match {
  return {
    id: row.id,
    leagueId: row.league_id,
    seasonId: row.season_id,
    round: row.round,
    date: row.date,
    venue: row.venue ?? '',
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    homeScore: row.home_score,
    awayScore: row.away_score,
    status: row.status,
    mvpPlayerId: row.mvp_player_id,
    wentToOvertime: row.went_to_overtime,
    phase: row.phase,
    playoffRound: row.playoff_round,
    playoffSeriesId: row.playoff_series_id,
    playoffLeg: row.playoff_leg,
    playoffSeedHome: row.playoff_seed_home,
    playoffSeedAway: row.playoff_seed_away,
  };
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
    date: new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000).toISOString(),
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

async function generateSeasonSchedule(
  leagueId: string,
  seasonId: string,
  actorId: string,
  legs: 1 | 2 = 1,
): Promise<Match[]> {
  const league = await leagueService.getLeagueById(leagueId);
  if (!league) throw new Error('Liga no encontrada.');
  if (league.status === 'paused') throw new Error('La liga está suspendida.');

  const membership = await memberService.getMemberByUser(leagueId, actorId);
  if (!membership || membership.status !== 'active' || (membership.role !== 'owner' && membership.role !== 'admin')) {
    throw new Error('Solo el propietario o administrador puede generar el calendario.');
  }

  const season = await seasonService.getActiveSeason(leagueId);
  if (!season || season.id !== seasonId) {
    throw new Error('La temporada indicada no corresponde a la temporada activa de esta liga.');
  }
  if (season.phase !== 'regular') {
    throw new Error('El calendario de la fase regular solo puede generarse durante la fase regular.');
  }

  const teams = await teamService.getTeamsByLeague(leagueId);
  if (teams.length < 2) throw new Error('Se necesitan al menos 2 equipos para generar el calendario.');

  const { data: existing, error: existingError } = await supabase
    .from('matches')
    .select('*')
    .eq('league_id', leagueId)
    .eq('season_id', seasonId)
    .eq('phase', 'regular');

  if (existingError) throw existingError;
  if ((existing ?? []).length > 0) return (existing ?? []).map(mapMatch);

  const rotation = teams.map((team) => team.id);
  const bye = `bye-${seasonId}`;
  if (rotation.length % 2 !== 0) rotation.push(bye);

  const roundsPerLeg = rotation.length - 1;
  const matchesPerRound = rotation.length / 2;
  const generated: Match[] = [];

  for (let roundIndex = 0; roundIndex < roundsPerLeg; roundIndex += 1) {
    const round = roundIndex + 1;

    for (let pairIndex = 0; pairIndex < matchesPerRound; pairIndex += 1) {
      const first = rotation[pairIndex];
      const second = rotation[rotation.length - 1 - pairIndex];
      if (first === bye || second === bye) continue;

      generated.push(
        createRegularMatch(
          leagueId,
          seasonId,
          round,
          roundIndex % 2 === 0 ? first : second,
          roundIndex % 2 === 0 ? second : first,
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
          Date.now() + (match.round - 1 + roundsPerLeg) * 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        homeTeamId: match.awayTeamId,
        awayTeamId: match.homeTeamId,
      });
    });
  }

  const rows = generated.map((match) => ({
    id: match.id,
    league_id: match.leagueId,
    season_id: match.seasonId,
    round: match.round,
    date: match.date,
    venue: match.venue,
    home_team_id: match.homeTeamId,
    away_team_id: match.awayTeamId,
    home_score: null,
    away_score: null,
    status: 'scheduled',
    mvp_player_id: null,
    went_to_overtime: false,
    phase: 'regular',
    playoff_round: null,
    playoff_series_id: null,
    playoff_leg: null,
    playoff_seed_home: null,
    playoff_seed_away: null,
  }));

  const { data, error } = await supabase
    .from('matches')
    .insert(rows)
    .select('*');

  if (error) throw error;

  await auditService.log(
    leagueId,
    actorId,
    'schedule_generated',
    `Calendario de temporada generado: ${generated.length} partidos en ${roundsPerLeg * legs} jornadas.`,
  );

  return (data ?? []).map(mapMatch);
}

export const scheduleService = {
  generateSeasonSchedule,
};
