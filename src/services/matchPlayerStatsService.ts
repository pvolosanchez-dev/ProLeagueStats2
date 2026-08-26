import { supabase } from '@/lib/supabaseClient';
import { playerService } from './playerService';
import { matchService } from './matchService';

export interface MatchPlayerStat {
  id: string;
  matchId: string;
  playerId: string;
  goals: number;
  assists: number;
  isMvp: boolean;
}

function mapStat(row: any): MatchPlayerStat {
  return {
    id: row.id,
    matchId: row.match_id,
    playerId: row.player_id,
    goals: row.goals ?? 0,
    assists: row.assists ?? 0,
    isMvp: row.is_mvp ?? false,
  };
}

async function getStatsByMatch(matchId: string): Promise<MatchPlayerStat[]> {
  const { data, error } = await supabase
    .from('match_player_stats')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapStat);
}

async function getStatsByPlayer(playerId: string): Promise<MatchPlayerStat[]> {
  const { data, error } = await supabase
    .from('match_player_stats')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapStat);
}

function validateNumber(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${field} debe ser un número entero mayor o igual a 0.`);
  }
}

export interface SaveMatchPlayerStatInput {
  playerId: string;
  goals: number;
  assists: number;
  isMvp: boolean;
}

async function saveMatchStats(
  matchId: string,
  statsInput: SaveMatchPlayerStatInput[],
): Promise<MatchPlayerStat[]> {
  const match = await matchService.getMatchById(matchId);
  if (!match) throw new Error('Partido no encontrado.');
  if (match.status !== 'finished') {
    throw new Error('Primero debes registrar el resultado del partido.');
  }

  const [homePlayers, awayPlayers] = await Promise.all([
    playerService.getPlayersByTeam(match.homeTeamId),
    playerService.getPlayersByTeam(match.awayTeamId),
  ]);

  const validPlayers = [...homePlayers, ...awayPlayers];
  const validPlayerIds = new Set(validPlayers.map((player) => player.id));
  const uniquePlayerIds = new Set<string>();

  let mvpCount = 0;
  let homeGoals = 0;
  let awayGoals = 0;

  for (const input of statsInput) {
    if (uniquePlayerIds.has(input.playerId)) {
      throw new Error('Un jugador no puede aparecer dos veces en el mismo partido.');
    }
    uniquePlayerIds.add(input.playerId);

    if (!validPlayerIds.has(input.playerId)) {
      throw new Error('Uno de los jugadores no pertenece a los equipos de este partido.');
    }

    validateNumber(input.goals, 'Los goles');
    validateNumber(input.assists, 'Las asistencias');

    const player = validPlayers.find((candidate) => candidate.id === input.playerId);
    if (player?.teamId === match.homeTeamId) homeGoals += input.goals;
    if (player?.teamId === match.awayTeamId) awayGoals += input.goals;
    if (input.isMvp) mvpCount++;
  }

  if (mvpCount > 1) throw new Error('Solo puede haber un MVP por partido.');

  if (homeGoals !== (match.homeScore ?? 0) || awayGoals !== (match.awayScore ?? 0)) {
    throw new Error(
      `Los goles registrados por jugador (${homeGoals}-${awayGoals}) deben coincidir con el resultado (${match.homeScore}-${match.awayScore}).`,
    );
  }

  const previousStats = await getStatsByMatch(matchId);

  for (const previous of previousStats) {
    const player = await playerService.getPlayerById(previous.playerId);
    if (!player) continue;

    await playerService.updatePlayer(player.id, {
      stats: {
        ...player.stats,
        gamesPlayed: Math.max(0, player.stats.gamesPlayed - 1),
        goals: Math.max(0, player.stats.goals - previous.goals),
        assists: Math.max(0, player.stats.assists - previous.assists),
        mvpAwards: Math.max(0, player.stats.mvpAwards - (previous.isMvp ? 1 : 0)),
      },
    });
  }

  const { error: deleteError } = await supabase
    .from('match_player_stats')
    .delete()
    .eq('match_id', matchId);
  if (deleteError) throw deleteError;

  const meaningfulInput = statsInput.filter(
    (input) => input.goals > 0 || input.assists > 0 || input.isMvp,
  );

  const rows = meaningfulInput.map((input) => ({
    id: `match-stat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    match_id: matchId,
    player_id: input.playerId,
    goals: input.goals,
    assists: input.assists,
    is_mvp: input.isMvp,
  }));

  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from('match_player_stats')
      .insert(rows);
    if (insertError) throw insertError;
  }

  for (const input of statsInput) {
    const player = await playerService.getPlayerById(input.playerId);
    if (!player) continue;

    await playerService.updatePlayer(player.id, {
      stats: {
        ...player.stats,
        gamesPlayed: player.stats.gamesPlayed + 1,
        goals: player.stats.goals + input.goals,
        assists: player.stats.assists + input.assists,
        mvpAwards: player.stats.mvpAwards + (input.isMvp ? 1 : 0),
      },
    });
  }

  return rows.map((row) => mapStat(row));
}

async function deleteMatchStats(matchId: string): Promise<void> {
  const existing = await getStatsByMatch(matchId);

  for (const stat of existing) {
    const player = await playerService.getPlayerById(stat.playerId);
    if (!player) continue;

    await playerService.updatePlayer(player.id, {
      stats: {
        ...player.stats,
        gamesPlayed: Math.max(0, player.stats.gamesPlayed - 1),
        goals: Math.max(0, player.stats.goals - stat.goals),
        assists: Math.max(0, player.stats.assists - stat.assists),
        mvpAwards: Math.max(0, player.stats.mvpAwards - (stat.isMvp ? 1 : 0)),
      },
    });
  }

  const { error } = await supabase
    .from('match_player_stats')
    .delete()
    .eq('match_id', matchId);
  if (error) throw error;
}

export const matchPlayerStatsService = {
  getStatsByMatch,
  getStatsByPlayer,
  saveMatchStats,
  deleteMatchStats,
};
