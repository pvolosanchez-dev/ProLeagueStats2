import { GroupStageConfig, Match, Standing } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { teamService } from './teamService';
import { memberService } from './memberService';
import { seasonService } from './seasonService';
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
  if (!Number.isInteger(config.groupCount) || config.groupCount < 2 || config.groupCount > 8) {
    throw new Error('El número de grupos debe estar entre 2 y 8.');
  }
  if (!Number.isInteger(config.qualifiersPerGroup) || config.qualifiersPerGroup < 1) {
    throw new Error('Cada grupo debe tener al menos un clasificado.');
  }
  if (config.groupCount * config.qualifiersPerGroup !== config.knockoutTeams) {
    throw new Error('La cantidad de clasificados debe coincidir con los cupos de eliminación.');
  }
  if (![4, 8, 16].includes(config.knockoutTeams)) {
    throw new Error('La fase de eliminación debe tener 4, 8 o 16 equipos.');
  }

  const teams = await teamService.getTeamsByLeague(leagueId);
  if (teams.length < config.groupCount * config.qualifiersPerGroup) {
    throw new Error(`Se necesitan al menos ${config.groupCount * config.qualifiersPerGroup} equipos para este formato.`);
  }

  const { data: existing, error } = await supabase
    .from('season_groups')
    .select('*')
    .eq('season_id', seasonId)
    .order('position');
  if (error) throw error;
  if ((existing ?? []).length) return existing as GroupStage[];

  const groups = Array.from({ length: config.groupCount }, (_, index) => ({
    id: createId('group'),
    season_id: seasonId,
    name: `Grupo ${String.fromCharCode(65 + index)}`,
    position: index + 1,
  }));

  const { data, error: insertError } = await supabase.from('season_groups').insert(groups).select();
  if (insertError) throw insertError;

  await auditService.log(leagueId, actorId, 'group_stage_created', `${groups.length} grupos creados para la fase de grupos.`);
  return (data ?? groups) as GroupStage[];
}

export async function assignTeams(
  leagueId: string,
  seasonId: string,
  actorId: string,
  assignments: Record<string, string[]>,
): Promise<void> {
  await assertAdmin(leagueId, actorId);

  const { data: groups, error: groupError } = await supabase
    .from('season_groups')
    .select('*')
    .eq('season_id', seasonId)
    .order('position');
  if (groupError) throw groupError;
  if (!groups?.length) throw new Error('Primero debes crear los grupos.');

  const leagueTeams = await teamService.getTeamsByLeague(leagueId);
  const validTeamIds = new Set(leagueTeams.map((team) => team.id));
  const used = new Set<string>();

  for (const group of groups) {
    const teamIds = assignments[group.id] ?? [];
    if (teamIds.length < 1) throw new Error(`${group.name} no tiene equipos asignados.`);
    for (const teamId of teamIds) {
      if (!validTeamIds.has(teamId)) throw new Error('Uno de los equipos no pertenece a esta liga.');
      if (used.has(teamId)) throw new Error('Un equipo no puede pertenecer a más de un grupo.');
      used.add(teamId);
    }
  }

  await supabase.from('season_group_teams').delete().in('group_id', groups.map((group) => group.id));

  const rows = groups.flatMap((group) =>
    (assignments[group.id] ?? []).map((teamId) => ({
      id: createId('group-team'),
      group_id: group.id,
      team_id: teamId,
    })),
  );

  const { error } = await supabase.from('season_group_teams').insert(rows);
  if (error) throw error;

  await auditService.log(leagueId, actorId, 'group_teams_assigned', `${used.size} equipos distribuidos entre los grupos.`);
}

export async function getGroups(seasonId: string): Promise<GroupStage[]> {
  const { data, error } = await supabase
    .from('season_groups')
    .select('*')
    .eq('season_id', seasonId)
    .order('position');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    seasonId: row.season_id,
    name: row.name,
    position: row.position,
  }));
}

export async function getGroupTeamIds(groupId: string): Promise<string[]> {
  const { data, error } = await supabase.from('season_group_teams').select('team_id').eq('group_id', groupId);
  if (error) throw error;
  return (data ?? []).map((row) => row.team_id);
}

