import { LeagueJoinRequest, TeamJoinRequest, RequestStatus } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { leagueService } from './leagueService';
import { teamService } from './teamService';

function mapLeagueRequest(row: any): LeagueJoinRequest {
  return {
    id: row.id,
    leagueId: row.league_id,
    userId: row.user_id,
    status: row.status as RequestStatus,
    message: row.message ?? '',
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

function mapTeamRequest(row: any): TeamJoinRequest {
  return {
    id: row.id,
    teamId: row.team_id,
    leagueId: row.league_id,
    userId: row.user_id,
    status: row.status as RequestStatus,
    message: row.message ?? '',
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

async function createLeagueRequest(
  leagueId: string,
  userId: string,
  message: string,
): Promise<LeagueJoinRequest> {
  const league = await leagueService.getLeagueById(leagueId);

  if (!league) throw new Error('Liga no encontrada.');
  if (league.status === 'paused') {
    throw new Error('La liga está suspendida. No se pueden enviar solicitudes mientras esté pausada.');
  }

  const { data: existing, error: existingError } = await supabase
    .from('league_join_requests')
    .select('id')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing) throw new Error('Ya tienes una solicitud pendiente para esta liga.');

  const { data, error } = await supabase
    .from('league_join_requests')
    .insert({
      id: `lr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      league_id: leagueId,
      user_id: userId,
      status: 'pending',
      message,
      resolved_at: null,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'No se pudo crear la solicitud.');
  return mapLeagueRequest(data);
}

async function getLeagueRequestsByLeague(leagueId: string): Promise<LeagueJoinRequest[]> {
  const { data, error } = await supabase
    .from('league_join_requests')
    .select('*')
    .eq('league_id', leagueId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapLeagueRequest);
}

async function getLeagueRequestsByUser(userId: string): Promise<LeagueJoinRequest[]> {
  const { data, error } = await supabase
    .from('league_join_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapLeagueRequest);
}

async function resolveLeagueRequest(
  requestId: string,
  status: RequestStatus,
): Promise<LeagueJoinRequest | null> {
  const { data, error } = await supabase
    .from('league_join_requests')
    .update({ status, resolved_at: new Date().toISOString() })
    .eq('id', requestId)
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapLeagueRequest(data) : null;
}

async function cancelLeagueRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('league_join_requests')
    .delete()
    .eq('id', requestId);

  if (error) throw new Error(error.message);
}

async function createTeamRequest(
  teamId: string,
  leagueId: string,
  userId: string,
  message: string,
): Promise<TeamJoinRequest> {
  const league = await leagueService.getLeagueById(leagueId);
  if (!league) throw new Error('Liga no encontrada.');
  if (league.status === 'paused') {
    throw new Error('La liga está suspendida. No se pueden enviar solicitudes mientras esté pausada.');
  }

  const team = await teamService.getTeamById(teamId);
  if (!team) throw new Error('Equipo no encontrado.');
  if (team.leagueId !== leagueId) throw new Error('El equipo no pertenece a esta liga.');

  const { data: existing, error: existingError } = await supabase
    .from('team_join_requests')
    .select('id')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing) throw new Error('Ya tienes una solicitud pendiente para este equipo.');

  const { data, error } = await supabase
    .from('team_join_requests')
    .insert({
      id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      team_id: teamId,
      league_id: leagueId,
      user_id: userId,
      status: 'pending',
      message,
      resolved_at: null,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'No se pudo crear la solicitud.');
  return mapTeamRequest(data);
}

async function getTeamRequestsByTeam(teamId: string): Promise<TeamJoinRequest[]> {
  const { data, error } = await supabase
    .from('team_join_requests')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTeamRequest);
}

async function getTeamRequestsByUser(userId: string): Promise<TeamJoinRequest[]> {
  const { data, error } = await supabase
    .from('team_join_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTeamRequest);
}

async function resolveTeamRequest(
  requestId: string,
  status: RequestStatus,
): Promise<TeamJoinRequest | null> {
  const { data, error } = await supabase
    .from('team_join_requests')
    .update({ status, resolved_at: new Date().toISOString() })
    .eq('id', requestId)
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapTeamRequest(data) : null;
}

async function cancelTeamRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('team_join_requests')
    .delete()
    .eq('id', requestId);

  if (error) throw new Error(error.message);
}

export const joinRequestService = {
  createLeagueRequest,
  getLeagueRequestsByLeague,
  getLeagueRequestsByUser,
  resolveLeagueRequest,
  cancelLeagueRequest,
  createTeamRequest,
  getTeamRequestsByTeam,
  getTeamRequestsByUser,
  resolveTeamRequest,
  cancelTeamRequest,
};
