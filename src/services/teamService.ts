import { Team } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { leagueService } from './leagueService';
import { memberService } from './memberService';

function mapTeam(row: any): Team {
  return {
    id: row.id,
    leagueId: row.league_id,
    name: row.name,
    shortName: row.short_name,
    city: row.city,
    color: row.color,
    logoUrl: row.logo_url,
    description: row.description ?? '',
    captainId: row.captain_id,
    createdAt: row.created_at,
    bannerUrl: row.banner_url,
  };
}

async function getTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapTeam);
}

async function getTeamsByLeague(leagueId: string): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('league_id', leagueId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapTeam);
}

async function getTeamById(id: string): Promise<Team | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapTeam(data) : null;
}

async function canManageTeam(teamId: string, actorId: string): Promise<boolean> {
  const team = await getTeamById(teamId);
  if (!team) return false;

  const membership = await memberService.getMemberByUser(team.leagueId, actorId);
  if (!membership || membership.status !== 'active') return false;

  return (
    membership.role === 'owner' ||
    membership.role === 'admin' ||
    (membership.role === 'captain' && membership.teamId === team.id)
  );
}

interface CreateTeamInput {
  leagueId: string;
  name: string;
  shortName: string;
  city: string;
  color: string;
  logoUrl: string | null;
  description: string;
  bannerUrl?: string | null;
}

async function createTeam(input: CreateTeamInput, actorId: string): Promise<Team> {
  const league = await leagueService.getLeagueById(input.leagueId);
  if (!league) throw new Error('Liga no encontrada.');
  if (league.status === 'paused') {
    throw new Error('La liga está suspendida.');
  }

  const membership = await memberService.getMemberByUser(input.leagueId, actorId);
  if (
    !membership ||
    membership.status !== 'active' ||
    (membership.role !== 'owner' && membership.role !== 'admin')
  ) {
    throw new Error('Solo el propietario o administrador puede crear equipos.');
  }

  const id = `team-${Date.now()}`;
  const { data, error } = await supabase
    .from('teams')
    .insert({
      id,
      league_id: input.leagueId,
      name: input.name.trim(),
      short_name: input.shortName.trim().slice(0, 4).toUpperCase(),
      city: input.city.trim(),
      color: input.color,
      logo_url: input.logoUrl,
      description: input.description.trim(),
      captain_id: null,
      banner_url: input.bannerUrl ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return mapTeam(data);
}

async function updateTeam(id: string, updates: Partial<Team>, actorId: string): Promise<Team> {
  const team = await getTeamById(id);
  if (!team) throw new Error('Equipo no encontrado.');

  const league = await leagueService.getLeagueById(team.leagueId);
  if (league?.status === 'paused') throw new Error('La liga está suspendida.');

  const allowed = await canManageTeam(id, actorId);
  if (!allowed) throw new Error('No tienes permisos para modificar este equipo.');

  const membership = await memberService.getMemberByUser(team.leagueId, actorId);
  const isCaptainOnly =
    team.captainId === actorId &&
    membership?.role !== 'owner' &&
    membership?.role !== 'admin';

  const dbUpdates = isCaptainOnly
    ? { description: updates.description }
    : {
        name: updates.name,
        short_name: updates.shortName?.slice(0, 4).toUpperCase(),
        city: updates.city,
        color: updates.color,
        logo_url: updates.logoUrl,
        description: updates.description,
        banner_url: updates.bannerUrl,
      };

  const { data, error } = await supabase
    .from('teams')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapTeam(data);
}

async function deleteTeam(id: string, actorId: string): Promise<void> {
  const team = await getTeamById(id);
  if (!team) return;

  const league = await leagueService.getLeagueById(team.leagueId);
  if (league?.status === 'paused') throw new Error('La liga está suspendida.');

  const membership = await memberService.getMemberByUser(team.leagueId, actorId);
  if (
    !membership ||
    membership.status !== 'active' ||
    (membership.role !== 'owner' && membership.role !== 'admin')
  ) {
    throw new Error('Solo el propietario o administrador puede eliminar equipos.');
  }

  const { error } = await supabase.from('teams').delete().eq('id', id);
  if (error) throw error;
}

async function setCaptain(teamId: string, captainId: string | null, actorId: string): Promise<Team> {
  const team = await getTeamById(teamId);
  if (!team) throw new Error('Equipo no encontrado.');

  const league = await leagueService.getLeagueById(team.leagueId);
  if (league?.status === 'paused') throw new Error('La liga está suspendida.');

  const membership = await memberService.getMemberByUser(team.leagueId, actorId);
  if (
    !membership ||
    membership.status !== 'active' ||
    (membership.role !== 'owner' && membership.role !== 'admin')
  ) {
    throw new Error('Solo el propietario o administrador puede asignar capitanes.');
  }

  if (captainId) {
    const captainMembership = await memberService.getMemberByUser(team.leagueId, captainId);
    if (!captainMembership || captainMembership.status !== 'active') {
      throw new Error('El capitán debe ser miembro activo de la liga.');
    }
    if (captainMembership.teamId !== team.id) {
      throw new Error('El capitán debe pertenecer a este equipo.');
    }
    await memberService.updateMemberRole(team.leagueId, captainId, 'captain');
  }

  const { data, error } = await supabase
    .from('teams')
    .update({ captain_id: captainId })
    .eq('id', teamId)
    .select()
    .single();

  if (error) throw error;
  return mapTeam(data);
}

export const teamService = {
  getTeams,
  getTeamsByLeague,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  setCaptain,
  canManageTeam,
};
