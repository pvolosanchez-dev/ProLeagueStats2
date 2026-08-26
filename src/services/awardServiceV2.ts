import {
  AwardCandidate,
  AwardType,
  AwardVote,
  PuskasNomination,
  SeasonAward,
  AWARD_POINT_VALUES,
  AWARD_VOTING_DURATION_MS,
  BALLOON_AUTOMATIC_VOTES,
  MAX_BALLON_CANDIDATES,
  MAX_GOLDEN_BOOT_CANDIDATES,
  MAX_PUSKAS_NOMINATIONS_PER_PLAYER,
} from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { playerService } from './playerService';
import { teamService } from './teamService';
import { memberService } from './memberService';
import { matchService } from './matchService';
import { playoffSeriesService } from './playoffSeriesService';

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const mapAward = (row: any): SeasonAward => ({
  id: row.id, leagueId: row.league_id, seasonId: row.season_id, type: row.type,
  winnerPlayerId: row.winner_player_id, votingStatus: row.voting_status,
  votingStartedAt: row.voting_started_at, votingEndsAt: row.voting_ends_at,
  winnerVoteCount: row.winner_vote_count ?? 0, winningVideoUrl: row.winning_video_url,
  winningVideoDurationSeconds: row.winning_video_duration_seconds,
  createdAt: row.created_at, finalizedAt: row.finalized_at,
});

const mapVote = (row: any): AwardVote => ({
  id: row.id, leagueId: row.league_id, seasonId: row.season_id, awardType: row.award_type,
  voterUserId: row.voter_user_id, candidatePlayerId: row.candidate_player_id,
  automatic: row.automatic, weight: row.weight, createdAt: row.created_at,
});

const mapPuskas = (row: any): PuskasNomination => ({
  id: row.id, leagueId: row.league_id, seasonId: row.season_id, playerId: row.player_id,
  playerName: row.player_name, teamId: row.team_id, nominatedByUserId: row.nominated_by_user_id,
  createdAt: row.created_at, voteCount: row.vote_count ?? 0, isWinner: row.is_winner ?? false,
  winningVideoUrl: row.winning_video_url, winningVideoDurationSeconds: row.winning_video_duration_seconds,
});

async function getAward(leagueId: string, seasonId: string, type: AwardType) {
  const { data, error } = await supabase.from('season_awards').select('*')
    .eq('league_id', leagueId).eq('season_id', seasonId).eq('type', type).maybeSingle();
  if (error) throw error;
  return data ? mapAward(data) : null;
}

async function ensureAward(leagueId: string, seasonId: string, type: AwardType) {
  const existing = await getAward(leagueId, seasonId, type);
  if (existing) return existing;
  const { data, error } = await supabase.from('season_awards').insert({
    id: createId('award'), league_id: leagueId, season_id: seasonId, type,
  }).select().single();
  if (error) throw error;
  return mapAward(data);
}

async function buildCandidates(leagueId: string, seasonId: string): Promise<AwardCandidate[]> {
  const teams = await teamService.getTeamsByLeague(leagueId);
  const players = await playerService.getPlayersByLeague(leagueId, teams);
  const matches = (await matchService.getMatchesByLeague(leagueId)).filter((m) => m.seasonId === seasonId);
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  const candidates = await Promise.all(players.map(async (player) => {
    const team = teamMap.get(player.teamId);
    const playoff = matches.filter(
      (m) => m.phase === 'playoff' && (m.homeTeamId === player.teamId || m.awayTeamId === player.teamId),
    );

    let stage = 'Temporada regular';
    let bonus = 0;

    if (playoff.some((m) => m.playoffRound === 'final')) {
      stage = 'Finalista';
      const seriesIds = [...new Set(
        playoff
          .filter((m) => m.playoffRound === 'final' && m.playoffSeriesId)
          .map((m) => m.playoffSeriesId as string),
      )];

      for (const seriesId of seriesIds) {
        const result = await playoffSeriesService.getSeriesResult(seriesId);
        if (result.decided && result.winnerTeamId === player.teamId) {
          stage = 'Campeón';
          bonus = AWARD_POINT_VALUES.champion;
          break;
        }
        if (result.decided && result.loserTeamId === player.teamId) {
          stage = 'Subcampeón';
          bonus = AWARD_POINT_VALUES.runnerUp;
          break;
        }
      }
    } else if (playoff.some((m) => m.playoffRound === 'semifinal')) {
      stage = 'Semifinalista';
      bonus = AWARD_POINT_VALUES.semifinalist;
    } else if (playoff.some((m) => m.playoffRound === 'quarterfinal')) {
      stage = 'Cuartofinalista';
      bonus = AWARD_POINT_VALUES.quarterfinalist;
    }

    return {
      playerId: player.id,
      playerName: player.name,
      teamId: player.teamId,
      teamName: team?.name ?? '',
      teamColor: team?.color ?? '#64748b',
      goals: player.stats.goals,
      assists: player.stats.assists,
      mvpAwards: player.stats.mvpAwards,
      performancePoints:
        player.stats.goals * AWARD_POINT_VALUES.goal +
        player.stats.assists * AWARD_POINT_VALUES.assist +
        player.stats.mvpAwards * AWARD_POINT_VALUES.mvp +
        bonus,
      tournamentStage: stage,
      rank: 0,
    };
  }));

  return candidates;
}

