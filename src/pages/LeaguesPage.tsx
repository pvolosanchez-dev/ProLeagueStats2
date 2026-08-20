import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, ArrowRight, Plus, UserPlus, Search } from 'lucide-react';
import { useAsync, useAuth } from '@/hooks';
import {
  leagueService,
  teamService,
  matchService,
  memberService,
} from '@/services';
import { LoadingState, ErrorState } from '@/components';

export function LeaguesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    data: leagues,
    loading,
    error,
  } = useAsync(() => leagueService.getLeagues(), []);

  const { data: teams } = useAsync(() => teamService.getTeams(), []);
  const { data: matches } = useAsync(() => matchService.getMatches(), []);

  const [inviteCode, setInviteCode] = useState('');
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const handleFindLeague = async (event: FormEvent) => {
    event.preventDefault();

    setJoinMessage(null);
    setJoinError(null);

    const code = inviteCode.trim().toUpperCase();

    if (!user) {
      setJoinError('Debes iniciar sesión.');
      return;
    }

    if (!code) {
      setJoinError('Escribe un código de invitación.');
      return;
    }

    try {
      setSearching(true);

      const league = await leagueService.getLeagueByInviteCode(code);

      if (!league) {
        setJoinError('No encontramos ninguna liga con ese código.');
        return;
      }

      const membership = await memberService.getMemberByUser(
        league.id,
        user.id,
      );

      if (membership?.status === 'active') {
        navigate(`/dashboard/leagues/${league.id}`);
        return;
      }

      setJoinMessage(
        `Liga encontrada: ${league.name}. El sistema de solicitudes se conectará en el siguiente paso.`,
      );
    } catch (err) {
      setJoinError(
        err instanceof Error
          ? err.message
          : 'No se pudo buscar la liga.',
      );
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Ligas</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Administra tus competiciones y únete a nuevas ligas.
          </p>
        </div>

        <Link
          to="/dashboard/leagues/create"
          className="btn-primary inline-flex items-center justify-center gap-2"
        >
          <Plus size={17} />
          Crear liga
        </Link>
      </div>

      <section className="card p-5">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus size={18} className="text-primary-600" />
          <div>
            <h2 className="font-semibold text-neutral-900">
              Unirse a una liga
            </h2>
            <p className="text-sm text-neutral-500">
              Introduce el código de invitación de la liga.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleFindLeague}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />

            <input
              className="input pl-10 uppercase"
              value={inviteCode}
              onChange={(event) =>
                setInviteCode(
                  event.target.value
                    .toUpperCase()
                    .replace(/\s/g, ''),
                )
              }
              placeholder="Ej. ABC123"
              maxLength={12}
            />
          </div>

          <button
            type="submit"
            className="btn-secondary"
            disabled={searching}
          >
            {searching ? 'Buscando...' : 'Buscar liga'}
          </button>
        </form>

        {joinError && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {joinError}
          </div>
        )}

        {joinMessage && (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {joinMessage}
          </div>
        )}
      </section>

      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            Ligas disponibles
          </h2>
          <p className="text-sm text-neutral-500">
            Selecciona una competición para ver sus detalles.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {leagues?.map((league) => {
            const leagueTeams =
              teams?.filter((t) => t.leagueId === league.id) ?? [];

            const leagueMatches =
              matches?.filter((m) => m.leagueId === league.id) ?? [];

            const played = leagueMatches.filter(
              (m) => m.status === 'finished',
            ).length;

            const total = leagueMatches.length;

            return (
              <Link
                key={league.id}
                to={`/dashboard/leagues/${league.id}`}
                className="card overflow-hidden transition-shadow hover:shadow-md"
              >
                <div
                  className="h-2"
                  style={{ backgroundColor: league.color }}
                />

                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-lg"
                      style={{ backgroundColor: league.color }}
                    >
                      {league.logoUrl ? (
                        <img
                          src={league.logoUrl}
                          alt={league.name}
                          className="h-full w-full rounded-lg object-cover"
                        />
                      ) : (
                        <Trophy
                          size={22}
                          className="text-white"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-neutral-900">
                        {league.name}
                      </h3>

                      <p className="text-sm text-neutral-500">
                        {league.sport}
                      </p>

                      <p className="mt-1 text-xs text-neutral-400">
                        Código: {league.inviteCode}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm text-neutral-600">
                    {league.description}
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3">
                    <div className="flex gap-4 text-sm text-neutral-500">
                      <span>{leagueTeams.length} equipos</span>
                      <span>·</span>
                      <span>
                        {played}/{total} partidos
                      </span>
                    </div>

                    <ArrowRight
                      size={16}
                      className="text-neutral-400"
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {leagues?.length === 0 && (
        <div className="card p-10 text-center">
          <Trophy
            size={36}
            className="mx-auto text-neutral-300"
          />

          <h3 className="mt-3 font-semibold text-neutral-900">
            Todavía no tienes ligas
          </h3>

          <p className="mt-1 text-sm text-neutral-500">
            Crea tu primera competición o únete mediante un código.
          </p>

          <Link
            to="/dashboard/leagues/create"
            className="btn-primary mt-5 inline-flex"
          >
            Crear mi primera liga
          </Link>
        </div>
      )}
    </div>
  );
}