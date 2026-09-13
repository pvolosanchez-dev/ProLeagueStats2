import { Match } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { teamService } from './teamService';
import { leagueService } from './leagueService';
import { seasonService } from './seasonService';
import { memberService } from './memberService';
import { auditService } from './auditService';

function createId(): string { return `match-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
function mapMatch(row: any): Match { return { id: row.id, leagueId: row.league_id, seasonId: row.season_id, round: row.round, date: row.date, venue: row.venue ?? '', homeTeamId: row.home_team_id, awayTeamId: row.away_team_id, homeScore: row.home_score, awayScore: row.away_score, status: row.status, mvpPlayerId: row.mvp_player_id, wentToOvertime: row.went_to_overtime, phase: row.phase, playoffRound: row.playoff_round, playoffSeriesId: row.playoff_series_id, playoffLeg: row.playoff_leg, playoffSeedHome: row.playoff_seed_home, playoffSeedAway: row.playoff_seed_away }; }
function createRegularMatch(leagueId: string, seasonId: string, round: number, homeTeamId: string, awayTeamId: string, offsetDays: number): Match { return { id: createId(), leagueId, seasonId, round, date: new Date(Date.now() + offsetDays * 86400000).toISOString(), venue: '', homeTeamId, awayTeamId, homeScore: null, awayScore: null, status: 'scheduled', mvpPlayerId: null, wentToOvertime: false, phase: 'regular', playoffRound: null, playoffSeriesId: null, playoffLeg: null, playoffSeedHome: null, playoffSeedAway: null }; }
const pairKey = (a: string, b: string) => [a, b].sort().join('::');
type Pair = [string, string];

/**
 * Adds missing pairings to the calendar without moving existing matches.
 * Existing rounds are reused first. This is what makes adding teams later
 * behave like an extension of the current calendar instead of creating a
 * second calendar starting at round 18, 19, 20...
 */
function packMissingPairings(teamIds: string[], existing: Match[], legs: 1 | 2): Match[] {
  const existingPairs = new Set(existing.map((m) => pairKey(m.homeTeamId, m.awayTeamId)));
  const appearances = new Map<string, number>();
  teamIds.forEach((id) => appearances.set(id, 0));
  existing.forEach((m) => {
    appearances.set(m.homeTeamId, (appearances.get(m.homeTeamId) ?? 0) + 1);
    appearances.set(m.awayTeamId, (appearances.get(m.awayTeamId) ?? 0) + 1);
  });

  const missing: Pair[] = [];
  for (let i = 0; i < teamIds.length; i += 1) {
    for (let j = i + 1; j < teamIds.length; j += 1) {
      if (!existingPairs.has(pairKey(teamIds[i], teamIds[j]))) missing.push([teamIds[i], teamIds[j]]);
    }
  }
  if (!missing.length) return [];

  // Teams with fewer existing matches are normally the teams that were just
  // added. Schedule their mutual games first so they occupy an existing round
  // and leave the remaining free slots for their games against old teams.
  missing.sort((a, b) => {
    const scoreA = (appearances.get(a[0]) ?? 0) + (appearances.get(a[1]) ?? 0);
    const scoreB = (appearances.get(b[0]) ?? 0) + (appearances.get(b[1]) ?? 0);
    return scoreA - scoreB;
  });

  const maxExistingRound = existing.reduce((max, match) => Math.max(max, match.round), 0);
  const rounds: Array<Set<string>> = [];
  for (let round = 1; round <= maxExistingRound; round += 1) rounds.push(new Set<string>());
  existing.forEach((match) => {
    while (rounds.length < match.round) rounds.push(new Set<string>());
    if (match.round > 0) {
      rounds[match.round - 1].add(match.homeTeamId);
      rounds[match.round - 1].add(match.awayTeamId);
    }
  });

  const pack = (pairs: Pair[], reverseHome: boolean, startAt: number) => {
    const generated: Match[] = [];
    for (const [a, b] of pairs) {
      let roundIndex = -1;
      for (let i = startAt; i < rounds.length; i += 1) {
        if (!rounds[i].has(a) && !rounds[i].has(b)) { roundIndex = i; break; }
      }
      if (roundIndex === -1) {
        roundIndex = rounds.length;
        rounds.push(new Set<string>());
      }
      rounds[roundIndex].add(a);
      rounds[roundIndex].add(b);
      const round = roundIndex + 1;
      generated.push(createRegularMatch('PLACEHOLDER', 'PLACEHOLDER', round, reverseHome ? b : a, reverseHome ? a : b, (round - 1) * 7));
    }
    return generated;
  };

  const firstLeg = pack(missing, false, 0);
  if (legs === 1) return firstLeg;

  // For an explicit two-leg request, add the reverse fixtures after the first
  // generated leg. Existing matches are never moved or duplicated.
  const secondLegStart = rounds.length;
  return [...firstLeg, ...pack(missing, true, secondLegStart)];
}

async function generateSeasonSchedule(leagueId: string, seasonId: string, actorId: string, legs: 1 | 2 = 1): Promise<Match[]> {
  const league = await leagueService.getLeagueById(leagueId); if (!league) throw new Error('Liga no encontrada.');
  if (league.status === 'paused') throw new Error('La liga está suspendida.');
  const membership = await memberService.getMemberByUser(leagueId, actorId);
  if (!membership || membership.status !== 'active' || membership.role !== 'owner') throw new Error('Solo el dueño de la liga puede generar o ampliar el calendario.');
  const season = await seasonService.getActiveSeason(leagueId);
  if (!season || season.id !== seasonId) throw new Error('La temporada indicada no corresponde a la temporada activa de esta liga.');
  if (season.phase !== 'regular') throw new Error('El calendario de la fase regular solo puede generarse durante la fase regular.');
  const teams = await teamService.getTeamsByLeague(leagueId); if (teams.length < 2) throw new Error('Se necesitan al menos 2 equipos para generar el calendario.');
  const { data: existingRows, error: existingError } = await supabase.from('matches').select('*').eq('league_id', leagueId).eq('season_id', seasonId).eq('phase', 'regular');
  if (existingError) throw existingError;
  const existing = (existingRows ?? []).map(mapMatch); const teamIds = teams.map((team) => team.id);

  if (existing.length === 0) {
    const rotation = [...teamIds]; const bye = `bye-${seasonId}`; if (rotation.length % 2 !== 0) rotation.push(bye);
    const roundsPerLeg = rotation.length - 1; const matchesPerRound = rotation.length / 2; const generated: Match[] = [];
    for (let roundIndex = 0; roundIndex < roundsPerLeg; roundIndex += 1) {
      const round = roundIndex + 1;
      for (let pairIndex = 0; pairIndex < matchesPerRound; pairIndex += 1) {
        const first = rotation[pairIndex]; const second = rotation[rotation.length - 1 - pairIndex]; if (first === bye || second === bye) continue;
        generated.push(createRegularMatch(leagueId, seasonId, round, roundIndex % 2 === 0 ? first : second, roundIndex % 2 === 0 ? second : first, roundIndex * 7));
      }
      const fixed = rotation[0]; const rest = rotation.slice(1); rest.unshift(rest.pop()!); rotation.splice(0, rotation.length, fixed, ...rest);
    }
    if (legs === 2) { const firstLeg = [...generated]; firstLeg.forEach((match) => generated.push({ ...match, id: createId(), round: match.round + roundsPerLeg, date: new Date(Date.now() + (match.round - 1 + roundsPerLeg) * 7 * 86400000).toISOString(), homeTeamId: match.awayTeamId, awayTeamId: match.homeTeamId })); }
    const rows = generated.map((m) => ({ id: m.id, league_id: leagueId, season_id: seasonId, round: m.round, date: m.date, venue: '', home_team_id: m.homeTeamId, away_team_id: m.awayTeamId, home_score: null, away_score: null, status: 'scheduled', mvp_player_id: null, went_to_overtime: false, phase: 'regular', playoff_round: null, playoff_series_id: null, playoff_leg: null, playoff_seed_home: null, playoff_seed_away: null }));
    const { data, error } = await supabase.from('matches').insert(rows).select('*'); if (error) throw error;
    await auditService.log(leagueId, actorId, 'schedule_generated', `Calendario generado: ${generated.length} partidos.`); return (data ?? []).map(mapMatch);
  }

  const missing = packMissingPairings(teamIds, existing, legs).map((m) => ({ ...m, leagueId, seasonId }));
  if (!missing.length) throw new Error('El calendario ya contiene todos los enfrentamientos posibles.');
  const rows = missing.map((m) => ({ id: m.id, league_id: leagueId, season_id: seasonId, round: m.round, date: m.date, venue: '', home_team_id: m.homeTeamId, away_team_id: m.awayTeamId, home_score: null, away_score: null, status: 'scheduled', mvp_player_id: null, went_to_overtime: false, phase: 'regular', playoff_round: null, playoff_series_id: null, playoff_leg: null, playoff_seed_home: null, playoff_seed_away: null }));
  const { data, error } = await supabase.from('matches').insert(rows).select('*'); if (error) throw error;
  await auditService.log(leagueId, actorId, 'schedule_extended', `Calendario ampliado: ${missing.length} nuevos enfrentamientos sin repetir partidos existentes.`);
  return (data ?? []).map(mapMatch);
}

export const scheduleService = { generateSeasonSchedule };