async function getBallonDorCandidates(leagueId: string, seasonId: string) {
  return (await buildCandidates(leagueId, seasonId))
    .sort((a, b) => b.performancePoints - a.performancePoints || b.goals - a.goals || b.assists - a.assists || b.mvpAwards - a.mvpAwards)
    .slice(0, MAX_BALLON_CANDIDATES)
    .map((c, i) => ({ ...c, rank: i + 1 }));
}

async function getGoldenBootCandidates(leagueId: string, seasonId: string) {
  return (await buildCandidates(leagueId, seasonId))
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || b.performancePoints - a.performancePoints)
    .slice(0, MAX_GOLDEN_BOOT_CANDIDATES)
    .map((c, i) => ({ ...c, rank: i + 1 }));
}

async function getAllPlayerPerformance(leagueId: string, seasonId: string) {
  return (await buildCandidates(leagueId, seasonId))
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || b.mvpAwards - a.mvpAwards || b.performancePoints - a.performancePoints)
    .map((c, i) => ({ ...c, rank: i + 1 }));
}

async function nominatePuskas(leagueId: string, seasonId: string, playerId: string, actorId: string) {
  const membership = await memberService.getMemberByUser(leagueId, actorId);
  if (!membership || membership.status !== 'active' || !['owner', 'admin', 'captain'].includes(membership.role)) throw new Error('Solo el propietario, administrador o capitán puede nominar al Puskás.');
  const player = await playerService.getPlayerById(playerId);
  const team = player ? (await teamService.getTeamsByLeague(leagueId)).find((t) => t.id === player.teamId) : null;
  if (!player || !team) throw new Error('El jugador no pertenece a esta liga.');

  const { count, error: countError } = await supabase.from('puskas_nominations').select('*', { count: 'exact', head: true })
    .eq('league_id', leagueId).eq('season_id', seasonId).eq('player_id', playerId);
  if (countError) throw countError;
  if ((count ?? 0) >= MAX_PUSKAS_NOMINATIONS_PER_PLAYER) throw new Error('Este jugador ya alcanzó el máximo de 2 nominaciones al Puskás en esta temporada.');

  const { data, error } = await supabase.from('puskas_nominations').insert({
    id: createId('puskas'), league_id: leagueId, season_id: seasonId, player_id: player.id,
    player_name: player.name, team_id: team.id, nominated_by_user_id: actorId,
  }).select().single();
  if (error) throw error;
  return mapPuskas(data);
}

async function getPuskasNominations(leagueId: string, seasonId: string) {
  const { data, error } = await supabase.from('puskas_nominations').select('*')
    .eq('league_id', leagueId).eq('season_id', seasonId).order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapPuskas).sort((a, b) => a.playerName.localeCompare(b.playerName));
}

async function startVoting(leagueId: string, seasonId: string, type: 'ballon_or' | 'puskas', actorId: string) {
  const membership = await memberService.getMemberByUser(leagueId, actorId);
  if (!membership || membership.status !== 'active' || !['owner', 'admin'].includes(membership.role)) throw new Error('Solo el propietario o administrador puede iniciar la votación.');
  const candidates = type === 'ballon_or' ? await getBallonDorCandidates(leagueId, seasonId) : await getPuskasNominations(leagueId, seasonId);
  if (!candidates.length) throw new Error('No hay candidatos suficientes para iniciar la votación.');
  const award = await ensureAward(leagueId, seasonId, type);
  if (award.votingStatus === 'closed') throw new Error('La votación de este premio ya terminó.');
  if (award.votingStatus === 'open') return award;

  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + AWARD_VOTING_DURATION_MS);
  const { data, error } = await supabase.from('season_awards').update({
    voting_status: 'open', voting_started_at: startedAt.toISOString(), voting_ends_at: endsAt.toISOString(),
  }).eq('id', award.id).select().single();
  if (error) throw error;

  if (type === 'ballon_or') {
    const rows = candidates.slice(0, 3).map((c, i) => ({
      id: createId('vote'), league_id: leagueId, season_id: seasonId, award_type: type,
      voter_user_id: null, candidate_player_id: c.playerId, automatic: true,
      weight: BALLOON_AUTOMATIC_VOTES[i], created_at: startedAt.toISOString(),
    }));
    if (rows.length) {
      const { error: voteError } = await supabase.from('award_votes').insert(rows);
      if (voteError) throw voteError;
    }
  }
  return mapAward(data);
}

