import { Player } from '@/types';
import { TeamBadge } from './TeamBadge';
import { Team } from '@/types';

interface PlayerCardProps {
  player: Player;
  team?: Team;
}

const positionColors: Record<string, string> = {
  Portero: 'bg-warning-100 text-warning-700',
  Defensa: 'bg-secondary-100 text-secondary-700',
  Mediocampista: 'bg-primary-100 text-primary-700',
  Delantero: 'bg-error-100 text-error-700',
};

export function PlayerCard({ player, team }: PlayerCardProps) {
  return (
    <div className="card p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        {team && (
          <TeamBadge name={team.name} shortName={team.shortName} color={team.color} size="md" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-neutral-300">#{player.jerseyNumber}</span>
            <h4 className="truncate text-sm font-semibold text-neutral-900">{player.name}</h4>
          </div>
          <span className={`badge mt-1 ${positionColors[player.position]}`}>{player.position}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-neutral-50 py-2">
          <p className="text-lg font-bold text-neutral-900">{player.stats.goals}</p>
          <p className="text-xs text-neutral-500">Goles</p>
        </div>
        <div className="rounded-lg bg-neutral-50 py-2">
          <p className="text-lg font-bold text-neutral-900">{player.stats.assists}</p>
          <p className="text-xs text-neutral-500">Asistencias</p>
        </div>
        <div className="rounded-lg bg-neutral-50 py-2">
          <p className="text-lg font-bold text-neutral-900">{player.stats.gamesPlayed}</p>
          <p className="text-xs text-neutral-500">Partidos</p>
        </div>
      </div>
    </div>
  );
}
