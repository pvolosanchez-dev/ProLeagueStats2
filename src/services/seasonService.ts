import { Season } from '@/types';
import { supabase } from '@/lib/supabaseClient';

function mapSeason(row: any): Season {
  return {
    id: row.id,
    leagueId: row.league_id,
    name: row.name,
    status: row.status,
    phase: row.phase,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
  };
}

async function getByLeague(leagueId: string): Promise<Season[]> {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('league_id', leagueId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapSeason);
}

async function getActiveSeason(leagueId: string): Promise<Season | null> {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('league_id', leagueId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  return data ? mapSeason(data) : null;
}

async function create(leagueId: string, name: string): Promise<Season> {
  const id = `season-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const { data, error } = await supabase
    .from('seasons')
    .insert({ id, league_id: leagueId, name, status: 'draft', phase: 'regular' })
    .select()
    .single();

  if (error) throw error;
  return mapSeason(data);
}

async function activate(seasonId: string): Promise<void> {
  const { data: season, error: findError } = await supabase
    .from('seasons')
    .select('league_id')
    .eq('id', seasonId)
    .single();

  if (findError) throw findError;

  const { error: finishError } = await supabase
    .from('seasons')
    .update({ status: 'finished' })
    .eq('league_id', season.league_id)
    .eq('status', 'active');

  if (finishError) throw finishError;

  const { error } = await supabase
    .from('seasons')
    .update({ status: 'active', phase: 'regular' })
    .eq('id', seasonId);

  if (error) throw error;
}

async function setPhase(
  seasonId: string,
  phase: Season['phase'],
): Promise<Season | null> {
  const { data, error } = await supabase
    .from('seasons')
    .update({ phase })
    .eq('id', seasonId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data ? mapSeason(data) : null;
}

async function finish(seasonId: string): Promise<void> {
  const { error } = await supabase
    .from('seasons')
    .update({ status: 'finished', end_date: new Date().toISOString() })
    .eq('id', seasonId);

  if (error) throw error;
}

export const seasonService = {
  getByLeague,
  getActiveSeason,
  create,
  activate,
  setPhase,
  finish,
};
