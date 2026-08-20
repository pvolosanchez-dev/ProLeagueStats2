import { Player, Team } from '@/types';
import { AwardCandidate, AwardType, AWARD_LABELS } from '@/types';

const POINT_VALUES = {
  goal: 4,
  assist: 3,
  champion: 10,
  runnerUp: 5,
  semifinalist: 2,
  quarterfinalist: 1,
  mvp: 5,
};

function calculateBallonDorPoints(player: Player): { total: number; breakdown: { label: string; points: number }[] } {
  const goalPoints = player.stats.goals * POINT_VALUES.goal;
  const assistPoints = player.stats.assists * POINT_VALUES.assist;
  const mvpPoints = player.stats.mvpAwards * POINT_VALUES.mvp;
  const total = goalPoints + assistPoints + mvpPoints;
  return {
    total,
    breakdown: [
      { label: `Goles (${player.stats.goals} × ${POINT_VALUES.goal})`, points: goalPoints },
      { label: `Asistencias (${player.stats.assists} × ${POINT_VALUES.assist})`, points: assistPoints },
      { label: `MVP (${player.stats.mvpAwards} × ${POINT_VALUES.mvp})`, points: mvpPoints },
    ],
  };
}

function buildCandidates(players: Player[], teams: Team[], award: AwardType): AwardCandidate[] {
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  let sorted: Player[];
  if (award === 'top_scorer') {
    sorted = [...players].sort((a, b) => b.stats.goals - a.stats.goals);
  } else if (award === 'top_assister') {
    sorted = [...players].sort((a, b) => b.stats.assists - a.stats.assists);
  } else if (award === 'best_goalkeeper') {
    sorted = [...players].filter((p) => p.position === 'Portero').sort((a, b) => b.stats.mvpAwards - a.stats.mvpAwards);
  } else {
    sorted = [...players].sort((a, b) => {
      const ap = calculateBallonDorPoints(a).total;
      const bp = calculateBallonDorPoints(b).total;
      return bp - ap;
    });
  }

  return sorted.slice(0, 15).map((player, index) => {
    const team = teamMap.get(player.teamId);
    const { total, breakdown } = calculateBallonDorPoints(player);
    return {
      playerId: player.id,
      playerName: player.name,
      teamId: player.teamId,
      teamName: team?.name ?? '',
      teamColor: team?.color ?? '#64748b',
      goals: player.stats.goals,
      assists: player.stats.assists,
      mvpAwards: player.stats.mvpAwards,
      performancePoints: total,
      pointBreakdown: breakdown,
      rank: index + 1,
    };
  });
}

async function getAwardCandidates(
  players: Player[],
  teams: Team[],
  award: AwardType,
): Promise<AwardCandidate[]> {
  return buildCandidates(players, teams, award);
}

export const awardService = {
  getAwardCandidates,
  calculateBallonDorPoints,
  POINT_VALUES,
  AWARD_LABELS,
};