export async function generateGroupMatches(
  leagueId: string,
  seasonId: string,
  actorId: string,
): Promise<Match[]> {
  await assertAdmin(leagueId, actorId);
  const groups = await getGroups(seasonId);
  if (!groups.length) throw new Error('Primero debes crear los grupos.');

  const allAssignments = await Promise.all(groups.map(async (group) => ({
    group,
    teamIds: await getGroupTeamIds(group.id),
  })));

  if (allAssignments.some(({ teamIds }) => teamIds.length < 2)) {
    throw new Error('Cada grupo debe tener al menos 2 equipos.');
  }

  const { data: existing, error: existingError } = await supabase
    .from('matches')
    .select('*')
    .eq('season_id', seasonId)
    .eq('phase', 'group');
  if (existingError) throw existingError;
  if (existing?.length) return existing as Match[];

  const rows: Record<string, unknown>[] = [];
  for (const { group, teamIds } of allAssignments) {
    for (let i = 0; i < teamIds.length; i += 1) {
      for (let j = i + 1; j < teamIds.length; j += 1) {
        rows.push({
          id: createId('group-match'),
          league_id: leagueId,
          season_id: seasonId,
          round: Math.floor(rows.length / 10) + 1,
          date: new Date(Date.now() + rows.length * 3600000).toISOString(),
          venue: '',
          home_team_id: teamIds[i],
          away_team_id: teamIds[j],
          home_score: null,
          away_score: null,
          status: 'scheduled',
          mvp_player_id: null,
          went_to_overtime: false,
          phase: 'group',
          playoff_round: null,
          playoff_series_id: group.id,
          playoff_leg: null,
          playoff_seed_home: null,
          playoff_seed_away: null,
        });
      }
    }
  }

  const { data, error } = await supabase.from('matches').insert(rows).select();
  if (error) throw error;
  await auditService.log(leagueId, actorId, 'group_matches_generated', `${rows.length} partidos de fase de grupos generados.`);
  return (data ?? []) as Match[];
}

export async function getGroupStandings(groupId: string): Promise<Standing[]> {
  const teamIds = await getGroupTeamIds(groupId);
  if (!teamIds.length) return [];

  const { data: group, error: groupError } = await supabase.from('season_groups').select('season_id').eq('id', groupId).maybeSingle();
  if (groupError) throw groupError;
  if (!group) return [];

  const { data: matches, error: matchError } = await supabase
    .from('matches')
    .select('*')
    .eq('season_id', group.season_id)
    .eq('phase', 'group')
    .eq('playoff_series_id', groupId);
  if (matchError) throw matchError;

  return calculateStandings(teamIds, (matches ?? []).filter((match) => match.status === 'finished').map((match) => ({
    id: match.id,
    leagueId: match.league_id,
    seasonId: match.season_id,
    round: match.round,
    date: match.date,
    venue: match.venue ?? '',
    homeTeamId: match.home_team_id,
    awayTeamId: match.away_team_id,
    homeScore: match.home_score,
    awayScore: match.away_score,
    status: match.status,
    mvpPlayerId: match.mvp_player_id,
    wentToOvertime: match.went_to_overtime,
    phase: match.phase,
    playoffRound: match.playoff_round,
    playoffSeriesId: match.playoff_series_id,
    playoffLeg: match.playoff_leg,
    playoffSeedHome: match.playoff_seed_home,
    playoffSeedAway: match.playoff_seed_away,
  })));
}

export async function groupStageComplete(seasonId: string): Promise<boolean> {
  const groups = await getGroups(seasonId);
  if (!groups.length) return false;

  for (const group of groups) {
    const teamIds = await getGroupTeamIds(group.id);
    if (teamIds.length < 2) return false;
    const expected = (teamIds.length * (teamIds.length - 1)) / 2;
    const { data: matches, error } = await supabase
      .from('matches')
      .select('home_team_id,away_team_id,status')
      .eq('season_id', seasonId)
      .eq('phase', 'group')
      .eq('playoff_series_id', group.id);
    if (error) throw error;

    const completed = new Set<string>();
    for (const match of matches ?? []) {
      if (match.status === 'finished') {
        completed.add([match.home_team_id, match.away_team_id].sort().join('::'));
      }
    }
    if (completed.size < expected) return false;
  }
  return true;
}

export async function getQualifiedTeams(seasonId: string, qualifiersPerGroup: number): Promise<string[]> {
  const groups = await getGroups(seasonId);
  const qualified: string[] = [];
  for (const group of groups) {
    const standings = await getGroupStandings(group.id);
    if (standings.length < qualifiersPerGroup) throw new Error(`${group.name} no tiene suficientes equipos clasificados.`);
    qualified.push(...standings.slice(0, qualifiersPerGroup).map((standing) => standing.teamId));
  }
  return qualified;
}

function createPlayoffMatch(
  leagueId: string,
  seasonId: string,
  round: 'quarterfinal' | 'semifinal' | 'final',
  homeTeamId: string,
  awayTeamId: string,
  seriesId: string,
  seedHome: number | null,
  seedAway: number | null,
  offset: number,
): Record<string, unknown> {
  return {
    id: createId('knockout'),
    league_id: leagueId,
    season_id: seasonId,
    round: 0,
    date: new Date(Date.now() + offset * 3600000).toISOString(),
    venue: '',
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    home_score: null,
    away_score: null,
    status: 'scheduled',
    mvp_player_id: null,
    went_to_overtime: false,
    phase: 'playoff',
    playoff_round: round,
    playoff_series_id: seriesId,
    playoff_leg: 1,
    playoff_seed_home: seedHome,
    playoff_seed_away: seedAway,
  };
}

