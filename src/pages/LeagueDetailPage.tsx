import { useEffect, useState, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Trophy,
  CalendarDays,
  Users,
  BarChart3,
  ShieldCheck,
  User,
  Settings,
  WandSparkles,
  Award,
} from 'lucide-react';
import { useAsync, useAuth } from '@/hooks';
import {
  leagueService,
  teamService,
  matchService,
  memberService,
  authService,
  joinRequestService,
  playerService,
  matchPlayerStatsService,
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
import { Match, Team, Role, Position } from '@/types';
import { SchedulePage } from './SchedulePage';

type Tab =
  | 'standings'
  | 'matches'
  | 'teams'
  | 'awards'
  | 'schedule-generator'
  | 'admin';

const ROLE_LABELS: Record<Role, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  captain: 'Capitán',
  player: 'Jugador',
};

export function LeagueDetailPage() {
  const { leagueId } =
    useParams<{ leagueId: string }>();

  const navigate = useNavigate();
  const { user } = useAuth();

  const [tab, setTab] =
    useState<Tab>('standings');

  const [editingMatch, setEditingMatch] =
    useState<Match | null>(null);

  const [showCreateTeam, setShowCreateTeam] =
    useState(false);

  const [showCreateMatch, setShowCreateMatch] =
    useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] =
    useState(false);

  const [leagueActionLoading, setLeagueActionLoading] =
    useState(false);

  const [assigningMember, setAssigningMember] =
    useState<{
      userId: string;
      teamId: string;
    } | null>(null);

  const {
    data: league,
    loading: leagueLoading,
    error: leagueError,
  } = useAsync(
    () =>
      leagueService.getLeagueById(
        leagueId!,
      ),
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
        ? memberService.getMemberByUser(
            leagueId,
            user.id,
          )
        : Promise.resolve(null),
    [leagueId, user?.id],
  );

  const {
    data: leagueMembers,
    loading: leagueMembersLoading,
  } = useAsync(
    () =>
      leagueId
        ? memberService.getMembersByLeague(
            leagueId,
          )
        : Promise.resolve([]),
    [leagueId],
  );

  const {
    data: leagueUsers,
    loading: leagueUsersLoading,
  } = useAsync(
    () =>
      leagueMembers &&
      leagueMembers.length > 0
        ? authService.getUsersByIds(
            leagueMembers.map(
              (member) =>
                member.userId,
            ),
          )
        : Promise.resolve([]),
    [leagueMembers],
  );

  const {
    data: leagueRequests,
    loading: leagueRequestsLoading,
  } = useAsync(
    () =>
      leagueId
        ? joinRequestService.getLeagueRequestsByLeague(
            leagueId,
          )
        : Promise.resolve([]),
    [leagueId],
  );

  if (
    leagueLoading ||
    teamsLoading ||
    matchesLoading ||
    membershipLoading ||
    leagueMembersLoading ||
    leagueUsersLoading ||
    leagueRequestsLoading
  ) {
    return <LoadingState />;
  }

  if (leagueError) {
    return (
      <ErrorState message={leagueError} />
    );
  }

  if (!league) {
    return (
      <ErrorState message="Liga no encontrada" />
    );
  }

  const teams =
    allTeams?.filter(
      (team) =>
        team.leagueId === league.id,
    ) ?? [];

  const matches =
    allMatches?.filter(
      (match) =>
        match.leagueId === league.id,
    ) ?? [];

  const standings =
    calculateStandings(
      teams.map(
        (team) => team.id,
      ),
      matches,
    );

  const currentRole: Role | null =
    membership?.status === 'active'
      ? membership.role
      : null;

  const isOwner =
    currentRole === 'owner';

  const isAdmin =
    currentRole === 'owner' ||
    currentRole === 'admin';

  const pendingLeagueRequests =
    leagueRequests?.filter(
      (request) =>
        request.status === 'pending',
    ) ?? [];

  /*
   * ==========================================
   * SOLICITUDES DE LIGA
   * ==========================================
   */

  const handleApproveLeagueRequest =
    async (
      requestId: string,
      userId: string,
    ) => {
      try {
        const existingMember =
          await memberService.getMemberByUser(
            league.id,
            userId,
          );

        if (!existingMember) {
          memberService.createMember(
            league.id,
            userId,
            'player',
            null,
          );
        }

        joinRequestService.resolveLeagueRequest(
          requestId,
          'approved',
        );

        window.location.reload();
      } catch (err) {
        window.alert(
          err instanceof Error
            ? err.message
            : 'No se pudo aprobar la solicitud.',
        );
      }
    };

  const handleRejectLeagueRequest =
    async (
      requestId: string,
    ) => {
      try {
        joinRequestService.resolveLeagueRequest(
          requestId,
          'rejected',
        );

        window.location.reload();
      } catch (err) {
        window.alert(
          err instanceof Error
            ? err.message
            : 'No se pudo rechazar la solicitud.',
        );
      }
    };

  /*
   * ==========================================
   * SUSPENDER / REANUDAR
   * ==========================================
   */

  const handleTogglePause =
    async () => {
      if (!user || !isOwner) return;

      try {
        setLeagueActionLoading(true);

        await leagueService.togglePause(
          league.id,
          user.id,
        );

        window.location.reload();
      } catch (err) {
        window.alert(
          err instanceof Error
            ? err.message
            : 'No se pudo cambiar el estado de la liga.',
        );
      } finally {
        setLeagueActionLoading(false);
      }
    };

  /*
   * ==========================================
   * ELIMINAR LIGA
   * ==========================================
   */

  const handleDeleteLeague =
    async () => {
      if (!user || !isOwner) return;

      try {
        setLeagueActionLoading(true);

        await leagueService.deleteLeague(
          league.id,
          user.id,
        );

        navigate(
          '/dashboard/leagues',
        );
      } catch (err) {
        window.alert(
          err instanceof Error
            ? err.message
            : 'No se pudo eliminar la liga.',
        );

        setLeagueActionLoading(false);
      }
    };

  /*
   * ==========================================
   * ASIGNACIÓN DE EQUIPO
   * ==========================================
   */

  const handleAssignMemberTeam =
    async (
      userId: string,
      teamId: string | null,
    ) => {
      try {
        if (!teamId) {
          const existingMember =
            await memberService.getMemberByUser(
              league.id,
              userId,
            );

          if (existingMember?.teamId) {
            const previousPlayers =
              await playerService.getPlayersByTeam(
                existingMember.teamId,
              );

            const existingPlayer =
              previousPlayers.find(
                (player) =>
                  player.userId ===
                  userId,
              );

            if (existingPlayer) {
              await playerService.removePlayer(
                existingPlayer.id,
              );
            }
          }

          memberService.updateMemberTeam(
            league.id,
            userId,
            null,
          );

          window.location.reload();
          return;
        }

        setAssigningMember({
          userId,
          teamId,
        });
      } catch (err) {
        window.alert(
          err instanceof Error
            ? err.message
            : 'No se pudo actualizar el equipo.',
        );
      }
    };

  const handleConfirmMemberTeam =
    async (
      position: Position,
      jerseyNumber: number,
    ) => {
      if (!assigningMember) return;

      try {
        const {
          userId,
          teamId,
        } = assigningMember;

        const memberUser =
          leagueUsers.find(
            (leagueUser) =>
              leagueUser.id ===
              userId,
          );

        if (!memberUser) {
          throw new Error(
            'No se encontró el usuario.',
          );
        }

        const existingPlayers =
          await playerService.getPlayersByTeam(
            teamId,
          );

        const jerseyTaken =
          existingPlayers.some(
            (player) =>
              player.jerseyNumber ===
                jerseyNumber &&
              player.userId !==
                userId,
          );

        if (jerseyTaken) {
          throw new Error(
            `El número ${jerseyNumber} ya está ocupado en este equipo.`,
          );
        }

        const allPlayers =
          await playerService.getPlayers();

        const existingPlayer =
          allPlayers.find(
            (player) =>
              player.userId ===
              userId,
          );

        if (existingPlayer) {
          await playerService.updatePlayer(
            existingPlayer.id,
            {
              teamId,
              position,
              jerseyNumber,
              name: memberUser.name,
              resetStats: true,
            },
          );
        } else {
          await playerService.addPlayer({
            teamId,
            userId,
            name: memberUser.name,
            position,
            jerseyNumber,
          });
        }

        memberService.updateMemberTeam(
          league.id,
          userId,
          teamId,
        );

        setAssigningMember(null);
        window.location.reload();
      } catch (err) {
        window.alert(
          err instanceof Error
            ? err.message
            : 'No se pudo asignar el equipo.',
        );
      }
    };

  /*
   * ==========================================
   * ROLES
   * ==========================================
   */

  const canEditMemberRole =
    (memberUserId: string) => {
      if (!isOwner) {
        return false;
      }

      if (
        memberUserId === user?.id
      ) {
        return false;
      }

      return true;
    };

  const handleChangeMemberRole =
    async (
      memberUserId: string,
      newRole: Role,
    ) => {
      if (!isOwner) {
        window.alert(
          'Solo el propietario puede cambiar roles.',
        );
        return;
      }

      if (
        memberUserId === user?.id
      ) {
        window.alert(
          'El propietario no puede cambiar su propio rol.',
        );
        return;
      }

      if (newRole === 'owner') {
        window.alert(
          'No se puede asignar el rol de propietario desde aquí.',
        );
        return;
      }

      try {
        const targetMember =
          await memberService.getMemberByUser(
            league.id,
            memberUserId,
          );

        if (!targetMember) {
          throw new Error(
            'Miembro no encontrado.',
          );
        }

        if (
          newRole === 'captain' &&
          !targetMember.teamId
        ) {
          window.alert(
            'Un capitán debe tener un equipo asignado primero.',
          );
          return;
        }

        memberService.updateMemberRole(
          league.id,
          memberUserId,
          newRole,
        );

        window.location.reload();
      } catch (err) {
        window.alert(
          err instanceof Error
            ? err.message
            : 'No se pudo cambiar el rol.',
        );
      }
    };

  /*
   * ==========================================
   * UNIRSE A LA LIGA
   * ==========================================
   */

  const handleJoinLeague =
    async () => {
      if (!user) {
        window.alert(
          'Debes iniciar sesión.',
        );
        return;
      }

      try {
        await joinRequestService.createLeagueRequest(
          league.id,
          user.id,
          '',
        );

        window.alert(
          'Solicitud enviada. El propietario o administrador debe aprobarla.',
        );

        window.location.reload();
      } catch (err) {
        window.alert(
          err instanceof Error
            ? err.message
            : 'No se pudo enviar la solicitud.',
        );
      }
    };

  /*
   * ==========================================
   * CREAR PARTIDO
   * ==========================================
   */

  const handleCreateMatch =
    async (input: {
      round: number;
      date: string;
      venue: string;
      homeTeamId: string;
      awayTeamId: string;
    }) => {
      if (!user || !isAdmin) {
        return;
      }

      await matchService.createMatch(
        {
          leagueId: league.id,
          seasonId: league.seasonId,
          round: input.round,
          date: input.date,
          venue: input.venue,
          homeTeamId:
            input.homeTeamId,
          awayTeamId:
            input.awayTeamId,
        },
        user.id,
      );

      setShowCreateMatch(false);
      window.location.reload();
    };

  /*
   * ==========================================
   * TABS
   * ==========================================
   */

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
    {
      id: 'awards',
      label: 'Premios',
      icon: Award,
    },
    ...(isAdmin
      ? [
          {
            id: 'schedule-generator' as Tab,
            label: 'Generar calendario',
            icon: WandSparkles,
          },
          {
            id: 'admin' as Tab,
            label: 'Administración',
            icon: Settings,
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      <button
        type="button"
        onClick={() =>
          navigate(
            '/dashboard/leagues',
          )
        }
        className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
      >
        <ArrowLeft size={16} />
        Volver a ligas
      </button>

      {league.status === 'paused' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-amber-600">
              ⚠️
            </div>

            <div>
              <p className="text-sm font-semibold text-amber-800">
                Liga suspendida
              </p>

              <p className="mt-1 text-sm text-amber-700">
                Las acciones de la competición están temporalmente bloqueadas.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="card overflow-hidden">
        <div
          className="h-3"
          style={{
            backgroundColor:
              league.color,
          }}
        />

        <div className="flex items-start gap-4 p-6">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl"
            style={{
              backgroundColor:
                league.color,
            }}
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

              <div className="flex flex-wrap items-center gap-2">
                {!membership &&
                  user &&
                  league.status !==
                    'paused' && (
                    <button
                      type="button"
                      onClick={
                        handleJoinLeague
                      }
                      className="btn-primary"
                    >
                      Unirse a la liga
                    </button>
                  )}

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
                      <ShieldCheck
                        size={16}
                      />
                    ) : (
                      <User size={16} />
                    )}

                    {
                      ROLE_LABELS[
                        currentRole
                      ]
                    }
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Gestión */}
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
                onClick={() =>
                  setTab('admin')
                }
                className="btn-secondary"
              >
                <Settings size={16} />
                Administración
              </button>

              {isOwner && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={
                      handleTogglePause
                    }
                    className="btn-secondary"
                    disabled={
                      leagueActionLoading
                    }
                  >
                    {leagueActionLoading
                      ? 'Procesando...'
                      : league.status ===
                          'paused'
                        ? 'Reanudar liga'
                        : 'Suspender liga'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setShowDeleteConfirm(
                        true,
                      )
                    }
                    className="rounded-lg border border-error-200 bg-error-50 px-4 py-2 text-sm font-medium text-error-700 hover:bg-error-100"
                    disabled={
                      leagueActionLoading
                    }
                  >
                    Eliminar liga
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-t border-neutral-200 px-4">
          {tabs.map(
            (tabItem) => (
              <button
                key={tabItem.id}
                type="button"
                onClick={() => {
                  if (
                    tabItem.id ===
                    'schedule-generator'
                  ) {
                    navigate(
                      `/dashboard/leagues/${league.id}/schedule-generator`,
                    );
                    return;
                  }

                  if (
                    tabItem.id ===
                    'awards'
                  ) {
                    navigate(
                      `/dashboard/leagues/${league.id}/awards`,
                    );
                    return;
                  }

                  setTab(
                    tabItem.id,
                  );
                }}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  tab ===
                  tabItem.id
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <tabItem.icon
                  size={16}
                />
                {
                  tabItem.label
                }
              </button>
            ),
          )}
        </div>
      </div>

      {/* Tabla */}
      {tab === 'standings' && (
        <div className="card overflow-hidden">
          <StandingsTable
            standings={
              standings
            }
            teams={teams}
          />
        </div>
      )}

      {/* Partidos */}
      {tab === 'matches' && (
        <div className="space-y-4">
          {isAdmin &&
            league.status !==
              'paused' && (
              <div className="card border-primary-100 bg-primary-50 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <CalendarDays
                      size={20}
                      className="text-primary-600"
                    />

                    <div>
                      <p className="text-sm font-semibold text-neutral-900">
                        Organización de partidos
                      </p>

                      <p className="text-xs text-neutral-600">
                        Crea jornadas y programa los enfrentamientos de la liga.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setShowCreateMatch(
                        true,
                      )
                    }
                    className="btn-primary"
                  >
                    Crear partido
                  </button>
                </div>
              </div>
            )}

          {matches.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {matches
                .slice()
                .sort(
                  (a, b) => {
                    if (
                      a.round !==
                      b.round
                    ) {
                      return (
                        a.round -
                        b.round
                      );
                    }

                    return (
                      new Date(
                        a.date,
                      ).getTime() -
                      new Date(
                        b.date,
                      ).getTime()
                    );
                  },
                )
                .map(
                  (match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      teams={teams}
                      onEditScore={(
                        matchToEdit,
                      ) => {
                        if (
                          !isAdmin ||
                          league.status ===
                            'paused'
                        ) {
                          return;
                        }

                        setEditingMatch(
                          matchToEdit,
                        );
                      }}
                    />
                  ),
                )}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <CalendarDays
                size={32}
                className="mx-auto text-neutral-300"
              />

              <p className="mt-3 text-sm text-neutral-500">
                Todavía no hay partidos registrados.
              </p>

              {isAdmin &&
                league.status !==
                  'paused' && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowCreateMatch(
                        true,
                      )
                    }
                    className="btn-primary mt-4"
                  >
                    Crear primer partido
                  </button>
                )}
            </div>
          )}
        </div>
      )}

      {/* Equipos */}
      {tab === 'teams' && (
        <div className="space-y-4">
          {isAdmin &&
            league.status !==
              'paused' && (
              <div className="card border-primary-100 bg-primary-50 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                        Puedes crear y gestionar los equipos de esta liga.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setShowCreateTeam(
                        true,
                      )
                    }
                    className="btn-primary"
                  >
                    Crear equipo
                  </button>
                </div>
              </div>
            )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map(
              (team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() =>
                    navigate(
                      `/dashboard/teams/${team.id}`,
                    )
                  }
                  className="card p-5 text-left transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <TeamBadge
                      name={team.name}
                      shortName={
                        team.shortName
                      }
                      color={
                        team.color
                      }
                      logoUrl={
                        team.logoUrl
                      }
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
              ),
            )}
          </div>

          {teams.length ===
            0 && (
            <div className="card p-8 text-center">
              <Users
                size={34}
                className="mx-auto text-neutral-300"
              />

              <h3 className="mt-3 font-semibold text-neutral-900">
                Esta liga todavía no tiene equipos
              </h3>

              <p className="mt-1 text-sm text-neutral-500">
                El propietario o administrador puede crear el primer equipo.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Generar calendario */}
      {tab === 'schedule-generator' &&
        isAdmin && (
          <div className="card p-1">
            <SchedulePage />
          </div>
        )}

      {/* Administración */}
      {tab === 'admin' &&
        isAdmin && (
          <div className="card overflow-hidden">
            <div className="border-b border-neutral-200 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
                  <Settings
                    size={20}
                  />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Administración
                  </h2>

                  <p className="text-sm text-neutral-500">
                    Gestiona los miembros, roles y equipos de la liga.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-6">
              {/* Rol */}
              <div className="rounded-lg border border-neutral-200 p-4">
                <p className="text-sm font-semibold text-neutral-900">
                  Tu rol
                </p>

                <p className="mt-1 text-sm text-neutral-500">
                  {
                    ROLE_LABELS[
                      currentRole ??
                        'admin'
                    ]
                  }
                </p>
              </div>

              {/* Solicitudes */}
              <div className="rounded-lg border border-neutral-200 overflow-hidden">
                <div className="border-b border-neutral-200 px-4 py-4">
                  <p className="text-sm font-semibold text-neutral-900">
                    Solicitudes para unirse
                  </p>

                  <p className="text-xs text-neutral-500">
                    Usuarios que quieren entrar a esta liga.
                  </p>
                </div>

                <div className="divide-y divide-neutral-100">
                  {pendingLeagueRequests.map(
                    (request) => (
                      <div
                        key={
                          request.id
                        }
                        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-neutral-900">
                            Usuario
                          </p>

                          <p className="text-xs text-neutral-500">
                            ID:{' '}
                            {
                              request.userId
                            }
                          </p>

                          {request.message && (
                            <p className="mt-1 text-sm text-neutral-600">
                              {
                                request.message
                              }
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleRejectLeagueRequest(
                                request.id,
                              )
                            }
                            className="btn-secondary"
                          >
                            Rechazar
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleApproveLeagueRequest(
                                request.id,
                                request.userId,
                              )
                            }
                            className="btn-primary"
                          >
                            Aceptar
                          </button>
                        </div>
                      </div>
                    ),
                  )}

                  {pendingLeagueRequests.length ===
                    0 && (
                    <div className="p-5 text-sm text-neutral-500">
                      No hay solicitudes pendientes.
                    </div>
                  )}
                </div>
              </div>

              {/* Miembros */}
              <div className="rounded-lg border border-neutral-200 overflow-hidden">
                <div className="border-b border-neutral-200 px-4 py-4">
                  <p className="text-sm font-semibold text-neutral-900">
                    Miembros de la liga
                  </p>

                  <p className="text-xs text-neutral-500">
                    Asigna equipos y roles sin modificar el resto de los datos del miembro.
                  </p>
                </div>

                <div className="divide-y divide-neutral-100">
                  {leagueMembers.map(
                    (member) => {
                      const memberUser =
                        leagueUsers.find(
                          (
                            leagueUser,
                          ) =>
                            leagueUser.id ===
                            member.userId,
                        );

                      const canEditRole =
                        canEditMemberRole(
                          member.userId,
                        );

                      return (
                        <div
                          key={
                            member.id
                          }
                          className="flex flex-col gap-4 p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-medium text-neutral-900">
                                {memberUser?.name ??
                                  'Usuario desconocido'}
                              </p>

                              <p className="text-xs text-neutral-500">
                                ID:{' '}
                                {
                                  member.userId
                                }
                              </p>
                            </div>

                            <span
                              className={`inline-flex w-fit rounded-lg border px-3 py-2 text-sm font-medium ${
                                member.role ===
                                'owner'
                                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                                  : member.role ===
                                      'admin'
                                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                                    : member.role ===
                                        'captain'
                                      ? 'border-primary-200 bg-primary-50 text-primary-700'
                                      : 'border-neutral-200 bg-neutral-50 text-neutral-600'
                              }`}
                            >
                              {
                                ROLE_LABELS[
                                  member.role
                                ]
                              }
                            </span>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label
                                className="label"
                                htmlFor={`role-${member.id}`}
                              >
                                Rol
                              </label>

                              {member.role ===
                              'owner' ? (
                                <select
                                  id={`role-${member.id}`}
                                  value="owner"
                                  disabled
                                  className="input w-full"
                                >
                                  <option value="owner">
                                    Propietario
                                  </option>
                                </select>
                              ) : (
                                <select
                                  id={`role-${member.id}`}
                                  value={
                                    member.role
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    handleChangeMemberRole(
                                      member.userId,
                                      event
                                        .target
                                        .value as Role,
                                    )
                                  }
                                  disabled={
                                    !canEditRole ||
                                    league.status ===
                                      'paused'
                                  }
                                  className="input w-full"
                                >
                                  <option value="player">
                                    Jugador
                                  </option>

                                  <option
                                    value="captain"
                                    disabled={
                                      !member.teamId
                                    }
                                  >
                                    Capitán
                                  </option>

                                  <option value="admin">
                                    Administrador
                                  </option>
                                </select>
                              )}

                              {!member.teamId &&
                                member.role ===
                                  'player' && (
                                  <p className="mt-1 text-xs text-neutral-400">
                                    Para convertirlo en capitán primero asígnale un equipo.
                                  </p>
                                )}
                            </div>

                            <div>
                              <label
                                className="label"
                                htmlFor={`team-${member.id}`}
                              >
                                Equipo
                              </label>

                              <select
                                id={`team-${member.id}`}
                                value={
                                  member.teamId ??
                                  ''
                                }
                                onChange={(
                                  event,
                                ) =>
                                  handleAssignMemberTeam(
                                    member.userId,
                                    event
                                      .target
                                      .value ||
                                      null,
                                  )
                                }
                                disabled={
                                  league.status ===
                                  'paused'
                                }
                                className="input w-full"
                              >
                                <option value="">
                                  Sin equipo
                                </option>

                                {teams.map(
                                  (
                                    team,
                                  ) => (
                                    <option
                                      key={
                                        team.id
                                      }
                                      value={
                                        team.id
                                      }
                                    >
                                      {
                                        team.name
                                      }
                                    </option>
                                  ),
                                )}
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Eliminar liga */}
      {showDeleteConfirm &&
        isOwner && (
          <Modal
            open
            onClose={() =>
              setShowDeleteConfirm(
                false,
              )
            }
            title="Eliminar liga"
            footer={
              <>
                <button
                  type="button"
                  onClick={() =>
                    setShowDeleteConfirm(
                      false,
                    )
                  }
                  className="btn-secondary"
                  disabled={
                    leagueActionLoading
                  }
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={
                    handleDeleteLeague
                  }
                  className="rounded-lg bg-error-600 px-4 py-2 text-sm font-medium text-white hover:bg-error-700"
                  disabled={
                    leagueActionLoading
                  }
                >
                  {leagueActionLoading
                    ? 'Eliminando...'
                    : 'Sí, eliminar liga'}
                </button>
              </>
            }
          >
            <div className="space-y-3">
              <p className="text-sm text-neutral-700">
                Esta acción eliminará la liga de la lista.
              </p>

              <p className="text-sm font-medium text-error-700">
                Esta acción no se puede deshacer.
              </p>

              <p className="text-sm text-neutral-500">
                Liga:{' '}
                <strong>
                  {league.name}
                </strong>
              </p>
            </div>
          </Modal>
        )}

      {/* Crear partido */}
      {showCreateMatch &&
        isAdmin &&
        league.status !== 'paused' && (
          <CreateMatchModal
            teams={teams}
            onClose={() =>
              setShowCreateMatch(false)
            }
            onSave={
              handleCreateMatch
            }
          />
        )}

      {/* Asignar miembro */}
      {assigningMember && (
        <AssignMemberTeamModal
          open
          onClose={() =>
            setAssigningMember(null)
          }
          onSave={
            handleConfirmMemberTeam
          }
          memberName={
            leagueUsers.find(
              (leagueUser) =>
                leagueUser.id ===
                assigningMember.userId,
            )?.name ?? 'Usuario'
          }
          teamName={
            teams.find(
              (team) =>
                team.id ===
                assigningMember.teamId,
            )?.name ?? 'Equipo'
          }
        />
      )}

      {/* Crear equipo */}
      {showCreateTeam &&
        isAdmin &&
        user &&
        league.status !==
          'paused' && (
          <CreateTeamModal
            leagueId={league.id}
            actorId={user.id}
            onClose={() =>
              setShowCreateTeam(
                false,
              )
            }
            onCreated={() => {
              setShowCreateTeam(
                false,
              );

              window.location.reload();
            }}
          />
        )}

      {/* Editar resultado */}
      {editingMatch &&
        isAdmin &&
        league.status !==
          'paused' && (
          <ScoreEditModal
            match={editingMatch}
            teams={teams}
            actorId={user?.id ?? ''}
            onClose={() =>
              setEditingMatch(null)
            }
            onSaved={() => {
              setEditingMatch(null);
              window.location.reload();
            }}
          />
        )}
    </div>
  );
}

/*
 * ==========================================
 * MODAL CREAR PARTIDO
 * ==========================================
 */

function CreateMatchModal({
  teams,
  onClose,
  onSave,
}: {
  teams: Team[];
  onClose: () => void;
  onSave: (input: {
    round: number;
    date: string;
    venue: string;
    homeTeamId: string;
    awayTeamId: string;
  }) => void | Promise<void>;
}) {
  const [round, setRound] =
    useState('1');

  const [date, setDate] =
    useState('');

  const [time, setTime] =
    useState('');

  const [venue, setVenue] =
    useState('');

  const [homeTeamId, setHomeTeamId] =
    useState('');

  const [awayTeamId, setAwayTeamId] =
    useState('');

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const handleSubmit = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    const roundNumber =
      Number(round);

    if (
      !Number.isInteger(
        roundNumber,
      ) ||
      roundNumber < 1
    ) {
      setError(
        'La jornada debe ser un número mayor que 0.',
      );
      return;
    }

    if (!date || !time) {
      setError(
        'Completa la fecha y la hora.',
      );
      return;
    }

    if (
      !homeTeamId ||
      !awayTeamId
    ) {
      setError(
        'Selecciona los dos equipos.',
      );
      return;
    }

    if (
      homeTeamId ===
      awayTeamId
    ) {
      setError(
        'El equipo local y visitante deben ser diferentes.',
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSave({
        round:
          roundNumber,
        date: `${date}T${time}`,
        venue:
          venue.trim(),
        homeTeamId,
        awayTeamId,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo crear el partido.',
      );
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Crear partido"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={submitting}
          >
            Cancelar
          </button>

          <button
            type="submit"
            form="create-match-form"
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? (
              <Spinner />
            ) : (
              'Crear partido'
            )}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
          {error}
        </div>
      )}

      <form
        id="create-match-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div>
          <label
            className="label"
            htmlFor="match-round"
          >
            Jornada
          </label>

          <input
            id="match-round"
            type="number"
            min={1}
            className="input"
            value={round}
            onChange={(event) =>
              setRound(
                event.target.value,
              )
            }
            disabled={submitting}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              className="label"
              htmlFor="match-date"
            >
              Fecha
            </label>

            <input
              id="match-date"
              type="date"
              className="input"
              value={date}
              onChange={(event) =>
                setDate(
                  event.target.value,
                )
              }
              disabled={submitting}
            />
          </div>

          <div>
            <label
              className="label"
              htmlFor="match-time"
            >
              Hora
            </label>

            <input
              id="match-time"
              type="time"
              className="input"
              value={time}
              onChange={(event) =>
                setTime(
                  event.target.value,
                )
              }
              disabled={submitting}
            />
          </div>
        </div>

        <div>
          <label
            className="label"
            htmlFor="match-venue"
          >
            Sede / Estadio
          </label>

          <input
            id="match-venue"
            type="text"
            className="input"
            placeholder="Ej. Arena RL"
            value={venue}
            onChange={(event) =>
              setVenue(
                event.target.value,
              )
            }
            disabled={submitting}
          />
        </div>

        <div>
          <label
            className="label"
            htmlFor="match-home"
          >
            Equipo local
          </label>

          <select
            id="match-home"
            className="input"
            value={homeTeamId}
            onChange={(event) =>
              setHomeTeamId(
                event.target.value,
              )
            }
            disabled={submitting}
          >
            <option value="">
              Selecciona equipo local
            </option>

            {teams.map(
              (team) => (
                <option
                  key={team.id}
                  value={team.id}
                >
                  {team.name}
                </option>
              ),
            )}
          </select>
        </div>

        <div>
          <label
            className="label"
            htmlFor="match-away"
          >
            Equipo visitante
          </label>

          <select
            id="match-away"
            className="input"
            value={awayTeamId}
            onChange={(event) =>
              setAwayTeamId(
                event.target.value,
              )
            }
            disabled={submitting}
          >
            <option value="">
              Selecciona equipo visitante
            </option>

            {teams.map(
              (team) => (
                <option
                  key={team.id}
                  value={team.id}
                >
                  {team.name}
                </option>
              ),
            )}
          </select>
        </div>

        {homeTeamId &&
          awayTeamId && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-center text-sm font-medium text-neutral-500">
                Vista previa
              </p>

              <div className="mt-2 flex items-center justify-center gap-4 text-lg font-semibold text-neutral-900">
                <span>
                  {
                    teams.find(
                      (team) =>
                        team.id ===
                        homeTeamId,
                    )?.shortName
                  }
                </span>

                <span className="text-neutral-400">
                  vs
                </span>

                <span>
                  {
                    teams.find(
                      (team) =>
                        team.id ===
                        awayTeamId,
                    )?.shortName
                  }
                </span>
              </div>
            </div>
          )}
      </form>
    </Modal>
  );
}

/*
 * ==========================================
 * MODAL RESULTADO
 * ==========================================
 */

function ScoreEditModal({
  match,
  teams,
  actorId,
  onClose,
  onSaved,
}: {
  match: Match;
  teams: Team[];
  actorId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const home = teams.find(
    (team) => team.id === match.homeTeamId,
  );

  const away = teams.find(
    (team) => team.id === match.awayTeamId,
  );

  const [homeScore, setHomeScore] = useState(
    match.homeScore?.toString() ?? '0',
  );

  const [awayScore, setAwayScore] = useState(
    match.awayScore?.toString() ?? '0',
  );

  const [wentToOvertime, setWentToOvertime] =
    useState(match.wentToOvertime ?? false);

  const [players, setPlayers] = useState<
    Array<{
      playerId: string;
      name: string;
      teamId: string;
      goals: number;
      assists: number;
      isMvp: boolean;
    }>
  >([]);

  const [loadingPlayers, setLoadingPlayers] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadPlayers = async () => {
      try {
        setLoadingPlayers(true);
        setError(null);

        const [
          homePlayers,
          awayPlayers,
          existingStats,
        ] = await Promise.all([
          playerService.getPlayersByTeam(
            match.homeTeamId,
          ),
          playerService.getPlayersByTeam(
            match.awayTeamId,
          ),
          matchPlayerStatsService.getStatsByMatch(
            match.id,
          ),
        ]);

        if (cancelled) return;

        const allPlayers = [
          ...homePlayers,
          ...awayPlayers,
        ];

        setPlayers(
          allPlayers.map((player) => {
            const existing =
              existingStats.find(
                (stat) =>
                  stat.playerId === player.id,
              );

            return {
              playerId: player.id,
              name: player.name,
              teamId: player.teamId,
              goals: existing?.goals ?? 0,
              assists: existing?.assists ?? 0,
              isMvp: existing?.isMvp ?? false,
            };
          }),
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudieron cargar los jugadores.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingPlayers(false);
        }
      }
    };

    void loadPlayers();

    return () => {
      cancelled = true;
    };
  }, [
    match.id,
    match.homeTeamId,
    match.awayTeamId,
  ]);

  const updatePlayerStat = (
    playerId: string,
    field: 'goals' | 'assists',
    value: string,
  ) => {
    const parsed = Number(value);

    if (
      !Number.isInteger(parsed) ||
      parsed < 0
    ) {
      return;
    }

    setPlayers((current) =>
      current.map((player) =>
        player.playerId === playerId
          ? {
              ...player,
              [field]: parsed,
            }
          : player,
      ),
    );
  };

  const handleMvpChange = (
    playerId: string,
  ) => {
    setPlayers((current) =>
      current.map((player) => ({
        ...player,
        isMvp:
          player.playerId === playerId,
      })),
    );
  };

  const handleSubmit = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    const parsedHomeScore = Number(
      homeScore,
    );

    const parsedAwayScore = Number(
      awayScore,
    );

    if (
      !Number.isInteger(
        parsedHomeScore,
      ) ||
      parsedHomeScore < 0 ||
      parsedHomeScore > 99
    ) {
      setError(
        'El marcador local debe estar entre 0 y 99.',
      );
      return;
    }

    if (
      !Number.isInteger(
        parsedAwayScore,
      ) ||
      parsedAwayScore < 0 ||
      parsedAwayScore > 99
    ) {
      setError(
        'El marcador visitante debe estar entre 0 y 99.',
      );
      return;
    }

    if (
      parsedHomeScore === parsedAwayScore
    ) {
      setError(
        'En Rocket League no se puede guardar un empate. El partido debe tener un ganador, incluso si fue en tiempo extra.',
      );
      return;
    }

    let homeGoals = 0;
    let awayGoals = 0;

    for (const player of players) {
      if (
        player.teamId ===
        match.homeTeamId
      ) {
        homeGoals += player.goals;
      }

      if (
        player.teamId ===
        match.awayTeamId
      ) {
        awayGoals += player.goals;
      }
    }

    if (
      homeGoals !== parsedHomeScore ||
      awayGoals !== parsedAwayScore
    ) {
      setError(
        `Los goles individuales deben coincidir con el marcador. Registrados: ${homeGoals}-${awayGoals}. Marcador: ${parsedHomeScore}-${parsedAwayScore}.`,
      );
      return;
    }

    const mvpPlayers = players.filter(
      (player) => player.isMvp,
    );

    if (mvpPlayers.length > 1) {
      setError(
        'Solo puede haber un MVP por partido.',
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const mvpPlayerId =
        mvpPlayers[0]?.playerId ?? null;

      await matchService.updateScore(
        {
          matchId: match.id,
          homeScore: parsedHomeScore,
          awayScore: parsedAwayScore,
          mvpPlayerId,
          wentToOvertime,
        },
        actorId,
      );

      await matchPlayerStatsService.saveMatchStats(
        match.id,
        players.map((player) => ({
          playerId: player.playerId,
          goals: player.goals,
          assists: player.assists,
          isMvp: player.isMvp,
        })),
      );

      onSaved();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar el partido.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Registrar resultado y estadísticas"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={submitting}
          >
            Cancelar
          </button>

          <button
            type="submit"
            form="score-edit-form"
            className="btn-primary"
            disabled={
              submitting ||
              loadingPlayers
            }
          >
            {submitting ? (
              <Spinner />
            ) : (
              'Guardar partido'
            )}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
          {error}
        </div>
      )}

      <form
        id="score-edit-form"
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* Marcador */}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <div className="mb-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Jornada {match.round}
            </p>

            <p className="mt-1 text-sm text-neutral-500">
              {match.status === 'finished'
                ? 'Editar resultado'
                : 'Registrar resultado'}
            </p>
          </div>

          <div className="flex items-center justify-around gap-4">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
              {home && (
                <TeamBadge
                  name={home.name}
                  shortName={home.shortName}
                  color={home.color}
                  logoUrl={home.logoUrl}
                  size="lg"
                />
              )}

              <span className="max-w-32 truncate text-center text-sm font-semibold text-neutral-800">
                {home?.name}
              </span>

              <input
                type="number"
                min={0}
                max={99}
                value={homeScore}
                onChange={(event) =>
                  setHomeScore(
                    event.target.value,
                  )
                }
                className="input w-20 text-center text-2xl font-bold"
                disabled={submitting}
              />
            </div>

            <span className="text-lg font-bold text-neutral-300">
              -
            </span>

            <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
              {away && (
                <TeamBadge
                  name={away.name}
                  shortName={away.shortName}
                  color={away.color}
                  logoUrl={away.logoUrl}
                  size="lg"
                />
              )}

              <span className="max-w-32 truncate text-center text-sm font-semibold text-neutral-800">
                {away?.name}
              </span>

              <input
                type="number"
                min={0}
                max={99}
                value={awayScore}
                onChange={(event) =>
                  setAwayScore(
                    event.target.value,
                  )
                }
                className="input w-20 text-center text-2xl font-bold"
                disabled={submitting}
              />
            </div>
          </div>
        </div>

        {/* Tiempo extra */}
        <div className="rounded-xl border border-neutral-200 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-neutral-900">
                Tiempo extra
              </p>

              <p className="text-xs text-neutral-500">
                Marca esta opción si el partido se decidió después del tiempo reglamentario.
              </p>
            </div>

            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={wentToOvertime}
                onChange={(event) =>
                  setWentToOvertime(
                    event.target.checked,
                  )
                }
                className="h-4 w-4"
                disabled={submitting}
              />

              <span className="text-sm font-medium text-neutral-800">
                Se decidió en tiempo extra
              </span>
            </label>
          </div>

          {wentToOvertime && (
            <div className="mt-3 rounded-lg bg-primary-50 px-3 py-2 text-xs text-primary-700">
              El ganador recibirá 2 puntos y el perdedor 1 punto.
            </div>
          )}
        </div>

        {/* Estadísticas */}
        <div>
          <div className="mb-3">
            <h3 className="text-base font-semibold text-neutral-900">
              Estadísticas de jugadores
            </h3>

            <p className="mt-1 text-xs text-neutral-500">
              Registra únicamente goles, asistencias y MVP.
            </p>
          </div>

          {loadingPlayers ? (
            <div className="rounded-lg border border-neutral-200 p-6 text-center">
              <Spinner />

              <p className="mt-2 text-sm text-neutral-500">
                Cargando jugadores...
              </p>
            </div>
          ) : players.length === 0 ? (
            <div className="rounded-lg border border-neutral-200 p-6 text-center">
              <p className="text-sm text-neutral-500">
                No hay jugadores registrados en estos equipos.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50">
                  <tr>
                    <th className="px-3 py-3 text-left font-medium text-neutral-500">
                      Jugador
                    </th>

                    <th className="px-2 py-3 text-center font-medium text-neutral-500">
                      Goles
                    </th>

                    <th className="px-2 py-3 text-center font-medium text-neutral-500">
                      Asistencias
                    </th>

                    <th className="px-3 py-3 text-center font-medium text-neutral-500">
                      MVP
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100">
                  {players.map((player) => {
                    const team = teams.find(
                      (candidate) =>
                        candidate.id ===
                        player.teamId,
                    );

                    return (
                      <tr
                        key={player.playerId}
                        className="hover:bg-neutral-50"
                      >
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor:
                                  team?.color ??
                                  '#64748b',
                              }}
                            />

                            <div>
                              <span className="font-medium text-neutral-900">
                                {player.name}
                              </span>

                              <p className="text-xs text-neutral-400">
                                {team?.shortName ??
                                  ''}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-2 py-3">
                          <input
                            type="number"
                            min={0}
                            max={99}
                            value={player.goals}
                            onChange={(event) =>
                              updatePlayerStat(
                                player.playerId,
                                'goals',
                                event.target.value,
                              )
                            }
                            className="input w-20 px-2 text-center"
                            disabled={submitting}
                          />
                        </td>

                        <td className="px-2 py-3">
                          <input
                            type="number"
                            min={0}
                            max={99}
                            value={player.assists}
                            onChange={(event) =>
                              updatePlayerStat(
                                player.playerId,
                                'assists',
                                event.target.value,
                              )
                            }
                            className="input w-20 px-2 text-center"
                            disabled={submitting}
                          />
                        </td>

                        <td className="px-3 py-3 text-center">
                          <input
                            type="radio"
                            name="match-mvp"
                            checked={player.isMvp}
                            onChange={() =>
                              handleMvpChange(
                                player.playerId,
                              )
                            }
                            disabled={submitting}
                            className="h-4 w-4"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

function AssignMemberTeamModal({
  open,
  onClose,
  onSave,
  memberName,
  teamName,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (
    position: Position,
    jerseyNumber: number,
  ) => void | Promise<void>;
  memberName: string;
  teamName: string;
}) {
  const [position, setPosition] =
    useState<Position>(
      'Delantero',
    );

  const [jerseyNumber, setJerseyNumber] =
    useState('10');

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const handleSubmit = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    const number =
      Number(jerseyNumber);

    if (
      !Number.isInteger(number) ||
      number < 1 ||
      number > 99
    ) {
      setError(
        'El número debe estar entre 1 y 99.',
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSave(
        position,
        number,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar la asignación.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Asignar jugador al equipo"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={submitting}
          >
            Cancelar
          </button>

          <button
            type="submit"
            form="assign-member-team-form"
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? (
              <Spinner />
            ) : (
              'Asignar'
            )}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
          {error}
        </div>
      )}

      <form
        id="assign-member-team-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div>
          <p className="text-sm text-neutral-500">
            Jugador
          </p>

          <p className="font-semibold text-neutral-900">
            {memberName}
          </p>
        </div>

        <div>
          <p className="text-sm text-neutral-500">
            Equipo
          </p>

          <p className="font-semibold text-neutral-900">
            {teamName}
          </p>
        </div>

        <div>
          <label
            className="label"
            htmlFor="assign-position"
          >
            Posición
          </label>

          <select
            id="assign-position"
            className="input"
            value={position}
            onChange={(event) =>
              setPosition(
                event.target
                  .value as Position,
              )
            }
            disabled={submitting}
          >
            <option value="Portero">
              Portero
            </option>

            <option value="Defensa">
              Defensa
            </option>

            <option value="Mediocampista">
              Mediocampista
            </option>

            <option value="Delantero">
              Delantero
            </option>
          </select>
        </div>

        <div>
          <label
            className="label"
            htmlFor="assign-jersey"
          >
            Número de camiseta
          </label>

          <input
            id="assign-jersey"
            type="number"
            min={1}
            max={99}
            className="input"
            value={jerseyNumber}
            onChange={(event) =>
              setJerseyNumber(
                event.target.value,
              )
            }
            disabled={submitting}
          />
        </div>
      </form>
    </Modal>
  );
}

function CreateTeamModal({
  leagueId,
  actorId,
  onClose,
  onCreated,
}: {
  leagueId: string;
  actorId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [city, setCity] = useState('');
  const [color, setColor] = useState('#2563eb');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    if (
      !name.trim() ||
      !shortName.trim() ||
      !city.trim()
    ) {
      setError(
        'Completa nombre, nombre corto y ciudad.',
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await teamService.createTeam(
        {
          leagueId,
          name: name.trim(),
          shortName: shortName.trim(),
          city: city.trim(),
          color,
          logoUrl,
          description: description.trim(),
        },
        actorId,
      );

      onCreated();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo crear el equipo.',
      );
      setSubmitting(false);
    }
  };

  const handleLogoChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      setLogoUrl(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError(
        'El archivo seleccionado no es una imagen válida.',
      );
      event.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError(
        'El escudo no puede superar 2 MB.',
      );
      event.target.value = '';
      return;
    }

    setError(null);

    const reader = new FileReader();

    reader.onload = () => {
      setLogoUrl(
        typeof reader.result === 'string'
          ? reader.result
          : null,
      );
    };

    reader.onerror = () => {
      setError(
        'No se pudo leer el archivo seleccionado.',
      );
      setLogoUrl(null);
    };

    reader.readAsDataURL(file);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Crear equipo"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={submitting}
          >
            Cancelar
          </button>

          <button
            type="submit"
            form="create-team-form"
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? (
              <Spinner />
            ) : (
              'Crear equipo'
            )}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
          {error}
        </div>
      )}

      <form
        id="create-team-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div>
          <label
            className="label"
            htmlFor="team-name"
          >
            Nombre del equipo
          </label>

          <input
            id="team-name"
            className="input"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="Ej. América"
            maxLength={80}
            disabled={submitting}
          />
        </div>

        <div>
          <label
            className="label"
            htmlFor="team-short-name"
          >
            Nombre corto
          </label>

          <input
            id="team-short-name"
            className="input"
            value={shortName}
            onChange={(event) =>
              setShortName(
                event.target.value.slice(0, 4),
              )
            }
            placeholder="AME"
            maxLength={4}
            disabled={submitting}
          />
        </div>

        <div>
          <label
            className="label"
            htmlFor="team-city"
          >
            Ciudad
          </label>

          <input
            id="team-city"
            className="input"
            value={city}
            onChange={(event) =>
              setCity(event.target.value)
            }
            placeholder="Ciudad de México"
            maxLength={80}
            disabled={submitting}
          />
        </div>

        <div>
          <label
            className="label"
            htmlFor="team-color"
          >
            Color
          </label>

          <input
            id="team-color"
            type="color"
            value={color}
            onChange={(event) =>
              setColor(event.target.value)
            }
            className="h-10 w-16 cursor-pointer rounded border border-neutral-300"
            disabled={submitting}
          />
        </div>

        <div>
          <label
            className="label"
            htmlFor="team-logo"
          >
            Escudo del equipo
          </label>

          <input
            id="team-logo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="input"
            disabled={submitting}
            onChange={handleLogoChange}
          />

          <p className="mt-1 text-xs text-neutral-400">
            PNG, JPG, WEBP o GIF. Máximo 2 MB.
          </p>

          {logoUrl && (
            <div className="mt-3 flex items-center gap-3">
              <img
                src={logoUrl}
                alt="Vista previa del escudo"
                className="h-16 w-16 rounded-lg border border-neutral-200 object-cover"
              />

              <button
                type="button"
                onClick={() =>
                  setLogoUrl(null)
                }
                className="text-sm text-red-600 hover:text-red-700"
              >
                Quitar escudo
              </button>
            </div>
          )}
        </div>

        <div>
          <label
            className="label"
            htmlFor="team-description"
          >
            Descripción
          </label>

          <textarea
            id="team-description"
            className="input min-h-24"
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value,
              )
            }
            placeholder="Descripción del equipo..."
            disabled={submitting}
          />
        </div>
      </form>
    </Modal>
  );
}