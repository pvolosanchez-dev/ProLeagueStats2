import { Match, Team } from '@/types';
import { TeamBadge } from './TeamBadge';
import { formatDateTime } from '@/utils/date';

interface MatchCardProps {
  match: Match;
  teams: Team[];
  onEditScore?: (match: Match) => void;
}

export function MatchCard({
  match,
  teams,
  onEditScore,
}: MatchCardProps) {
  const homeTeam = teams.find(
    (team) => team.id === match.homeTeamId,
  );

  const awayTeam = teams.find(
    (team) => team.id === match.awayTeamId,
  );

  if (!homeTeam || !awayTeam) {
    return null;
  }

  const isFinished =
    match.status === 'finished';

  return (
    <div className="card p-4 transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-center justify-between text-xs text-neutral-500">
        <span className="badge bg-neutral-100 text-neutral-600">
          Jornada {match.round}
        </span>

        <span className="font-medium">
          {formatDateTime(match.date)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <TeamBadge
            name={homeTeam.name}
            shortName={homeTeam.shortName}
            color={homeTeam.color}
            size="sm"
          />

          <span className="truncate text-sm font-medium text-neutral-900">
            {homeTeam.name}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isFinished ? (
            <span className="rounded-md bg-neutral-100 px-3 py-1 text-base font-bold text-neutral-900">
              {match.homeScore} - {match.awayScore}
            </span>
          ) : (
            <span className="text-xs font-medium text-neutral-400">
              vs
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5">
          <span className="truncate text-right text-sm font-medium text-neutral-900">
            {awayTeam.name}
          </span>

          <TeamBadge
            name={awayTeam.name}
            shortName={awayTeam.shortName}
            color={awayTeam.color}
            size="sm"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end border-t border-neutral-100 pt-3">
        {isFinished ? (
          <span className="badge bg-success-100 text-success-700">
            Finalizado
          </span>
        ) : onEditScore ? (
          <button
            type="button"
            onClick={() => onEditScore(match)}
            className="text-xs font-semibold text-primary-600 hover:text-primary-700"
          >
            Registrar resultado
          </button>
        ) : (
          <span className="badge bg-warning-100 text-warning-700">
            Programado
          </span>
        )}
      </div>
    </div>
  );
}