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
  MAX_PUSKAS_VIDEO_DURATION_SECONDS,
} from '@/types';
import { storageService } from './storageService';
import { STORAGE_KEYS } from './storageKeys';
import { playerService } from './playerService';
import { teamService } from './teamService';
import { memberService } from './memberService';
import { playoffSeriesService } from './playoffSeriesService';
import { auditService } from './auditService';
import { calculateStandings } from '@/utils/standings';
import { Match } from '@/types';

function readAwards(): SeasonAward[] {
  return storageService.getCollection<SeasonAward>(STORAGE_KEYS.seasonAwards, []);
}
function writeAwards(awards: SeasonAward[]): void {
  storageService.setItem(STORAGE_KEYS.seasonAwards, awards);
}
function readVotes(): AwardVote[] {
  return storageService.getCollection<AwardVote>(STORAGE_KEYS.awardVotes, []);
}
function writeVotes(votes: AwardVote[]): void {
  storageService.setItem(STORAGE_KEYS.awardVotes, votes);
}
function readPuskasNominations(): PuskasNomination[] {
  return storageService.getCollection<PuskasNomination>(STORAGE_KEYS.puskasNominations, []);
}
function writePuskasNominations(nominations: PuskasNomination[]): void {
  storageService.setItem(STORAGE_KEYS.puskasNominations, nominations);
}
function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function getAward(leagueId: string, seasonId: string, type: AwardType): SeasonAward | null {
  return readAwards().find((award) => award.leagueId === leagueId && award.seasonId === seasonId && award.type === type) ?? null;
}
function ensureAward(leagueId: string, seasonId: string, type: AwardType): SeasonAward {
  const existing = getAward(leagueId, seasonId, type);
  if (existing) return existing;
  const award: SeasonAward = {
    id: createId('award'), leagueId, seasonId, type,
    winnerPlayerId: null, votingStatus: 'not_started',
    votingStartedAt: null, votingEndsAt: null, winnerVoteCount: 0,
    winningVideoUrl: null, winningVideoDurationSeconds: null,
    createdAt: new Date().toISOString(), finalizedAt: null,
  };
  writeAwards([...readAwards(), award]);
  return award;
}

function getStageInfo(teamId: string, matches: Match[]): { stage: string; bonus: number } {
  const playoffMatches = matches.filter((match) => match.phase === 'playoff' && match.playoffRound && (match.homeTeamId === teamId || match.awayTeamId === teamId));
  if (playoffMatches.some((match) => match.playoffRound === 'final')) {
    const finalSeriesIds = new Set(playoffMatches.filter((match) => match.playoffRound === 'final').map((match) => match.playoffSeriesId).filter((id): id is string => !!id));
    for (const seriesId of finalSeriesIds) {
      const result = playoffSeriesService.getSeriesResult(seriesId);
      if (result.decided && result.winnerTeamId === teamId) return { stage: 'Campeón', bonus: AWARD_POINT_VALUES.champion };
      if (result.decided && result.loserTeamId === teamId) return { stage: 'Subcampeón', bonus: AWARD_POINT_VALUES.runnerUp };
    }
    return { stage: 'Finalista', bonus: 0 };
  }
  if (playoffMatches.some((match) => match.playoffRound === 'semifinal')) return { stage: 'Semifinalista', bonus: AWARD_POINT_VALUES.semifinalist };
  if (playoffMatches.some((match) => match.playoffRound === 'quarterfinal')) return { stage: 'Cuartofinalista', bonus: AWARD_POINT_VALUES.quarterfinalist };
  return { stage: 'Temporada regular', bonus: 0 };
}

