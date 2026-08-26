import {
  Match,
  PlayoffRound,
  Standing,
} from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { teamService } from './teamService';
import { auditService } from './auditService';
import { seasonService } from './seasonService';
import { leagueService } from './leagueService';
import { memberService } from './memberService';
import { playoffSeriesService } from './playoffSeriesService';
import { calculateStandings } from '@/utils/standings';

function mapMatch(row: any): Match {
  return {
    id: row.id,
    leagueId: row.league_id,
    seasonId: row.season_id,
    round: row.round,
    date: row.date,
    venue: row.venue ?? '',
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    homeScore: row.home_score,
    awayScore: row.away_score,
    status: row.status,
    mvpPlayerId: row.mvp_player_id,
    wentToOvertime: row.went_to_overtime,
    phase: row.phase,
    playoffRound: row.playoff_round,
    playoffSeriesId: row.playoff_series_id,
    playoffLeg: row.playoff_leg,
    playoffSeedHome: row.playoff_seed_home,
    playoffSeedAway: row.playoff_seed_away,
  };
}

async function readMatches(): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('round', { ascending: true })
    .order('date', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapMatch);
}

async function insertMatches(matches: Match[]): Promise<Match[]> {
  if (matches.length === 0) return [];

  const rows = matches.map((match) => ({
    id: match.id,
    league_id: match.leagueId,
    season_id: match.seasonId,
    round: match.round,
    date: match.date,
    venue: match.venue,
    home_team_id: match.homeTeamId,
    away_team_id: match.awayTeamId,
    home_score: match.homeScore,
    away_score: match.awayScore,
    status: match.status,
    mvp_player_id: match.mvpPlayerId,
    went_to_overtime: match.wentToOvertime,
    phase: match.phase,
    playoff_round: match.playoffRound,
    playoff_series_id: match.playoffSeriesId,
    playoff_leg: match.playoffLeg,
    playoff_seed_home: match.playoffSeedHome,
    playoff_seed_away: match.playoffSeedAway,
  }));

  const { data, error } = await supabase
    .from('matches')
    .insert(rows)
    .select();

  if (error) throw error;
  return (data ?? []).map(mapMatch);
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function assertCanManagePlayoffs(leagueId: string, actorId: string): Promise<void> {
  const membership = await memberService.getMemberByUser(leagueId, actorId);

  if (
    !membership ||
    membership.status !== 'active' ||
    (membership.role !== 'owner' && membership.role !== 'admin')
  ) {
    throw new Error('Solo el propietario o administrador puede gestionar la liguilla.');
  }
}

async function getLeagueStandings(
  leagueId: string,
  matches: Match[],
): Promise<Standing[]> {
  const teams = await teamService.getTeamsByLeague(leagueId);

  return calculateStandings(
    teams.map((team) => team.id),
    matches.filter(
      (match) =>
        match.leagueId === leagueId &&
        match.phase === 'regular' &&
        match.status === 'finished',
    ),
  );
}

function getFormatKey(
  round: PlayoffRound,
): 'quarterfinal' | 'semifinal' | 'final' {
  if (round === 'quarterfinal') return 'quarterfinal';
  if (round === 'semifinal') return 'semifinal';
  return 'final';
}

function createPlayoffMatch({
  leagueId,
  seasonId,
  round,
  homeTeamId,
  awayTeamId,
  playoffSeriesId,
  playoffLeg,
  seedHome,
  seedAway,
  offsetHours,
}: {
  leagueId: string;
  seasonId: string;
  round: PlayoffRound;
  homeTeamId: string;
  awayTeamId: string;
  playoffSeriesId: string;
  playoffLeg: 1 | 2 | null;
  seedHome: number | null;
  seedAway: number | null;
  offsetHours: number;
}): Match {
  return {
    id: createId('playoff'),
    leagueId,
    seasonId,
    round: 0,
    date: new Date(Date.now() + offsetHours * 60 * 60 * 1000).toISOString(),
    venue: '',
    homeTeamId,
    awayTeamId,
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    mvpPlayerId: null,
    wentToOvertime: false,
    phase: 'playoff',
    playoffRound: round,
    playoffSeriesId,
    playoffLeg,
    playoffSeedHome: seedHome,
    playoffSeedAway: seedAway,
  };
}

function createSeriesMatches({
  leagueId,
  seasonId,
  round,
  homeTeamId,
  awayTeamId,
  seedHome,
  seedAway,
  seriesIndex,
  playoffFormat,
}: {
  leagueId: string;
  seasonId: string;
  round: PlayoffRound;
  homeTeamId: string;
  awayTeamId: string;
  seedHome: number | null;
  seedAway: number | null;
  seriesIndex: number;
  playoffFormat: 'single-match' | 'home-and-away';
}): Match[] {
  const seriesId = createId(`${round}-${seriesIndex + 1}`);

  if (playoffFormat === 'single-match') {
    return [
      createPlayoffMatch({
        leagueId,
        seasonId,
        round,
        homeTeamId,
        awayTeamId,
        playoffSeriesId: seriesId,
        playoffLeg: 1,
        seedHome,
        seedAway,
        offsetHours: seriesIndex,
      }),
    ];
  }

  return [
    createPlayoffMatch({
      leagueId,
      seasonId,
      round,
      homeTeamId,
      awayTeamId,
      playoffSeriesId: seriesId,
      playoffLeg: 1,
      seedHome,
      seedAway,
      offsetHours: seriesIndex * 2,
    }),
    createPlayoffMatch({
      leagueId,
      seasonId,
      round,
      homeTeamId: awayTeamId,
      awayTeamId: homeTeamId,
      playoffSeriesId: seriesId,
      playoffLeg: 2,
      seedHome: seedAway,
      seedAway: seedHome,
      offsetHours: seriesIndex * 2 + 1,
    }),
  ];
}

function getRoundSeries(matches: Match[], round: PlayoffRound): string[] {
  return [
    ...new Set(
      matches
        .filter(
          (match) =>
            match.phase === 'playoff' &&
            match.playoffRound === round &&
            Boolean(match.playoffSeriesId),
        )
        .map((match) => match.playoffSeriesId as string),
    ),
  ];
}

async function areRoundSeriesDecided(seriesIds: string[]): Promise<boolean> {
  for (const seriesId of seriesIds) {
    const result = await playoffSeriesService.getSeriesResult(seriesId);
    if (!result.decided) return false;
  }

  return true;
}

async function getSeriesWinner(seriesId: string): Promise<string> {
  const result = await playoffSeriesService.getSeriesResult(seriesId);

  if (!result.decided || !result.winnerTeamId) {
    throw new Error('La serie todavía no está decidida.');
  }

  return result.winnerTeamId;
}

export async function generateTop8Playoff(
  leagueId: string,
  seasonId: string,
  actorId: string,
): Promise<Match[]> {
  await assertCanManagePlayoffs(leagueId, actorId);

  const matches = await readMatches();
  const existingPlayoffMatches = matches.filter(
    (match) =>
      match.leagueId === leagueId &&
      match.seasonId === seasonId &&
      match.phase === 'playoff',
  );

  if (existingPlayoffMatches.length > 0) return existingPlayoffMatches;

  const season = await seasonService.getActiveSeason(leagueId);
  if (!season) throw new Error('No existe una temporada activa para esta liga.');
  if (season.id !== seasonId) {
    throw new Error('La temporada indicada no corresponde a la temporada activa de esta liga.');
  }
  if (season.phase !== 'playoff') {
    throw new Error('La temporada todavía no está en fase de liguilla.');
  }

  const league = await leagueService.getLeagueById(leagueId);
  if (!league) throw new Error('Liga no encontrada.');
  if (league.format !== 'league-playoff') {
    throw new Error('Esta liga no utiliza el formato Liga + Liguilla.');
  }

  const teams = await teamService.getTeamsByLeague(leagueId);
  if (teams.length < 8) {
    throw new Error('Se necesitan al menos 8 equipos para generar la liguilla.');
  }

  const standings = await getLeagueStandings(leagueId, matches);
  const top8 = standings.slice(0, 8);
  if (top8.length < 8) {
    throw new Error('No hay suficientes equipos clasificados para generar la liguilla.');
  }

  const standingsByPosition = new Map<number, Standing>();
  top8.forEach((standing, index) => standingsByPosition.set(index + 1, standing));

  const pairings: Array<[number, number]> = [
    [1, 8],
    [2, 7],
    [3, 6],
    [4, 5],
  ];

  const newMatches: Match[] = [];
  const playoffFormat = league.playoffFormat.quarterfinal;

  for (let index = 0; index < pairings.length; index += 1) {
    const [seedHome, seedAway] = pairings[index];
    const home = standingsByPosition.get(seedHome);
    const away = standingsByPosition.get(seedAway);

    if (!home || !away) {
      throw new Error('No se pudo construir uno de los cruces de la liguilla.');
    }

    newMatches.push(
      ...createSeriesMatches({
        leagueId,
        seasonId,
        round: 'quarterfinal',
        homeTeamId: home.teamId,
        awayTeamId: away.teamId,
        seedHome,
        seedAway,
        seriesIndex: index,
        playoffFormat,
      }),
    );
  }

  const saved = await insertMatches(newMatches);

  await auditService.log(
    leagueId,
    actorId,
    'playoff_generated',
    playoffFormat === 'home-and-away'
      ? 'Cuartos generados a ida y vuelta: 1-8, 2-7, 3-6 y 4-5.'
      : 'Cuartos generados a partido único: 1-8, 2-7, 3-6 y 4-5.',
  );

  return saved;
}

async function generateNextRound(
  leagueId: string,
  seasonId: string,
  actorId: string,
  round: 'semifinal' | 'final',
  sourceRound: 'quarterfinal' | 'semifinal',
): Promise<Match[]> {
  await assertCanManagePlayoffs(leagueId, actorId);

  const matches = await readMatches();
  const existing = matches.filter(
    (match) =>
      match.leagueId === leagueId &&
      match.seasonId === seasonId &&
      match.phase === 'playoff' &&
      match.playoffRound === round,
  );

  if (existing.length > 0) return existing;

  const sourceSeriesIds = getRoundSeries(matches, sourceRound);
  if (sourceSeriesIds.length === 0) return [];

  if (!(await areRoundSeriesDecided(sourceSeriesIds))) return [];

  const orderedSeries = matches
    .filter(
      (match) =>
        match.leagueId === leagueId &&
        match.seasonId === seasonId &&
        match.phase === 'playoff' &&
        match.playoffRound === sourceRound &&
        Boolean(match.playoffSeriesId) &&
        match.playoffLeg === 1,
    )
    .sort((a, b) => (a.playoffSeedHome ?? 99) - (b.playoffSeedHome ?? 99));

  const uniqueSeries = [
    ...new Map(orderedSeries.map((match) => [match.playoffSeriesId, match])).values(),
  ];

  if (round === 'semifinal' && uniqueSeries.length !== 4) return [];
  if (round === 'final' && uniqueSeries.length !== 2) return [];

  const winners: string[] = [];
  for (const series of uniqueSeries) {
    if (!series.playoffSeriesId) return [];
    winners.push(await getSeriesWinner(series.playoffSeriesId));
  }

  const league = await leagueService.getLeagueById(leagueId);
  if (!league) throw new Error('Liga no encontrada.');

  const format = league.playoffFormat[getFormatKey(round)];
  const generated: Match[] = [];

  if (round === 'semifinal') {
    generated.push(
      ...createSeriesMatches({
        leagueId,
        seasonId,
        round,
        homeTeamId: winners[0],
        awayTeamId: winners[3],
        seedHome: null,
        seedAway: null,
        seriesIndex: 0,
        playoffFormat: format,
      }),
      ...createSeriesMatches({
        leagueId,
        seasonId,
        round,
        homeTeamId: winners[1],
        awayTeamId: winners[2],
        seedHome: null,
        seedAway: null,
        seriesIndex: 1,
        playoffFormat: format,
      }),
    );
  } else {
    generated.push(
      ...createSeriesMatches({
        leagueId,
        seasonId,
        round,
        homeTeamId: winners[0],
        awayTeamId: winners[1],
        seedHome: null,
        seedAway: null,
        seriesIndex: 0,
        playoffFormat: format,
      }),
    );
  }

  const saved = await insertMatches(generated);

  await auditService.log(
    leagueId,
    actorId,
    `${round}_generated`,
    round === 'semifinal'
      ? 'Semifinales generadas automáticamente.'
      : 'Final generada automáticamente.',
  );

  return saved;
}

export async function advancePlayoffRound(
  leagueId: string,
  seasonId: string,
  actorId: string,
): Promise<Match[]> {
  await assertCanManagePlayoffs(leagueId, actorId);

  const matches = await readMatches();

  const quarterfinals = getRoundSeries(matches, 'quarterfinal');
  if (quarterfinals.length > 0) {
    if (!(await areRoundSeriesDecided(quarterfinals))) return [];
    return generateNextRound(
      leagueId,
      seasonId,
      actorId,
      'semifinal',
      'quarterfinal',
    );
  }

  const semifinals = getRoundSeries(matches, 'semifinal');
  if (semifinals.length > 0) {
    if (!(await areRoundSeriesDecided(semifinals))) return [];
    return generateNextRound(
      leagueId,
      seasonId,
      actorId,
      'final',
      'semifinal',
    );
  }

  const finals = getRoundSeries(matches, 'final');
  if (finals.length > 0) {
    if (!(await areRoundSeriesDecided(finals))) return [];

    const season = await seasonService.getActiveSeason(leagueId);
    if (season && season.id === seasonId) {
      await seasonService.finish(season.id);
      await auditService.log(
        leagueId,
        actorId,
        'season_finished',
        'La final terminó. La temporada ha finalizado oficialmente.',
      );
    }
  }

  return [];
}

export const playoffService = {
  generateTop8Playoff,
  advancePlayoffRound,
};