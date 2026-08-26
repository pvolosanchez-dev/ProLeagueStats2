import { Match } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { leagueService } from './leagueService';
import { teamService } from './teamService';
import { memberService } from './memberService';
import { seasonService } from './seasonService';
import { isRegularSeasonComplete } from '@/utils/regularSeason';
import { playoffService } from './playoffService';
import { auditService } from './auditService';

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

async function getMatches(): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('round', { ascending: true })
    .order('date', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapMatch);
}

async function getMatchesByLeague(leagueId: string): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('league_id', leagueId)
    .order('round', { ascending: true })
    .order('date', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapMatch);
}

async function getMatchesByTeam(teamId: string): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .order('date', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapMatch);
}

async function getMatchById(id: string): Promise<Match | null> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapMatch(data) : null;
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
  const league = await leagueService.getLeagueById(input.leagueId);
  if (!league) throw new Error('Liga no encontrada.');
  if (league.status === 'paused') throw new Error('La liga está suspendida. No se pueden crear partidos.');

  const membership = await memberService.getMemberByUser(input.leagueId, actorId);
  if (!membership || membership.status !== 'active' || (membership.role !== 'owner' && membership.role !== 'admin')) {
    throw new Error('Solo el propietario o administrador puede crear partidos.');
  }

  if (!Number.isInteger(input.round) || input.round < 1) {
    throw new Error('La jornada debe ser un número válido mayor que 0.');
  }
  if (!input.date.trim()) throw new Error('Debes indicar la fecha y hora del partido.');
  if (!input.homeTeamId || !input.awayTeamId) throw new Error('Debes seleccionar ambos equipos.');
  if (input.homeTeamId === input.awayTeamId) throw new Error('Un equipo no puede jugar contra sí mismo.');

  const [homeTeam, awayTeam] = await Promise.all([
    teamService.getTeamById(input.homeTeamId),
    teamService.getTeamById(input.awayTeamId),
  ]);

  if (!homeTeam || !awayTeam) throw new Error('Uno de los equipos no existe.');
  if (homeTeam.leagueId !== input.leagueId || awayTeam.leagueId !== input.leagueId) {
    throw new Error('Los dos equipos deben pertenecer a esta liga.');
  }

  const { data: duplicates, error: duplicateError } = await supabase
    .from('matches')
    .select('id')
    .eq('league_id', input.leagueId)
    .eq('round', input.round)
    .or(
      `and(home_team_id.eq.${input.homeTeamId},away_team_id.eq.${input.awayTeamId}),and(home_team_id.eq.${input.awayTeamId},away_team_id.eq.${input.homeTeamId})`,
    )
    .limit(1);

  if (duplicateError) throw duplicateError;
  if ((duplicates ?? []).length > 0) {
    throw new Error('Ese enfrentamiento ya existe en esta jornada.');
  }

  const id = `match-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await supabase
    .from('matches')
    .insert({
      id,
      league_id: input.leagueId,
      season_id: input.seasonId ?? league.seasonId ?? null,
      round: input.round,
      date: input.date,
      venue: input.venue.trim(),
      home_team_id: input.homeTeamId,
      away_team_id: input.awayTeamId,
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
    })
    .select()
    .single();

  if (error) throw error;

  await auditService.log(
    input.leagueId,
    actorId,
    'match_created',
    `Partido J${input.round} creado: ${homeTeam.name} vs ${awayTeam.name}.`,
  );

  return mapMatch(data);
}

interface UpdateScoreInput {
  matchId: string;
  homeScore: number;
  awayScore: number;
  mvpPlayerId?: string | null;
  wentToOvertime: boolean;
}

async function updateScore(input: UpdateScoreInput, actorId: string): Promise<Match> {
  const match = await getMatchById(input.matchId);
  if (!match) throw new Error('Partido no encontrado.');

  const league = await leagueService.getLeagueById(match.leagueId);
  if (!league) throw new Error('Liga no encontrada.');
  if (league.status === 'paused') throw new Error('La liga está suspendida. No se pueden modificar resultados mientras esté pausada.');

  const membership = await memberService.getMemberByUser(match.leagueId, actorId);
  if (!membership || membership.status !== 'active' || (membership.role !== 'owner' && membership.role !== 'admin')) {
    throw new Error('Solo el propietario o administrador puede registrar resultados.');
  }

  if (!Number.isInteger(input.homeScore) || !Number.isInteger(input.awayScore) || input.homeScore < 0 || input.awayScore < 0) {
    throw new Error('Los resultados deben ser números enteros mayores o iguales a 0.');
  }
  if (input.homeScore > 99 || input.awayScore > 99) throw new Error('El resultado no puede superar 99.');

  if (input.mvpPlayerId) {
    const { playerService } = await import('./playerService');
    const mvp = await playerService.getPlayerById(input.mvpPlayerId);
    if (!mvp || (mvp.teamId !== match.homeTeamId && mvp.teamId !== match.awayTeamId)) {
      throw new Error('El MVP debe pertenecer a uno de los equipos del partido.');
    }
  }

  const wasFinished = match.status === 'finished';
  const { data, error } = await supabase
    .from('matches')
    .update({
      home_score: input.homeScore,
      away_score: input.awayScore,
      status: 'finished',
      mvp_player_id: input.mvpPlayerId ?? match.mvpPlayerId,
      went_to_overtime: input.wentToOvertime,
    })
    .eq('id', input.matchId)
    .select()
    .single();

  if (error) throw error;

  const updatedMatch = mapMatch(data);

  if (!wasFinished) {
    await auditService.log(
      match.leagueId,
      actorId,
      'match_registered',
      `Resultado registrado: ${input.homeScore}-${input.awayScore}.`,
    );

    if (league.seasonId) {
      const season = await seasonService.getActiveSeason(league.id);
      if (season && season.phase === 'regular') {
        const leagueTeams = await teamService.getTeamsByLeague(league.id);
        const allLeagueMatches = await getMatchesByLeague(league.id);
        const regularSeasonComplete = isRegularSeasonComplete(
          leagueTeams.map((team) => team.id),
          allLeagueMatches,
        );

        if (regularSeasonComplete) {
          if (league.format === 'league-playoff') {
            await seasonService.setPhase(season.id, 'playoff');
            await playoffService.generateTop8Playoff(league.id, season.id, actorId);
            await auditService.log(league.id, actorId, 'regular_season_finished', 'La fase regular terminó y se generó la liguilla Top 8.');
          } else if (league.format === 'league-knockout') {
            await seasonService.setPhase(season.id, 'knockout');
            await auditService.log(league.id, actorId, 'regular_season_finished', 'La fase regular terminó. La liga pasó a fase de eliminación.');
          } else if (league.format === 'league') {
            await seasonService.finish(season.id);
            await auditService.log(league.id, actorId, 'season_finished', 'La fase regular terminó y la temporada fue finalizada.');
          }
        }
      }
    }
  }

  if (!wasFinished && updatedMatch.phase === 'playoff' && updatedMatch.seasonId) {
    await playoffService.advancePlayoffRound(league.id, updatedMatch.seasonId, actorId);
  }

  return updatedMatch;
}

async function deleteMatch(id: string, actorId: string): Promise<void> {
  const match = await getMatchById(id);
  if (!match) return;

  const league = await leagueService.getLeagueById(match.leagueId);
  if (league?.status === 'paused') throw new Error('La liga está suspendida.');

  const membership = await memberService.getMemberByUser(match.leagueId, actorId);
  if (!membership || membership.status !== 'active' || (membership.role !== 'owner' && membership.role !== 'admin')) {
    throw new Error('Solo el propietario o administrador puede eliminar partidos.');
  }

  const { error } = await supabase.from('matches').delete().eq('id', id);
  if (error) throw error;

  await auditService.log(match.leagueId, actorId, 'match_deleted', `Partido J${match.round} eliminado.`);
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