async function buildCandidates(leagueId: string, seasonId: string): Promise<AwardCandidate[]> {
  const teams = await teamService.getTeamsByLeague(leagueId);
  const players = await playerService.getPlayersByLeague(leagueId, teams);
  const allMatches = storageService.getCollection<Match>(STORAGE_KEYS.matches, []);
  const seasonMatches = allMatches.filter((match) => match.leagueId === leagueId && match.seasonId === seasonId);
  const regularMatches = seasonMatches.filter((match) => match.phase === 'regular');
  const standings = calculateStandings(teams.map((team) => team.id), regularMatches);
  const positionMap = new Map(standings.map((standing, index) => [standing.teamId, index + 1]));
  const teamMap = new Map(teams.map((team) => [team.id, team]));

  return players.map((player) => {
    const team = teamMap.get(player.teamId);
    const stageInfo = getStageInfo(player.teamId, seasonMatches);
    const performancePoints = player.stats.goals * AWARD_POINT_VALUES.goal + player.stats.assists * AWARD_POINT_VALUES.assist + player.stats.mvpAwards * AWARD_POINT_VALUES.mvp + stageInfo.bonus;
    return {
      playerId: player.id, playerName: player.name, teamId: player.teamId,
      teamName: team?.name ?? '', teamColor: team?.color ?? '#64748b',
      goals: player.stats.goals, assists: player.stats.assists, mvpAwards: player.stats.mvpAwards,
      performancePoints, tournamentStage: stageInfo.stage,
      tournamentPosition: positionMap.get(player.teamId) ?? null, rank: 0,
    };
  });
}

