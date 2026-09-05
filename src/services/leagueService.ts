import {
  GroupStageConfig,
  League,
  LeagueFormat,
  PlayoffFormatConfig,
  Sport,
} from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { memberService } from './memberService';
import { seasonService } from './seasonService';
import { auditService } from './auditService';

function mapLeague(row: any): League {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    sport: row.sport as Sport,
    color: row.color,
    logoUrl: row.logo_url ?? null,
    isPublic: row.is_public,
    inviteCode: row.invite_code,
    format: row.format as LeagueFormat,
    playoffFormat: row.playoff_format ?? {
      quarterfinal: 'single-match',
      semifinal: 'single-match',
      final: 'single-match',
    },
    groupStageConfig: row.group_stage_config ?? null,
    status: row.status,
    ownerId: row.owner_id,
    seasonId: row.season_id ?? null,
    createdAt: row.created_at,
  };
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function getLeagues(): Promise<League[]> {
  const { data, error } = await supabase.from('leagues').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapLeague);
}

async function getLeagueById(id: string): Promise<League | null> {
  const { data, error } = await supabase.from('leagues').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapLeague(data) : null;
}

async function getLeagueByInviteCode(code: string): Promise<League | null> {
  const { data, error } = await supabase.from('leagues').select('*').eq('invite_code', code.trim().toUpperCase()).maybeSingle();
  if (error) throw error;
  return data ? mapLeague(data) : null;
}

interface CreateLeagueInput {
  name: string;
  description: string;
  sport: Sport;
  color: string;
  logoUrl: string | null;
  isPublic: boolean;
  inviteCode: string | null;
  format: LeagueFormat;
  playoffFormat: PlayoffFormatConfig;
  groupStageConfig?: GroupStageConfig | null;
  ownerId: string;
}

async function createLeague(input: CreateLeagueInput): Promise<League> {
  const id = `league-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const inviteCode = input.inviteCode?.trim().toUpperCase() || generateInviteCode();
  const playoffFormat = input.playoffFormat ?? {
    quarterfinal: 'single-match' as const,
    semifinal: 'single-match' as const,
    final: 'single-match' as const,
  };
  const groupStageConfig = input.format === 'group-knockout'
    ? input.groupStageConfig ?? {
        groupCount: 4,
        teamsPerGroup: null,
        qualifiersPerGroup: 2,
        knockoutTeams: 8,
        playoffFormat: 'single-match' as const,
      }
    : null;

  const { data, error } = await supabase.from('leagues').insert({
    id,
    name: input.name.trim(),
    description: input.description.trim(),
    sport: 'Fútbol',
    color: input.color,
    logo_url: input.logoUrl,
    is_public: input.isPublic,
    invite_code: inviteCode,
    format: input.format,
    playoff_format: playoffFormat,
    group_stage_config: groupStageConfig,
    status: 'active',
    owner_id: input.ownerId,
  }).select().single();

  if (error) throw error;
  await memberService.createMember(id, input.ownerId, 'owner', null);

  const season = await seasonService.create(id, 'Temporada 1');
  await seasonService.activate(season.id);

  const { data: updatedRow, error: updateError } = await supabase.from('leagues')
    .update({ season_id: season.id }).eq('id', id).select().single();
  if (updateError) throw updateError;

  await auditService.log(id, input.ownerId, 'league_created', `Liga "${input.name.trim()}" creada.`);
  return mapLeague(updatedRow ?? data);
}

async function updateLeague(id: string, updates: Partial<League>): Promise<League> {
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.description !== undefined) payload.description = updates.description.trim();
  if (updates.color !== undefined) payload.color = updates.color;
  if (updates.logoUrl !== undefined) payload.logo_url = updates.logoUrl;
  if (updates.isPublic !== undefined) payload.is_public = updates.isPublic;
  if (updates.inviteCode !== undefined) payload.invite_code = updates.inviteCode.trim().toUpperCase();
  if (updates.format !== undefined) payload.format = updates.format;
  if (updates.playoffFormat !== undefined) payload.playoff_format = updates.playoffFormat;
  if (updates.groupStageConfig !== undefined) payload.group_stage_config = updates.groupStageConfig;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.seasonId !== undefined) payload.season_id = updates.seasonId;

  const { data, error } = await supabase.from('leagues').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return mapLeague(data);
}

async function togglePause(id: string, actorId: string): Promise<League> {
  const league = await getLeagueById(id);
  if (!league) throw new Error('Liga no encontrada.');
  const newStatus = league.status === 'active' ? 'paused' : 'active';
  const updated = await updateLeague(id, { status: newStatus });
  await auditService.log(id, actorId, newStatus === 'paused' ? 'league_paused' : 'league_resumed', `Liga ${newStatus === 'paused' ? 'pausada' : 'reanudada'}.`);
  return updated;
}

async function deleteLeague(id: string, actorId: string): Promise<void> {
  const league = await getLeagueById(id);
  if (!league) throw new Error('Liga no encontrada.');
  if (league.ownerId !== actorId) throw new Error('Solo el propietario puede eliminar esta liga.');
  const { error } = await supabase.from('leagues').delete().eq('id', id);
  if (error) throw error;
  await auditService.log(id, actorId, 'league_deleted', `Liga "${league.name}" eliminada.`);
}

async function getLeaguesByUser(userId: string): Promise<League[]> {
  const memberships = await memberService.getMembershipsByUser(userId);
  if (memberships.length === 0) return [];
  const leagueIds = memberships.map((membership) => membership.leagueId);
  const { data, error } = await supabase.from('leagues').select('*').in('id', leagueIds).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapLeague);
}

export const leagueService = {
  getLeagues,
  getLeagueById,
  getLeagueByInviteCode,
  createLeague,
  updateLeague,
  togglePause,
  deleteLeague,
  getLeaguesByUser,
  generateInviteCode,
};
