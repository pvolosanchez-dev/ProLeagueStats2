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
  if (existing) return existing;

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
): Promise<LeagueMember | null> {
  const { data, error } = await supabase
    .from('league_members')
    .update({ role })
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data ? mapMember(data) : null;
}

async function updateMemberTeam(
  leagueId: string,
  userId: string,
  teamId: string | null,
): Promise<LeagueMember | null> {
  const { data, error } = await supabase
    .from('league_members')
    .update({ team_id: teamId })
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data ? mapMember(data) : null;
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
