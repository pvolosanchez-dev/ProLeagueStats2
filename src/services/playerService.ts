import { Player, Position } from '@/types';
import { supabase } from '@/lib/supabaseClient';

function mapPlayer(row: any): Player {
  return {
    id: row.id,
    userId: row.user_id,
    teamId: row.team_id,
    name: row.name,
    position: row.position,
    jerseyNumber: row.jersey_number,
    photoUrl: row.photo_url,
    stats: {
      gamesPlayed: row.games_played ?? 0,
      goals: row.goals ?? 0,
      assists: row.assists ?? 0,
      yellowCards: row.yellow_cards ?? 0,
      redCards: row.red_cards ?? 0,
      minutesPlayed: row.minutes_played ?? 0,
      mvpAwards: row.mvp_awards ?? 0,
    },
  };
}

async function getPlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*');
  if (error) throw error;
  return (data ?? []).map(mapPlayer);
}

async function getPlayersByTeam(teamId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', teamId)
    .order('jersey_number', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapPlayer);
}

async function getPlayersByLeague(
  leagueId: string,
  teams: { id: string; leagueId: string }[],
): Promise<Player[]> {
  const teamIds = teams
    .filter((team) => team.leagueId === leagueId)
    .map((team) => team.id);

  if (teamIds.length === 0) return [];

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .in('team_id', teamIds);
  if (error) throw error;
  return (data ?? []).map(mapPlayer);
}

async function getPlayerById(id: string): Promise<Player | null> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapPlayer(data) : null;
}

interface NewPlayerInput {
  teamId: string;
  userId?: string | null;
  name: string;
  position: Position;
  jerseyNumber: number;
  photoUrl?: string | null;
}

async function syncMembershipTeam(userId: string | null | undefined, teamId: string | null) {
  if (!userId) return;

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('league_id')
    .eq('id', teamId)
    .maybeSingle();

  if (teamError) throw teamError;
  if (!team) throw new Error('No se encontró el equipo.');

  const { error } = await supabase
    .from('league_members')
    .update({ team_id: teamId })
    .eq('league_id', team.league_id)
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) throw error;
}

async function addPlayer(input: NewPlayerInput): Promise<Player> {
  const id = `player-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const { data, error } = await supabase
    .from('players')
    .insert({
      id,
      team_id: input.teamId,
      user_id: input.userId ?? null,
      name: input.name.trim(),
      position: input.position,
      jersey_number: input.jerseyNumber,
      photo_url: input.photoUrl ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  const player = mapPlayer(data);
  await syncMembershipTeam(player.userId, player.teamId);
  return player;
}

interface UpdatePlayerInput extends Partial<Player> {
  resetStats?: boolean;
}

async function updatePlayer(id: string, updates: UpdatePlayerInput): Promise<Player> {
  const existing = await getPlayerById(id);
  if (!existing) throw new Error('Jugador no encontrado.');

  const { resetStats, ...playerUpdates } = updates;
  const stats = resetStats
    ? {
        games_played: 0,
        goals: 0,
        assists: 0,
        yellow_cards: 0,
        red_cards: 0,
        minutes_played: 0,
        mvp_awards: 0,
      }
    : playerUpdates.stats
      ? {
          games_played: playerUpdates.stats.gamesPlayed,
          goals: playerUpdates.stats.goals,
          assists: playerUpdates.stats.assists,
          yellow_cards: playerUpdates.stats.yellowCards,
          red_cards: playerUpdates.stats.redCards,
          minutes_played: playerUpdates.stats.minutesPlayed,
          mvp_awards: playerUpdates.stats.mvpAwards,
        }
      : {};

  const dbUpdates = {
    team_id: playerUpdates.teamId,
    user_id: playerUpdates.userId,
    name: playerUpdates.name?.trim(),
    position: playerUpdates.position,
    jersey_number: playerUpdates.jerseyNumber,
    photo_url: playerUpdates.photoUrl,
    ...stats,
  };

  Object.keys(dbUpdates).forEach((key) => {
    if (dbUpdates[key as keyof typeof dbUpdates] === undefined) {
      delete dbUpdates[key as keyof typeof dbUpdates];
    }
  });

  const { data, error } = await supabase
    .from('players')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  const player = mapPlayer(data);
  if (player.userId && player.teamId) {
    await syncMembershipTeam(player.userId, player.teamId);
  }

  return player;
}

async function removePlayer(id: string): Promise<void> {
  const existing = await getPlayerById(id);
  if (!existing) return;

  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', id);
  if (error) throw error;

  if (existing.userId && existing.teamId) {
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('league_id')
      .eq('id', existing.teamId)
      .maybeSingle();

    if (teamError) throw teamError;

    if (team) {
      const { error: membershipError } = await supabase
        .from('league_members')
        .update({ team_id: null })
        .eq('league_id', team.league_id)
        .eq('user_id', existing.userId)
        .eq('status', 'active')
        .eq('team_id', existing.teamId);

      if (membershipError) throw membershipError;
    }
  }
}

export const playerService = {
  getPlayers,
  getPlayersByTeam,
  getPlayersByLeague,
  getPlayerById,
  addPlayer,
  updatePlayer,
  removePlayer,
};
