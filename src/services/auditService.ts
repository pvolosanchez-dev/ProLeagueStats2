import { AuditLog } from '@/types';
import { supabase } from '@/lib/supabaseClient';

function mapAudit(row: any): AuditLog {
  return {
    id: row.id,
    leagueId: row.league_id,
    actorId: row.actor_id,
    action: row.action,
    details: row.details,
    createdAt: row.created_at,
  };
}

async function log(
  leagueId: string,
  actorId: string,
  action: string,
  details: string,
): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    league_id: leagueId,
    actor_id: actorId,
    action,
    details,
  });

  if (error) throw new Error(error.message);
}

async function getByLeague(leagueId: string): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('league_id', leagueId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapAudit);
}

export const auditService = {
  log,
  getByLeague,
};
