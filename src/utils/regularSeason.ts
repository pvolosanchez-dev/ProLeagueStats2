import { Match } from '@/types';

function getMatchupKey(
  teamAId: string,
  teamBId: string,
): string {
  return [teamAId, teamBId]
    .sort()
    .join('::');
}

export function isRegularSeasonComplete(
  teamIds: string[],
  matches: Match[],
): boolean {
  const uniqueTeams = [
    ...new Set(teamIds),
  ];

  if (uniqueTeams.length < 2) {
    return false;
  }

  const expectedMatchups =
    new Set<string>();

  for (
    let i = 0;
    i < uniqueTeams.length;
    i++
  ) {
    for (
      let j = i + 1;
      j < uniqueTeams.length;
      j++
    ) {
      expectedMatchups.add(
        getMatchupKey(
          uniqueTeams[i],
          uniqueTeams[j],
        ),
      );
    }
  }

  const completedMatchups =
    new Set<string>();

  matches
    .filter(
      (match) =>
        match.status === 'finished' &&
        match.homeScore !== null &&
        match.awayScore !== null &&
        uniqueTeams.includes(
          match.homeTeamId,
        ) &&
        uniqueTeams.includes(
          match.awayTeamId,
        ),
    )
    .forEach((match) => {
      completedMatchups.add(
        getMatchupKey(
          match.homeTeamId,
          match.awayTeamId,
        ),
      );
    });

  return (
    completedMatchups.size >=
    expectedMatchups.size
  );
}

export function getRegularSeasonProgress(
  teamIds: string[],
  matches: Match[],
): {
  completed: boolean;
  completedMatchups: number;
  totalMatchups: number;
  remainingMatchups: number;
} {
  const uniqueTeams = [
    ...new Set(teamIds),
  ];

  const totalMatchups =
    uniqueTeams.length >= 2
      ? (uniqueTeams.length *
          (uniqueTeams.length - 1)) /
        2
      : 0;

  const completedMatchups =
    new Set<string>();

  matches
    .filter(
      (match) =>
        match.status === 'finished' &&
        match.homeScore !== null &&
        match.awayScore !== null &&
        uniqueTeams.includes(
          match.homeTeamId,
        ) &&
        uniqueTeams.includes(
          match.awayTeamId,
        ),
    )
    .forEach((match) => {
      completedMatchups.add(
        getMatchupKey(
          match.homeTeamId,
          match.awayTeamId,
        ),
      );
    });

  const completed =
    totalMatchups > 0 &&
    completedMatchups.size >=
      totalMatchups;

  return {
    completed,
    completedMatchups:
      completedMatchups.size,
    totalMatchups,
    remainingMatchups: Math.max(
      0,
      totalMatchups -
        completedMatchups.size,
    ),
  };
}