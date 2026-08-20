import { Match } from '@/types';
import { doubleRoundRobinRounds } from '@/utils/roundRobin';
import { addDays, isPast } from '@/utils/date';
import { createSeededRandom, randomInt, hashStringToSeed } from '@/utils/random';
import { seedTeams } from './seedTeams';

function buildLeagueMatches(leagueId: string, seasonId: string, teamIds: string[], startDate: string): Match[] {
  const rounds = doubleRoundRobinRounds(teamIds);
  const teamsById = new Map(seedTeams.map((team) => [team.id, team]));
  const matches: Match[] = [];

  rounds.forEach((pairs, roundIndex) => {
    const roundDate = addDays(startDate, roundIndex * 7);
    const finished = isPast(roundDate);

    pairs.forEach(([homeTeamId, awayTeamId], matchIndex) => {
      const matchId = `match-${leagueId}-r${roundIndex + 1}-${matchIndex + 1}`;
      const rand = createSeededRandom(hashStringToSeed(matchId));
      const homeTeam = teamsById.get(homeTeamId);

      matches.push({
        id: matchId,
        leagueId,
        seasonId,
        round: roundIndex + 1,
        date: roundDate,
        venue: homeTeam ? `Estadio ${homeTeam.city}` : 'Estadio Municipal',
        homeTeamId,
        awayTeamId,
        homeScore: finished ? randomInt(rand, 0, 4) : null,
        awayScore: finished ? randomInt(rand, 0, 4) : null,
        status: finished ? 'finished' : 'scheduled',
        mvpPlayerId: null,
      });
    });
  });

  return matches;
}

const eliteTeamIds = seedTeams.filter((team) => team.leagueId === 'league-elite').map((team) => team.id);
const regionalTeamIds = seedTeams.filter((team) => team.leagueId === 'league-regional').map((team) => team.id);

export const seedMatches: Match[] = [
  ...buildLeagueMatches('league-elite', 'season-elite-1', eliteTeamIds, '2026-07-13T18:00:00.000Z'),
  ...buildLeagueMatches('league-regional', 'season-regional-1', regionalTeamIds, '2026-07-20T17:00:00.000Z'),
];
