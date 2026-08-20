import { Link } from 'react-router-dom';
import { Trophy, ArrowRight } from 'lucide-react';
import { useAsync } from '@/hooks';
import { leagueService, teamService, matchService } from '@/services';
import { LoadingState, ErrorState } from '@/components';

export function LeaguesPage() {
  const { data: leagues, loading, error } = useAsync(() => leagueService.getLeagues(), []);
  const { data: teams } = useAsync(() => teamService.getTeams(), []);
  const { data: matches } = useAsync(() => matchService.getMatches(), []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Ligas</h1>
        <p className="mt-1 text-sm text-neutral-500">Selecciona una competición para ver detalles</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {leagues?.map((league) => {
          const leagueTeams = teams?.filter((t) => t.leagueId === league.id) ?? [];
          const leagueMatches = matches?.filter((m) => m.leagueId === league.id) ?? [];
          const played = leagueMatches.filter((m) => m.status === 'finished').length;
          const total = leagueMatches.length;

          return (
            <Link
              key={league.id}
              to={`/dashboard/leagues/${league.id}`}
              className="card overflow-hidden transition-shadow hover:shadow-md"
            >
              <div className="h-2" style={{ backgroundColor: league.color }} />
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-lg"
                    style={{ backgroundColor: league.color }}
                  >
                    <Trophy size={22} className="text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-neutral-900">{league.name}</h3>
                    <p className="text-sm text-neutral-500">{league.season}</p>
                  </div>
                </div>

                <p className="mt-3 text-sm text-neutral-600 line-clamp-2">{league.description}</p>

                <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3">
                  <div className="flex gap-4 text-sm text-neutral-500">
                    <span>{leagueTeams.length} equipos</span>
                    <span>·</span>
                    <span>{played}/{total} partidos</span>
                  </div>
                  <ArrowRight size={16} className="text-neutral-400" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
