import { Link } from 'react-router-dom';
import { Trophy, Users, CalendarDays, TrendingUp, ArrowRight } from 'lucide-react';
import { useAuth, useAsync } from '@/hooks';
import { leagueService, teamService, matchService } from '@/services';
import { LoadingState, ErrorState, TeamBadge } from '@/components';
import { calculateStandings } from '@/utils/standings';
import { formatDate } from '@/utils/date';

export function DashboardPage() {
  const { user } = useAuth();
  const { data: leagues, loading: leaguesLoading, error: leaguesError } = useAsync(() => leagueService.getLeagues(), []);
  const { data: teams, loading: teamsLoading, error: teamsError } = useAsync(() => teamService.getTeams(), []);
  const { data: matches, loading: matchesLoading, error: matchesError } = useAsync(() => matchService.getMatches(), []);

  if (leaguesLoading || teamsLoading || matchesLoading) return <LoadingState />;
  if (leaguesError || teamsError || matchesError)
    return <ErrorState message={leaguesError || teamsError || matchesError || 'Error'} />;

  const finishedMatches = matches?.filter((m) => m.status === 'finished') ?? [];
  const scheduledMatches = matches?.filter((m) => m.status === 'scheduled') ?? [];
  const upcomingMatches = scheduledMatches.slice(0, 4);

  const firstLeague = leagues?.[0];
  const firstLeagueTeams = teams?.filter((t) => t.leagueId === firstLeague?.id) ?? [];
  const firstLeagueMatches = matches?.filter((m) => m.leagueId === firstLeague?.id) ?? [];
  const standings = firstLeague ? calculateStandings(firstLeagueTeams.map((t) => t.id), firstLeagueMatches) : [];
  const teamMap = new Map(teams?.map((t) => [t.id, t]));

  const stats = [
    { label: 'Ligas activas', value: leagues?.length ?? 0, icon: Trophy, color: 'text-primary-600 bg-primary-50' },
    { label: 'Equipos', value: teams?.length ?? 0, icon: Users, color: 'text-secondary-600 bg-secondary-50' },
    { label: 'Partidos jugados', value: finishedMatches.length, icon: CalendarDays, color: 'text-success-600 bg-success-50' },
    { label: 'Próximos partidos', value: scheduledMatches.length, icon: TrendingUp, color: 'text-accent-600 bg-accent-50' },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Hola, {user?.name}</h1>
        <p className="mt-1 text-sm text-neutral-500">Resumen general de tus competiciones</p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5">
            <div className={`mb-3 inline-flex rounded-lg p-2.5 ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
            <p className="text-sm text-neutral-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top 5 standings */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Tabla de posiciones</h2>
              <p className="text-sm text-neutral-500">{firstLeague?.name}</p>
            </div>
            <Link to="/dashboard/leagues" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
              Ver todo
            </Link>
          </div>
          <div className="space-y-2">
            {standings.slice(0, 5).map((row, index) => {
              const team = teamMap.get(row.teamId);
              if (!team) return null;
              return (
                <div key={row.teamId} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-neutral-50">
                  <span className="w-6 text-center text-sm font-semibold text-neutral-400">{index + 1}</span>
                  <TeamBadge name={team.name} shortName={team.shortName} color={team.color} size="sm" />
                  <span className="flex-1 truncate text-sm font-medium text-neutral-900">{team.name}</span>
                  <span className="text-sm font-bold text-primary-700">{row.points} pts</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming matches */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">Próximos partidos</h2>
            <Link to="/dashboard/leagues" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
              Ver calendario
            </Link>
          </div>
          {upcomingMatches.length > 0 ? (
            <div className="space-y-3">
              {upcomingMatches.map((match) => {
                const home = teamMap.get(match.homeTeamId);
                const away = teamMap.get(match.awayTeamId);
                if (!home || !away) return null;
                return (
                  <div key={match.id} className="flex items-center justify-between rounded-lg border border-neutral-100 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <TeamBadge name={home.name} shortName={home.shortName} color={home.color} size="sm" />
                      <span className="text-sm font-medium text-neutral-700">{home.shortName}</span>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-neutral-400">J{match.round}</p>
                      <p className="text-xs font-medium text-neutral-500">{formatDate(match.date)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-700">{away.shortName}</span>
                      <TeamBadge name={away.name} shortName={away.shortName} color={away.color} size="sm" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-neutral-400">No hay partidos programados</p>
          )}
        </div>
      </div>

      {/* Leagues overview */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Ligas</h2>
          <Link to="/dashboard/leagues" className="flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700">
            Ver todas <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {leagues?.map((league) => {
            const leagueTeams = teams?.filter((t) => t.leagueId === league.id) ?? [];
            const leagueMatches = matches?.filter((m) => m.leagueId === league.id) ?? [];
            const played = leagueMatches.filter((m) => m.status === 'finished').length;
            return (
              <Link
                key={league.id}
                to={`/dashboard/leagues/${league.id}`}
                className="card p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-lg"
                    style={{ backgroundColor: league.color }}
                  >
                    <Trophy size={22} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900">{league.name}</h3>
                    <p className="text-sm text-neutral-500">{league.season}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-4 text-sm text-neutral-500">
                  <span>{leagueTeams.length} equipos</span>
                  <span>·</span>
                  <span>{played} partidos jugados</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
