import { useState, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Trophy,
  CalendarDays,
  Users,
  BarChart3,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useAsync, useAuth } from '@/hooks';
import {
  leagueService,
  teamService,
  matchService,
  memberService,
} from '@/services';
import {
  LoadingState,
  ErrorState,
  StandingsTable,
  MatchCard,
  TeamBadge,
  Modal,
  Spinner,
} from '@/components';
import { calculateStandings } from '@/utils/standings';
import { Match, Team, Role } from '@/types';

type Tab = 'standings' | 'matches' | 'teams';

const ROLE_LABELS: Record<Role, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  captain: 'Capitán',
  player: 'Jugador',
};

export function LeagueDetailPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>('standings');
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  const {
    data: league,
    loading: leagueLoading,
    error: leagueError,
  } = useAsync(
    () => leagueService.getLeagueById(leagueId!),
    [leagueId],
  );

  const {
    data: allTeams,
    loading: teamsLoading,
  } = useAsync(
    () => teamService.getTeams(),
    [],
  );

  const {
    data: allMatches,
    loading: matchesLoading,
  } = useAsync(
    () => matchService.getMatches(),
    [],
  );

  const {
    data: membership,
    loading: membershipLoading,
  } = useAsync(
    () =>
      leagueId && user
        ? memberService.getMemberByUser(leagueId, user.id)
        : Promise.resolve(null),
    [leagueId, user?.id],
  );

  if (
    leagueLoading ||
    teamsLoading ||
    matchesLoading ||
    membershipLoading
  ) {
    return <LoadingState />;
  }

  if (leagueError) {
    return <ErrorState message={leagueError} />;
  }

  if (!league) {
    return <ErrorState message="Liga no encontrada" />;
  }

  const teams =
    allTeams?.filter((t) => t.leagueId === league.id) ?? [];

  const matches =
    allMatches?.filter((m) => m.leagueId === league.id) ?? [];

  const standings = calculateStandings(
    teams.map((t) => t.id),
    matches,
  );

  const currentRole: Role | null =
    membership?.status === 'active'
      ? membership.role
      : null;

  const isOwner = currentRole === 'owner';
  const isAdmin =
    currentRole === 'owner' ||
    currentRole === 'admin';

  const tabs: {
    id: Tab;
    label: string;
    icon: typeof Trophy;
  }[] = [
    {
      id: 'standings',
      label: 'Tabla',
      icon: BarChart3,
    },
    {
      id: 'matches',
      label: 'Partidos',
      icon: CalendarDays,
    },
    {
      id: 'teams',
      label: 'Equipos',
      icon: Users,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      <button
        type="button"
        onClick={() => navigate('/dashboard/leagues')}
        className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
      >
        <ArrowLeft size={16} />
        Volver a ligas
      </button>

      {/* League header */}
      <div className="card overflow-hidden">
        <div
          className="h-3"
          style={{ backgroundColor: league.color }}
        />

        <div className="flex items-start gap-4 p-6">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl"
            style={{ backgroundColor: league.color }}
          >
            {league.logoUrl ? (
              <img
                src={league.logoUrl}
                alt={league.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Trophy
                size={30}
                className="text-white"
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">
                  {league.name}
                </h1>

                <p className="text-sm text-neutral-500">
                  {league.sport}
                </p>

                <p className="mt-2 text-sm text-neutral-600">
                  {league.description}
                </p>
              </div>

              {/* Rol dentro de ESTA liga */}
              {currentRole && (
                <div
                  className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
                    isOwner
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : isAdmin
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-600'
                  }`}
                >
                  {isOwner ? (
                    <ShieldCheck size={16} />
                  ) : (
                    <User size={16} />
                  )}

                  {ROLE_LABELS[currentRole]}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Información adicional de propietario */}
        {isAdmin && (
          <div className="border-t border-neutral-200 bg-neutral-50 px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-neutral-900">
                  Gestión de la liga
                </p>

                <p className="text-xs text-neutral-500">
                  Tienes permisos de administración en esta competición.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTab('teams')}
                className="btn-secondary"
              >
                <Users size={16} />
                Gestionar equipos
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-t border-neutral-200 px-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      {tab === 'standings' && (
        <div className="card overflow-hidden">
          <StandingsTable
            standings={standings}
            teams={teams}
          />
        </div>
      )}

      {/* Partidos */}
      {tab === 'matches' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              teams={teams}
              onEditScore={(m) => {
                if (!isAdmin) return;
                setEditingMatch(m);
              }}
            />
          ))}

          {matches.length === 0 && (
            <div className="card p-8 text-center sm:col-span-2">
              <CalendarDays
                size={32}
                className="mx-auto text-neutral-300"
              />

              <p className="mt-3 text-sm text-neutral-500">
                Todavía no hay partidos registrados.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Equipos */}
      {tab === 'teams' && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="card border-primary-100 bg-primary-50 p-4">
              <div className="flex items-center gap-3">
                <Users
                  size={20}
                  className="text-primary-600"
                />

                <div>
                  <p className="text-sm font-semibold text-neutral-900">
                    Administración de equipos
                  </p>

                  <p className="text-xs text-neutral-600">
                    Tu cuenta tiene permisos para gestionar los equipos de
                    esta liga.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() =>
                  navigate(`/dashboard/teams/${team.id}`)
                }
                className="card p-5 text-left transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <TeamBadge
                    name={team.name}
                    shortName={team.shortName}
                    color={team.color}
                    size="lg"
                  />

                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-neutral-900">
                      {team.name}
                    </h3>

                    <p className="text-sm text-neutral-500">
                      {team.city}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {teams.length === 0 && (
            <div className="card p-8 text-center">
              <Users
                size={34}
                className="mx-auto text-neutral-300"
              />

              <h3 className="mt-3 font-semibold text-neutral-900">
                Esta liga todavía no tiene equipos
              </h3>

              <p className="mt-1 text-sm text-neutral-500">
                El siguiente paso será permitir que el propietario o
                administrador cree el primer equipo.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Editar resultado */}
      {editingMatch && isAdmin && (
        <ScoreEditModal
          match={editingMatch}
          teams={teams}
          onClose={() => setEditingMatch(null)}
          onSaved={() => {
            setEditingMatch(null);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

function ScoreEditModal({
  match,
  teams,
  onClose,
  onSaved,
}: {
  match: Match;
  teams: Team[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const home = teams.find(
    (t) => t.id === match.homeTeamId,
  );

  const away = teams.find(
    (t) => t.id === match.awayTeamId,
  );

  const [homeScore, setHomeScore] = useState(
    match.homeScore?.toString() ?? '0',
  );

  const [awayScore, setAwayScore] = useState(
    match.awayScore?.toString() ?? '0',
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    setError(null);

    try {
      const { matchService } = await import('@/services');

      await matchService.updateScore({
        matchId: match.id,
        homeScore: parseInt(homeScore, 10),
        awayScore: parseInt(awayScore, 10),
      });

      onSaved();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al guardar resultado.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Registrar resultado"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={(event) => {
              void handleSubmit(
                event as unknown as FormEvent,
              );
            }}
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? <Spinner /> : 'Guardar'}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-around gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          {home && (
            <TeamBadge
              name={home.name}
              shortName={home.shortName}
              color={home.color}
              size="lg"
            />
          )}

          <span className="text-sm font-medium text-neutral-700">
            {home?.shortName}
          </span>

          <input
            type="number"
            min={0}
            max={20}
            value={homeScore}
            onChange={(e) =>
              setHomeScore(e.target.value)
            }
            className="input w-20 text-center text-2xl font-bold"
          />
        </div>

        <span className="text-xl font-bold text-neutral-300">
          vs
        </span>

        <div className="flex flex-col items-center gap-2">
          {away && (
            <TeamBadge
              name={away.name}
              shortName={away.shortName}
              color={away.color}
              size="lg"
            />
          )}

          <span className="text-sm font-medium text-neutral-700">
            {away?.shortName}
          </span>

          <input
            type="number"
            min={0}
            max={20}
            value={awayScore}
            onChange={(e) =>
              setAwayScore(e.target.value)
            }
            className="input w-20 text-center text-2xl font-bold"
          />
        </div>
      </div>
    </Modal>
  );
}