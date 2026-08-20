export function roundRobinRounds(teamIds: string[]): [string, string][][] {
  const teams = [...teamIds];
  const hasBye = teams.length % 2 !== 0;
  if (hasBye) teams.push('BYE');

  const n = teams.length;
  const rounds: [string, string][][] = [];
  const arr = [...teams];

  for (let round = 0; round < n - 1; round++) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const home = arr[i];
      const away = arr[n - 1 - i];
      if (home !== 'BYE' && away !== 'BYE') {
        pairs.push(round % 2 === 0 ? [home, away] : [away, home]);
      }
    }
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop() as string);
  }

  return rounds;
}

export function doubleRoundRobinRounds(teamIds: string[]): [string, string][][] {
  const firstLeg = roundRobinRounds(teamIds);
  const secondLeg = firstLeg.map((pairs) => pairs.map(([home, away]) => [away, home] as [string, string]));
  return [...firstLeg, ...secondLeg];
}