async function vote(leagueId: string, seasonId: string, type: 'ballon_or' | 'puskas', candidatePlayerId: string, voterUserId: string) {
  const award = await getAward(leagueId, seasonId, type);
  if (!award || award.votingStatus !== 'open') throw new Error('La votación no está abierta.');
  if (!award.votingEndsAt || Date.now() >= new Date(award.votingEndsAt).getTime()) throw new Error('El periodo de votación terminó.');
  const membership = await memberService.getMemberByUser(leagueId, voterUserId);
  if (!membership || membership.status !== 'active') throw new Error('Solo los jugadores activos de la liga pueden votar.');
  const players = await playerService.getPlayers();
  const voter = players.find((p) => p.userId === voterUserId && p.teamId === membership.teamId);
  if (!voter) throw new Error('Solo los jugadores registrados pueden votar.');
  if (voter.id === candidatePlayerId) throw new Error('No puedes votar por ti mismo.');
  const { data: existing } = await supabase.from('award_votes').select('id').eq('league_id', leagueId).eq('season_id', seasonId).eq('award_type', type).eq('voter_user_id', voterUserId).maybeSingle();
  if (existing) throw new Error('Ya has emitido tu voto para este premio.');

  const valid = type === 'ballon_or'
    ? (await getBallonDorCandidates(leagueId, seasonId)).some((c) => c.playerId === candidatePlayerId)
    : (await getPuskasNominations(leagueId, seasonId)).some((n) => n.playerId === candidatePlayerId);
  if (!valid) throw new Error('El jugador no es candidato válido para este premio.');

  const { data, error } = await supabase.from('award_votes').insert({
    id: createId('vote'), league_id: leagueId, season_id: seasonId, award_type: type,
    voter_user_id: voterUserId, candidate_player_id: candidatePlayerId, automatic: false, weight: 1,
  }).select().single();
  if (error) throw error;
  return mapVote(data);
}

async function finalizeVoting(leagueId: string, seasonId: string, type: 'ballon_or' | 'puskas') {
  const award = await getAward(leagueId, seasonId, type);
  if (!award || award.votingStatus !== 'open') throw new Error('La votación no está abierta.');
  if (award.votingEndsAt && Date.now() < new Date(award.votingEndsAt).getTime()) throw new Error('La votación todavía no ha terminado.');
  const { data: votes, error } = await supabase.from('award_votes').select('*').eq('league_id', leagueId).eq('season_id', seasonId).eq('award_type', type);
  if (error) throw error;
  const totals = new Map<string, number>();
  (votes ?? []).map(mapVote).forEach((v) => totals.set(v.candidatePlayerId, (totals.get(v.candidatePlayerId) ?? 0) + v.weight));

  let winnerPlayerId: string | null = null;
  let winnerVoteCount = 0;
  let tied = false;
  totals.forEach((count, playerId) => {
    if (count > winnerVoteCount) { winnerPlayerId = playerId; winnerVoteCount = count; tied = false; }
    else if (count === winnerVoteCount && count > 0) tied = true;
  });
  if (tied) throw new Error('La votación terminó en empate.');

  const { data, error: updateError } = await supabase.from('season_awards').update({
    voting_status: 'closed', winner_player_id: winnerPlayerId, winner_vote_count: winnerVoteCount, finalized_at: new Date().toISOString(),
  }).eq('id', award.id).select().single();
  if (updateError) throw updateError;

  if (type === 'puskas') {
    const nominations = await getPuskasNominations(leagueId, seasonId);
    for (const nomination of nominations) {
      const { error: nominationError } = await supabase.from('puskas_nominations').update({
        is_winner: winnerPlayerId === nomination.playerId, vote_count: totals.get(nomination.playerId) ?? 0,
      }).eq('id', nomination.id);
      if (nominationError) throw nominationError;
    }
  }
  return mapAward(data);
}

async function getVoteCounts(leagueId: string, seasonId: string, type: 'ballon_or' | 'puskas'): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('award_votes').select('candidate_player_id,weight').eq('league_id', leagueId).eq('season_id', seasonId).eq('award_type', type);
  if (error) throw error;
  const totals: Record<string, number> = {};
  (data ?? []).forEach((row) => { totals[row.candidate_player_id] = (totals[row.candidate_player_id] ?? 0) + row.weight; });
  return totals;
}

export const awardServiceV2 = {
  getBallonDorCandidates,
  getGoldenBootCandidates,
  getAllPlayerPerformance,
  nominatePuskas,
  getPuskasNominations,
  startVoting,
  vote,
  finalizeVoting,
  getVoteCounts,
};
