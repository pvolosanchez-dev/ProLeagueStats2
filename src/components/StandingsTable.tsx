import { Standing, Team } from '@/types';
import { TeamBadge } from './TeamBadge';

interface StandingsTableProps {
  standings: Standing[];
  teams: Team[];
}

export function StandingsTable({ standings, teams }: StandingsTableProps) {
  const teamMap = new Map(teams.map((team) => [team.id, team]));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wider text-neutral-500">
            <th className="py-3 pl-4 pr-2 font-semibold">#</th>
            <th className="px-2 py-3 font-semibold">Equipo</th>
            <th className="px-2 py-3 text-center font-semibold">PJ</th>
            <th className="px-2 py-3 text-center font-semibold">G</th>
            <th className="px-2 py-3 text-center font-semibold">E</th>
            <th className="px-2 py-3 text-center font-semibold">P</th>
            <th className="px-2 py-3 text-center font-semibold">GF</th>
            <th className="px-2 py-3 text-center font-semibold">GC</th>
            <th className="px-2 py-3 text-center font-semibold">DIF</th>
            <th className="px-2 py-3 pr-4 text-center font-semibold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, index) => {
            const team = teamMap.get(row.teamId);
            if (!team) return null;
            const isPromotion = index < 3;
            return (
              <tr
                key={row.teamId}
                className="border-b border-neutral-100 transition-colors hover:bg-neutral-50"
              >
                <td className="py-3 pl-4 pr-2">
                  <div className="flex items-center gap-2">
                    {isPromotion && <span className="h-6 w-1 rounded-full bg-success-500" />}
                    <span className="font-semibold text-neutral-700">{index + 1}</span>
                  </div>
                </td>
                <td className="px-2 py-3">
                  <div className="flex items-center gap-2.5">
                    <TeamBadge name={team.name} shortName={team.shortName} color={team.color} size="sm" />
                    <span className="font-medium text-neutral-900">{team.name}</span>
                  </div>
                </td>
                <td className="px-2 py-3 text-center text-neutral-600">{row.played}</td>
                <td className="px-2 py-3 text-center font-medium text-success-600">{row.won}</td>
                <td className="px-2 py-3 text-center text-neutral-600">{row.drawn}</td>
                <td className="px-2 py-3 text-center font-medium text-error-600">{row.lost}</td>
                <td className="px-2 py-3 text-center text-neutral-600">{row.goalsFor}</td>
                <td className="px-2 py-3 text-center text-neutral-600">{row.goalsAgainst}</td>
                <td className="px-2 py-3 text-center font-medium text-neutral-700">
                  {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                </td>
                <td className="px-2 py-3 pr-4 text-center">
                  <span className="inline-flex min-w-[2rem] justify-center rounded-md bg-primary-50 px-2 py-0.5 font-bold text-primary-700">
                    {row.points}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
