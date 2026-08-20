import { Match, Player, Standing, Team } from '@/types';
import { calculateStandings } from '@/utils/standings';

async function getStandings(teams: Team[], matches: Match[]): Promise<Standing[]> {
  return calculateStandings(teams.map((t) => t.id), matches);
}

interface ScorerStat {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  teamColor: string;
  goals: number;
}

async function getTopScorers(players: Player[], teams: Team[], limit = 15): Promise<ScorerStat[]> {
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  return [...players]
    .sort((a, b) => b.stats.goals - a.stats.goals)
    .slice(0, limit)
    .map((p) => {
      const team = teamMap.get(p.teamId);
      return {
        playerId: p.id,
        playerName: p.name,
        teamId: p.teamId,
        teamName: team?.name ?? '',
        teamColor: team?.color ?? '#64748b',
        goals: p.stats.goals,
      };
    });
}

interface AssisterStat {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  teamColor: string;
  assists: number;
}

async function getTopAssisters(players: Player[], teams: Team[], limit = 15): Promise<AssisterStat[]> {
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  return [...players]
    .sort((a, b) => b.stats.assists - a.stats.assists)
    .slice(0, limit)
    .map((p) => {
      const team = teamMap.get(p.teamId);
      return {
        playerId: p.id,
        playerName: p.name,
        teamId: p.teamId,
        teamName: team?.name ?? '',
        teamColor: team?.color ?? '#64748b',
        assists: p.stats.assists,
      };
    });
}

interface MvpStat {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  teamColor: string;
  mvpAwards: number;
}

async function getMvpRanking(players: Player[], teams: Team[], limit = 15): Promise<MvpStat[]> {
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  return [...players]
    .sort((a, b) => b.stats.mvpAwards - a.stats.mvpAwards)
    .slice(0, limit)
    .map((p) => {
      const team = teamMap.get(p.teamId);
      return {
        playerId: p.id,
        playerName: p.name,
        teamId: p.teamId,
        teamName: team?.name ?? '',
        teamColor: team?.color ?? '#64748b',
        mvpAwards: p.stats.mvpAwards,
      };
    });
}

interface TeamPerformance {
  teamId: string;
  teamName: string;
  teamColor: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

async function getTeamPerformance(teams: Team[], matches: Match[]): Promise<TeamPerformance[]> {
  const standings = calculateStandings(teams.map((t) => t.id), matches);
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  return standings.map((s) => {
    const team = teamMap.get(s.teamId);
    return {
      teamId: s.teamId,
      teamName: team?.name ?? '',
      teamColor: team?.color ?? '#64748b',
      played: s.played,
      won: s.won,
      drawn: s.drawn,
      lost: s.lost,
      goalsFor: s.goalsFor,
      goalsAgainst: s.goalsAgainst,
      points: s.points,
    };
  });
}

export const statsService = {
  getStandings,
  getTopScorers,
  getTopAssisters,
  getMvpRanking,
  getTeamPerformance,
};
