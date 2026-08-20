import { Match, Standing } from '@/types';

export function calculateStandings(teamIds: string[], matches: Match[]): Standing[] {
  const table = new Map<string, Standing>();

  teamIds.forEach((teamId) => {
    table.set(teamId, {
      teamId,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  });

  matches
    .filter((match) => match.status === 'finished' && match.homeScore !== null && match.awayScore !== null)
    .forEach((match) => {
      const home = table.get(match.homeTeamId);
      const away = table.get(match.awayTeamId);
      if (!home || !away) return;

      const homeScore = match.homeScore as number;
      const awayScore = match.awayScore as number;

      home.played += 1;
      away.played += 1;
      home.goalsFor += homeScore;
      home.goalsAgainst += awayScore;
      away.goalsFor += awayScore;
      away.goalsAgainst += homeScore;

      if (homeScore > awayScore) {
        home.won += 1;
        home.points += 3;
        away.lost += 1;
      } else if (homeScore < awayScore) {
        away.won += 1;
        away.points += 3;
        home.lost += 1;
      } else {
        home.drawn += 1;
        away.drawn += 1;
        home.points += 1;
        away.points += 1;
      }
    });

  const standings = Array.from(table.values()).map((row) => ({
    ...row,
    goalDifference: row.goalsFor - row.goalsAgainst,
  }));

  return standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
}