async function getBallonDorCandidates(leagueId: string, seasonId: string): Promise<AwardCandidate[]> {
  const candidates = await buildCandidates(leagueId, seasonId);
  return candidates.sort((a, b) => b.performancePoints - a.performancePoints || b.goals - a.goals || b.assists - a.assists || b.mvpAwards - a.mvpAwards).slice(0, MAX_BALLON_CANDIDATES).map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

async function getGoldenBootCandidates(leagueId: string, seasonId: string): Promise<AwardCandidate[]> {
  const candidates = await buildCandidates(leagueId, seasonId);
  return candidates.sort((a, b) => b.goals - a.goals || b.assists - a.assists || b.performancePoints - a.performancePoints).slice(0, MAX_GOLDEN_BOOT_CANDIDATES).map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

async function getAllPlayerPerformance(leagueId: string, seasonId: string): Promise<AwardCandidate[]> {
  const candidates = await buildCandidates(leagueId, seasonId);
  return candidates.sort((a, b) => b.goals - a.goals || b.assists - a.assists || b.mvpAwards - a.mvpAwards || b.performancePoints - a.performancePoints).map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

async function nominatePuskas(leagueId: string, seasonId: string, playerId: string, actorId: string): Promise<PuskasNomination> {
  const membership = await memberService.getMemberByUser(leagueId, actorId);
  if (!membership || membership.status !== 'active' || !['owner', 'admin', 'captain'].includes(membership.role)) throw new Error('Solo el propietario, administrador o capitán puede nominar al Puskás.');
  const teams = await teamService.getTeamsByLeague(leagueId);
  const player = await playerService.getPlayerById(playerId);
  const team = player ? teams.find((candidate) => candidate.id === player.teamId) : null;
  if (!player || !team || team.leagueId !== leagueId) throw new Error('El jugador no pertenece a esta liga.');

  const nominations = readPuskasNominations();
  const playerNominationCount = nominations.filter((nomination) => nomination.leagueId === leagueId && nomination.seasonId === seasonId && nomination.playerId === playerId).length;
  if (playerNominationCount >= MAX_PUSKAS_NOMINATIONS_PER_PLAYER) throw new Error('Este jugador ya alcanzó el máximo de 2 nominaciones al Puskás en esta temporada.');

  const nomination: PuskasNomination = {
    id: createId('puskas'), leagueId, seasonId, playerId, playerName: player.name,
    teamId: team.id, nominatedByUserId: actorId, createdAt: new Date().toISOString(),
    voteCount: 0, isWinner: false, winningVideoUrl: null, winningVideoDurationSeconds: null,
  };
  writePuskasNominations([...nominations, nomination]);
  auditService.log(leagueId, actorId, 'puskas_nominated', `Jugador nominado al Puskás: ${player.name}.`);
  return nomination;
}

async function getPuskasNominations(leagueId: string, seasonId: string): Promise<PuskasNomination[]> {
  return readPuskasNominations().filter((nomination) => nomination.leagueId === leagueId && nomination.seasonId === seasonId).sort((a, b) => a.playerName.localeCompare(b.playerName));
}

async function startVoting(leagueId: string, seasonId: string, type: 'ballon_or' | 'puskas', actorId: string): Promise<SeasonAward> {
  const membership = await memberService.getMemberByUser(leagueId, actorId);
  if (!membership || membership.status !== 'active' || (membership.role !== 'owner' && membership.role !== 'admin')) throw new Error('Solo el propietario o administrador puede iniciar la votación.');
  const candidates = type === 'ballon_or' ? await getBallonDorCandidates(leagueId, seasonId) : await getPuskasNominations(leagueId, seasonId);
  if (candidates.length === 0) throw new Error('No hay candidatos suficientes para iniciar la votación.');

  const award = ensureAward(leagueId, seasonId, type);
  if (award.votingStatus === 'open') return award;
  if (award.votingStatus === 'closed') throw new Error('La votación de este premio ya terminó.');

  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + AWARD_VOTING_DURATION_MS);
  const updatedAward = { ...award, votingStatus: 'open' as const, votingStartedAt: startedAt.toISOString(), votingEndsAt: endsAt.toISOString() };
  writeAwards(readAwards().map((current) => current.id === award.id ? updatedAward : current));

  if (type === 'ballon_or') {
    const automaticVotes: AwardVote[] = candidates.slice(0, 3).map((candidate, index) => ({
      id: createId('vote'), leagueId, seasonId, awardType: 'ballon_or', voterUserId: null,
      candidatePlayerId: candidate.playerId, automatic: true, weight: BALLOON_AUTOMATIC_VOTES[index], createdAt: startedAt.toISOString(),
    }));
    writeVotes([...readVotes(), ...automaticVotes]);
  }
  return updatedAward;
}

async function vote(leagueId: string, seasonId: string, type: 'ballon_or' | 'puskas', candidatePlayerId: string, voterUserId: string): Promise<AwardVote> {
  const award = getAward(leagueId, seasonId, type);
  if (!award || award.votingStatus !== 'open') throw new Error('La votación no está abierta.');
  if (!award.votingEndsAt || Date.now() >= new Date(award.votingEndsAt).getTime()) throw new Error('El periodo de votación de 24 horas terminó.');

  const membership = await memberService.getMemberByUser(leagueId, voterUserId);
  if (!membership || membership.status !== 'active') throw new Error('Solo los jugadores activos de la liga pueden votar.');
  const voterPlayers = await playerService.getPlayers();
  const voterPlayer = voterPlayers.find((player) => player.userId === voterUserId && player.teamId === membership.teamId);
  if (!voterPlayer) throw new Error('Solo los jugadores registrados pueden votar.');
  if (voterPlayer.id === candidatePlayerId) throw new Error('No puedes votar por ti mismo.');

  const existingVote = readVotes().find((existing) => existing.leagueId === leagueId && existing.seasonId === seasonId && existing.awardType === type && existing.voterUserId === voterUserId);
  if (existingVote) throw new Error('Ya has emitido tu voto para este premio.');

  if (type === 'ballon_or') {
    const candidates = await getBallonDorCandidates(leagueId, seasonId);
    if (!candidates.some((candidate) => candidate.playerId === candidatePlayerId)) throw new Error('Solo puedes votar por uno de los 20 candidatos al Balón de Oro.');
  } else {
    const nominations = await getPuskasNominations(leagueId, seasonId);
    if (!nominations.some((nomination) => nomination.playerId === candidatePlayerId)) throw new Error('Solo puedes votar por un jugador nominado al Puskás.');
  }

  const newVote: AwardVote = {
    id: createId('vote'), leagueId, seasonId, awardType: type,
    voterUserId, candidatePlayerId, automatic: false, weight: 1, createdAt: new Date().toISOString(),
  };
  writeVotes([...readVotes(), newVote]);
  return newVote;
}

async function finalizeVoting(leagueId: string, seasonId: string, type: 'ballon_or' | 'puskas'): Promise<SeasonAward> {
  const award = getAward(leagueId, seasonId, type);
  if (!award || award.votingStatus !== 'open') throw new Error('La votación no está abierta.');
  if (award.votingEndsAt && Date.now() < new Date(award.votingEndsAt).getTime()) throw new Error('La votación todavía no ha terminado.');

  const totals = new Map<string, number>();
  readVotes().filter((voteItem) => voteItem.leagueId === leagueId && voteItem.seasonId === seasonId && voteItem.awardType === type).forEach((voteItem) => totals.set(voteItem.candidatePlayerId, (totals.get(voteItem.candidatePlayerId) ?? 0) + voteItem.weight));

  let winnerPlayerId: string | null = null;
  let winnerVoteCount = 0;
  let tied = false;
  totals.forEach((count, playerId) => {
    if (count > winnerVoteCount) { winnerPlayerId = playerId; winnerVoteCount = count; tied = false; }
    else if (count === winnerVoteCount && count > 0) tied = true;
  });
  if (tied) throw new Error('La votación terminó en empate. Se requiere una nueva votación para determinar al ganador.');

  const updatedAward = { ...award, votingStatus: 'closed' as const, winnerPlayerId, winnerVoteCount, finalizedAt: new Date().toISOString() };
  writeAwards(readAwards().map((current) => current.id === award.id ? updatedAward : current));

  if (type === 'puskas' && winnerPlayerId) {
    writePuskasNominations(readPuskasNominations().map((nomination) => ({
      ...nomination,
      isWinner: nomination.leagueId === leagueId && nomination.seasonId === seasonId && nomination.playerId === winnerPlayerId,
      voteCount: nomination.leagueId === leagueId && nomination.seasonId === seasonId ? totals.get(nomination.playerId) ?? 0 : nomination.voteCount,
    })));
  }
  return updatedAward;
}

async function getVoteCounts(leagueId: string, seasonId: string, type: 'ballon_or' | 'puskas'): Promise<Record<string, number>> {
  const totals: Record<string, number> = {};
  readVotes().filter((vote) => vote.leagueId === leagueId && vote.seasonId === seasonId && vote.awardType === type).forEach((vote) => { totals[vote.candidatePlayerId] = (totals[vote.candidatePlayerId] ?? 0) + vote.weight; });
  return totals;
}

async function uploadWinningPuskasVideo(leagueId: string, seasonId: string, playerId: string, videoUrl: string, durationSeconds: number): Promise<SeasonAward> {
  const award = getAward(leagueId, seasonId, 'puskas');
  if (!award || award.winnerPlayerId !== playerId || award.votingStatus !== 'closed') throw new Error('Solo el ganador del Puskás puede registrar el video ganador.');
  if (!videoUrl.trim()) throw new Error('Debes proporcionar el video ganador.');
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > MAX_PUSKAS_VIDEO_DURATION_SECONDS) throw new Error('El video ganador debe durar máximo 30 segundos.');
  const player = await playerService.getPlayerById(playerId);
  if (!player) throw new Error('Jugador no encontrado.');

  const updatedAward = { ...award, winningVideoUrl: videoUrl.trim(), winningVideoDurationSeconds: durationSeconds };
  writeAwards(readAwards().map((current) => current.id === award.id ? updatedAward : current));
  writePuskasNominations(readPuskasNominations().map((nomination) => nomination.leagueId === leagueId && nomination.seasonId === seasonId && nomination.playerId === playerId ? { ...nomination, winningVideoUrl: videoUrl.trim(), winningVideoDurationSeconds: durationSeconds } : nomination));
  return updatedAward;
}

async function getSeasonAwards(leagueId: string, seasonId: string): Promise<SeasonAward[]> {
  return readAwards().filter((award) => award.leagueId === leagueId && award.seasonId === seasonId);
}

export const awardServiceV2 = {
  getBallonDorCandidates,
  getGoldenBootCandidates,
  getAllPlayerPerformance,
  getPuskasNominations,
  nominatePuskas,
  startVoting,
  vote,
  finalizeVoting,
  getVoteCounts,
  uploadWinningPuskasVideo,
  getSeasonAwards,
};