export async function generateKnockout(
  leagueId: string,
  seasonId: string,
  actorId: string,
): Promise<Match[]> {
  await assertAdmin(leagueId, actorId);

  const season = await seasonService.getActiveSeason(leagueId);
  if (!season || season.id !== seasonId) throw new Error('No existe una temporada activa válida.');
  if (!(await groupStageComplete(seasonId))) throw new Error('Todavía quedan partidos de la fase de grupos.');

  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('format,group_stage_config,playoff_format')
    .eq('id', leagueId)
    .single();
  if (leagueError) throw leagueError;

  const config = league.group_stage_config as GroupStageConfig | null;
  if (!config) throw new Error('La liga no tiene configuración de fase de grupos.');

  const { data: existing, error: existingError } = await supabase
    .from('matches')
    .select('*')
    .eq('season_id', seasonId)
    .eq('phase', 'playoff');
  if (existingError) throw existingError;
  if (existing?.length) return existing as Match[];

  const qualified = await getQualifiedTeams(seasonId, config.qualifiersPerGroup);
  if (![4, 8, 16].includes(qualified.length)) throw new Error('La cantidad de clasificados no permite construir una eliminación válida.');

  const pairings: Array<[number, number]> = [];
  for (let i = 0; i < qualified.length / 2; i += 1) {
    pairings.push([i, qualified.length - 1 - i]);
  }

  const rows = pairings.map(([a, b], index) => createPlayoffMatch(
    leagueId,
    seasonId,
    qualified.length === 4 ? 'semifinal' : 'quarterfinal',
    qualified[a],
    qualified[b],
    createId('series'),
    a + 1,
    b + 1,
    index,
  ));

  const { data, error } = await supabase.from('matches').insert(rows).select();
  if (error) throw error;

  await seasonService.setPhase(seasonId, 'playoff');
  await auditService.log(leagueId, actorId, 'knockout_generated', `Eliminación generada automáticamente con ${qualified.length} equipos clasificados.`);
  return (data ?? []) as Match[];
}

export async function advanceKnockoutIfReady(leagueId: string, seasonId: string, actorId: string): Promise<void> {
  await assertAdmin(leagueId, actorId);
  const { data: matches, error } = await supabase.from('matches').select('*').eq('season_id', seasonId).eq('phase', 'playoff');
  if (error) throw error;
  if (!matches?.length) return;

  const currentRound = ['final', 'semifinal', 'quarterfinal'].find((round) =>
    matches.some((match) => match.playoff_round === round),
  );
  if (!currentRound) return;

  const current = matches.filter((match) => match.playoff_round === currentRound);
  if (current.some((match) => match.status !== 'finished' || match.home_score === null || match.away_score === null)) return;

  const winners = current.map((match) => {
    if (match.home_score === match.away_score) {
      if (!match.went_to_overtime) throw new Error('Un partido empatado necesita marcarse como tiempo extra para determinar el ganador.');
    }
    return match.home_score > match.away_score ? match.home_team_id : match.away_team_id;
  });

  if (currentRound === 'final') {
    await seasonService.finish(seasonId);
    await auditService.log(leagueId, actorId, 'season_finished', 'La final terminó. La temporada ha finalizado oficialmente.');
    return;
  }

  const nextRound = currentRound === 'quarterfinal' ? 'semifinal' : 'final';
  const expected = nextRound === 'semifinal' ? 2 : 1;
  if (winners.length !== expected * 2) return;

  const { data: existingNext } = await supabase.from('matches').select('id').eq('season_id', seasonId).eq('phase', 'playoff').eq('playoff_round', nextRound);
  if ((existingNext ?? []).length) return;

  const rows = [];
  for (let i = 0; i < winners.length; i += 2) {
    rows.push(createPlayoffMatch(
      leagueId,
      seasonId,
      nextRound,
      winners[i],
      winners[i + 1],
      createId('series'),
      null,
      null,
      i,
    ));
  }

  const { error: insertError } = await supabase.from('matches').insert(rows);
  if (insertError) throw insertError;
  await auditService.log(leagueId, actorId, `${nextRound}_generated`, `${nextRound === 'semifinal' ? 'Semifinales' : 'Final'} generadas automáticamente.`);
}

export const groupStageService = {
  createGroups,
  assignTeams,
  getGroups,
  getGroupTeamIds,
  generateGroupMatches,
  getGroupStandings,
  groupStageComplete,
  getQualifiedTeams,
  generateKnockout,
  advanceKnockoutIfReady,
};