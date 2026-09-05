import { GroupStageConfig, Match, Standing } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { teamService } from './teamService';
import { memberService } from './memberService';
import { seasonService } from './seasonService';
import { playoffSeriesService } from './playoffSeriesService';
import { auditService } from './auditService';
import { calculateStandings } from '@/utils/standings';

export interface GroupStage {
  id: string;
  seasonId: string;
  name: string;
  position: number;
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function assertAdmin(leagueId: string, actorId: string) {
  const member = await memberService.getMemberByUser(leagueId, actorId);
  if (!member || member.status !== 'active' || (member.role !== 'owner' && member.role !== 'admin')) {
    throw new Error('Solo el propietario o administrador puede gestionar la fase de grupos.');
  }
}

export async function createGroups(
  leagueId: string,
  seasonId: string,
  actorId: string,
  config: GroupStageConfig,
): Promise<GroupStage[]> {
  await assertAdmin(leagueId, actorId);
  if (!Number.isInteger(config.groupCount) || config.groupCount < 2) throw new Error('Debe haber al menos 2 grupos.');
  if (!Number.isInteger(config.qualifiersPerGroup) || config.qualifiersPerGroup < 1) throw new Error('Cada grupo debe tener al menos un clasificado.');

  const teams = await teamService.getTeamsByLeague(leagueId);
  if (teams.length < config.groupCount) throw new Error('No hay suficientes equipos para crear los grupos.');

  const { data: existing } = await supabase.from('season_groups').select('*').eq('season_id', seasonId).order('position');
  if ((existing ?? []).length) return existing as GroupStage[];

  const groups = Array.from({ length: config.groupCount }, (_, index) => ({
    id: createId('group'),
    season_id: seasonId,
    name: `Grupo ${String.fromCharCode(65 + index)}`,
    position: index + 1,
  }));

  const { data, error } = await supabase.from('season_groups').insert(groups).select();
  if (error) throw error;

  const assignments = teams.map((team, index) => ({
    id: createId('group-team'),
    group_id: groups[index % groups.length].id,
    team_id: team.id,
  }));
  const { error: assignmentError } = await supabase.from('season_group_teams').insert(assignments);
  if (assignmentError) throw assignmentError;

  await auditService.log(leagueId, actorId, 'group_stage_created', `${groups.length} grupos creados para la fase de grupos.`);
  return (data ?? groups) as GroupStage[];
}

export async function generateGroupMatches(
  leagueId: string,
  seasonId: string,
  actorId: string,
): Promise<Match[]> {
  await assertAdmin(leagueId, actorId);
  const { data: groups, error: groupError } = await supabase.from('season_groups').select('*').eq('season_id', seasonId).order('position');
  if (groupError) throw groupError;
  if (!groups?.length) throw new Error('Primero debes crear los grupos.');

  const { data: assignments, error: assignmentError } = await supabase.from('season_group_teams').select('*').in('group_id', groups.map((group) => group.id));
  if (assignmentError) throw assignmentError;

  const { data: existing, error: existingError } = await supabase.from('matches').select('*').eq('season_id', seasonId).eq('phase', 'group');
  if (existingError) throw existingError;
  if (existing?.length) return existing as Match[];

  const rows: Record<string, unknown>[] = [];
  for (const group of groups) {
    const teamIds = (assignments ?? []).filter((item) => item.group_id === group.id).map((item) => item.team_id);
    for (let i = 0; i < teamIds.length; i += 1) {
      for (let j = i + 1; j < teamIds.length; j += 1) {
        rows.push({
          id: createId('group-match'), league_id: leagueId, season_id: seasonId,
          round: 1, date: new Date(Date.now() + rows.length * 3600000).toISOString(), venue: '',
          home_team_id: teamIds[i], away_team_id: teamIds[j], home_score: null, away_score: null,
          status: 'scheduled', mvp_player_id: null, went_to_overtime: false,
          phase: 'group', playoff_round: null, playoff_series_id: group.id, playoff_leg: null,
          playoff_seed_home: null, playoff_seed_away: null,
        });
      }
    }
  }

  if (!rows.length) throw new Error('No se pudieron generar partidos de grupos.');
  const { data, error } = await supabase.from('matches').insert(rows).select();
  if (error) throw error;
  await auditService.log(leagueId, actorId, 'group_matches_generated', `${rows.length} partidos de fase de grupos generados.`);
  return (data ?? []) as Match[];
}

export async function getGroupStandings(groupId: string): Promise<Standing[]> {
  const { data: assignments, error } = await supabase.from('season_group_teams').select('team_id').eq('group_id', groupId);
  if (error) throw error;
  const teamIds = (assignments ?? []).map((item) => item.team_id);
  if (!teamIds.length) return [];

  const { data: group } = await supabase.from('season_groups').select('season_id').eq('id', groupId).maybeSingle();
  if (!group) return [];
  const { data: matches, error: matchError } = await supabase.from('matches').select('*').eq('season_id', group.season_id).eq('phase', 'group').eq('playoff_series_id', groupId);
  if (matchError) throw matchError;
  return calculateStandings(teamIds, (matches ?? []).filter((match) => match.status === 'finished').map((match) => ({
    id: match.id, leagueId: match.league_id, seasonId: match.season_id, round: match.round, date: match.date, venue: match.venue ?? '',
    homeTeamId: match.home_team_id, awayTeamId: match.away_team_id, homeScore: match.home_score, awayScore: match.away_score,
    status: match.status, mvpPlayerId: match.mvp_player_id, wentToOvertime: match.went_to_overtime, phase: match.phase,
    playoffRound: match.playoff_round, playoffSeriesId: match.playoff_series_id, playoffLeg: match.playoff_leg,
    playoffSeedHome: match.playoff_seed_home, playoffSeedAway: match.playoff_seed_away,
  })));
}

export async function groupStageComplete(seasonId: string): Promise<boolean> {
  const { data: groups, error } = await supabase.from('season_groups').select('id').eq('season_id', seasonId);
  if (error) throw error;
  if (!groups?.length) return false;
  for (const group of groups) {
    const { data: matches, error: matchError } = await supabase.from('matches').select('id,status').eq('season_id', seasonId).eq('phase', 'group').eq('playoff_series_id', group.id);
    if (matchError) throw matchError;
    if (!matches?.length || matches.some((match) => match.status !== 'finished')) return false;
  }
  return true;
}

export async function getQualifiedTeams(seasonId: string, qualifiersPerGroup: number): Promise<string[]> {
  const { data: groups, error } = await supabase.from('season_groups').select('id').eq('season_id', seasonId).order('position');
  if (error) throw error;
  const qualified: string[] = [];
  for (const group of groups ?? []) {
    const standings = await getGroupStandings(group.id);
    qualified.push(...standings.slice(0, qualifiersPerGroup).map((standing) => standing.teamId));
  }
  return qualified;
}

export const groupStageService = {
  createGroups,
  generateGroupMatches,
  getGroupStandings,
  groupStageComplete,
  getQualifiedTeams,
};
