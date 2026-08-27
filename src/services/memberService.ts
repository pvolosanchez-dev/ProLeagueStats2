import { LeagueMember, Role } from '@/types';
import { supabase } from '@/lib/supabaseClient';

function mapMember(row: any): LeagueMember {
  return {
    id: row.id,
    leagueId: row.league_id,
    userId: row.user_id,
    role: row.role,
    teamId: row.team_id ?? null,
    status: row.status,
    joinedAt: row.joined_at,
  };
}

async function getMembersByLeague(leagueId: string): Promise<LeagueMember[]> {
  const { data, error } = await supabase
    .from('league_members')
    .select('*')
    .eq('league_id', leagueId)
    .eq('status', 'active')
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapMember);
}

async function getMemberByUser(
  leagueId: string,
  userId: string,
): Promise<LeagueMember | null> {
  const { data, error } = await supabase
    .from('league_members')
    .select('*')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapMember(data) : null;
}

async function getMembershipsByUser(userId: string): Promise<LeagueMember[]> {
  const { data, error } = await supabase
    .from('league_members')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('joined_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapMember);
}

async function createMember(
  leagueId: string,
  userId: string,
  role: Role,
  teamId: string | null = null,
): Promise<LeagueMember> {
  const existing = await getMemberByUser(leagueId, userId);

  if (existing?.status === 'active') {
    return existing;
  }

  if (existing?.status === 'expelled') {
    const { data, error } = await supabase
      .from('league_members')
      .update({
        role,
        team_id: teamId,
        status: 'active',
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(
        error?.message ?? 'No se pudo reactivar al miembro.',
      );
    }

    return mapMember(data);
  }

  const id = `member-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await supabase
    .from('league_members')
    .insert({
      id,
      league_id: leagueId,
      user_id: userId,
      role,
      team_id: teamId,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return mapMember(data);
}

async function updateMemberRole(
  leagueId: string,
  userId: string,
  role: Role,
): Promise<LeagueMember> {
  const { data, error } = await supabase
    .from('league_members')
    .update({ role })
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('No se pudo actualizar el rol del miembro.');
  }

  return mapMember(data);
}

async function updateMemberTeam(
  leagueId: string,
  userId: string,
  teamId: string | null,
): Promise<LeagueMember> {
  const { data, error } = await supabase
    .from('league_members')
    .update({ team_id: teamId })
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('No se pudo actualizar el equipo del miembro.');
  }

  return mapMember(data);
}

async function expelMember(leagueId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('league_members')
    .update({ status: 'expelled' })
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .neq('role', 'owner');

  if (error) throw error;
}

async function removeMember(leagueId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('league_members')
    .delete()
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .neq('role', 'owner');

  if (error) throw error;
}

export const memberService = {
  getMembersByLeague,
  getMemberByUser,
  getMembershipsByUser,
  createMember,
  updateMemberRole,
  updateMemberTeam,
  expelMember,
  removeMember,
};
