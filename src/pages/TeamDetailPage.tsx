import { useState, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  UserPlus,
  Trash2,
  UserRoundPlus,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useAsync, useAuth } from '@/hooks';
import {
  teamService,
  playerService,
  memberService,
  joinRequestService,
  authService,
  leagueService,
} from '@/services';
import {
  LoadingState,
  ErrorState,
  TeamBadge,
  PlayerCard,
  Modal,
  Spinner,
  EmptyState,
} from '@/components';
import { Position } from '@/types';

const positions: Position[] = [
  'Portero',
  'Defensa',
  'Mediocampista',
  'Delantero',
];

export function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [approvalRequest, setApprovalRequest] = useState<{
    requestId: string;
    userId: string;
  } | null>(null);

  const {
    data: team,
    loading: teamLoading,
    error: teamError,
  } = useAsync(
    () => teamService.getTeamById(teamId!),
    [teamId, refreshKey],
  );

  const {
    data: players,
    loading: playersLoading,
  } = useAsync(
    () => playerService.getPlayersByTeam(teamId!),
    [teamId, refreshKey],
  );

  const {
    data: membership,
    loading: membershipLoading,
  } = useAsync(
    () =>
      team && user
        ? memberService.getMemberByUser(
            team.leagueId,
            user.id,
          )
        : Promise.resolve(null),
    [team?.leagueId, user?.id, refreshKey],
  );

  const {
    data: teamRequests,
    loading: teamRequestsLoading,
  } = useAsync(
    () =>
      team
        ? joinRequestService.getTeamRequestsByTeam(team.id)
        : Promise.resolve([]),
    [team?.id, refreshKey],
  );

  const {
    data: requestUsers,
    loading: requestUsersLoading,
  } = useAsync(
    () =>
      teamRequests && teamRequests.length > 0
        ? authService.getUsersByIds(
            teamRequests.map(
              (request) => request.userId,
            ),
          )
        : Promise.resolve([]),
    [teamRequests],
  );

  const {
    data: league,
    loading: leagueLoading,
  } = useAsync(
    () =>
      team
        ? leagueService.getLeagueById(
            team.leagueId,
          )
        : Promise.resolve(null),
    [team?.leagueId],
  );

  if (
    teamLoading ||
    playersLoading ||
    membershipLoading ||
    teamRequestsLoading ||
    requestUsersLoading ||
    leagueLoading
  ) {
    return <LoadingState />;
  }

  if (teamError) {
    return <ErrorState message={teamError} />;
  }

  if (!team) {
    return <ErrorState message="Equipo no encontrado" />;
  }

  const currentRole =
    membership?.status === 'active'
      ? membership.role
      : null;

  /*
   * Owner/admin pueden administrar cualquier equipo.
   * Un capitán solo puede administrar el equipo
   * al que pertenece.
   */
  const isOwnerOrAdmin =
    currentRole === 'owner' ||
    currentRole === 'admin';

  const isCaptain =
    currentRole === 'captain' &&
    membership?.teamId === team.id;

  const canManageTeam =
    isOwnerOrAdmin || isCaptain;

  const canManageRoster =
    isOwnerOrAdmin || isCaptain;

  const canManageRequests =
    isOwnerOrAdmin || isCaptain;

  const canRequestToJoin =
    !!user &&
    membership?.status === 'active' &&
    !membership.teamId &&
    currentRole === 'player';

  const pendingRequests =
    teamRequests?.filter(
      (request) => request.status === 'pending',
    ) ?? [];

  const hasPendingRequest =
    pendingRequests.some(
      (request) => request.userId === user?.id,
    );

  const handlePlayerAdded = () => {
    setShowAddModal(false);
    setRefreshKey((key) => key + 1);
  };

  const handlePlayerRemoved = async (
    playerId: string,
  ) => {
    if (!canManageRoster) {
      window.alert(
        'No tienes permisos para administrar esta plantilla.',
      );
      return;
    }

    try {
      await playerService.removePlayer(
        playerId,
      );

      setRefreshKey((key) => key + 1);
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : 'No se pudo eliminar al jugador.',
      );
    }
  };

  const handleStartApproveRequest = (
    requestId: string,
    userId: string,
  ) => {
    if (!canManageRequests) {
      window.alert(
        'No tienes permisos para administrar las solicitudes de este equipo.',
      );
      return;
    }

    if (league?.status === 'paused') {
      window.alert(
        'La liga está suspendida. No se pueden aprobar solicitudes mientras esté pausada.',
      );
      return;
    }

    setApprovalRequest({
      requestId,
      userId,
    });
  };

  const handleConfirmApproveRequest = async (
    position: Position,
    jerseyNumber: number,
  ) => {
    if (!approvalRequest) return;

    if (!canManageRequests) {
      throw new Error(
        'No tienes permisos para aprobar solicitudes.',
      );
    }

    try {
      const { requestId, userId } =
        approvalRequest;

      const existingMember =
        await memberService.getMemberByUser(
          team.leagueId,
          userId,
        );

      if (!existingMember) {
        throw new Error(
          'El usuario no pertenece a esta liga.',
        );
      }

      if (
        existingMember.teamId &&
        existingMember.teamId !== team.id
      ) {
        throw new Error(
          'El usuario ya pertenece a otro equipo.',
        );
      }

      const allPlayers =
        await playerService.getPlayers();

      const existingPlayer =
        allPlayers.find(
          (player) => player.userId === userId,
        );

      const currentTeamPlayers =
        await playerService.getPlayersByTeam(
          team.id,
        );

      const jerseyTaken =
        currentTeamPlayers.some(
          (player) =>
            player.jerseyNumber === jerseyNumber &&
            player.userId !== userId,
        );

      if (jerseyTaken) {
        throw new Error(
          `El número ${jerseyNumber} ya está ocupado en este equipo.`,
        );
      }

      const userData =
        await authService.getUserById(userId);

      if (!userData) {
        throw new Error(
          'No se encontró el usuario.',
        );
      }

      if (existingPlayer) {
        await playerService.updatePlayer(
          existingPlayer.id,
          {
            teamId: team.id,
            name: userData.name,
            position,
            jerseyNumber,
          },
        );
      } else {
        await playerService.addPlayer({
          teamId: team.id,
          userId,
          name: userData.name,
          position,
          jerseyNumber,
        });
      }

      memberService.updateMemberTeam(
        team.leagueId,
        userId,
        team.id,
      );

      joinRequestService.resolveTeamRequest(
        requestId,
        'approved',
      );

      setApprovalRequest(null);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : 'No se pudo aprobar la solicitud.',
      );
    }
  };

  const handleRejectRequest = (
    requestId: string,
  ) => {
    if (!canManageRequests) {
      window.alert(
        'No tienes permisos para administrar las solicitudes de este equipo.',
      );
      return;
    }

    try {
      joinRequestService.resolveTeamRequest(
        requestId,
        'rejected',
      );

      setRefreshKey((key) => key + 1);
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : 'No se pudo rechazar la solicitud.',
      );
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
      >
        <ArrowLeft size={16} />
        Volver
      </button>

      {league?.status === 'paused' && (
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

      {/* Team header */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <TeamBadge
            name={team.name}
            shortName={team.shortName}
            color={team.color}
            size="lg"
          />

          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              {team.name}
            </h1>

            <p className="text-sm text-neutral-500">
              {team.city}
            </p>

            {isCaptain && (
              <p className="mt-1 text-xs font-medium text-primary-600">
                Capitán de este equipo
              </p>
            )}

            {isOwnerOrAdmin && (
              <p className="mt-1 text-xs font-medium text-blue-600">
                Administración
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Solicitudes */}
      {canManageRequests &&
        pendingRequests.length > 0 && (
          <div className="card overflow-hidden">
            <div className="border-b border-neutral-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <UserCheck
                  size={20}
                  className="text-primary-600"
                />

                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Solicitudes para unirse
                  </h2>

                  <p className="text-sm text-neutral-500">
                    Hay{' '}
                    {pendingRequests.length}{' '}
                    {pendingRequests.length === 1
                      ? 'solicitud pendiente'
                      : 'solicitudes pendientes'}.
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-neutral-100">
              {pendingRequests.map(
                (request) => {
                  const requestUser =
                    requestUsers.find(
                      (candidate) =>
                        candidate.id ===
                        request.userId,
                    );

                  return (
                    <div
                      key={request.id}
                      className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-neutral-900">
                          {requestUser?.name ??
                            'Usuario desconocido'}
                        </p>

                        <p className="text-sm text-neutral-500">
                          ID: {request.userId}
                        </p>

                        {request.message && (
                          <p className="mt-2 text-sm text-neutral-600">
                            “{request.message}”
                          </p>
                        )}

                        <p className="mt-1 text-xs text-neutral-400">
                          Solicitud enviada{' '}
                          {new Date(
                            request.createdAt,
                          ).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleRejectRequest(
                              request.id,
                            )
                          }
                          className="btn-secondary"
                          disabled={
                            league?.status ===
                            'paused'
                          }
                        >
                          <UserX size={16} />
                          Rechazar
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleStartApproveRequest(
                              request.id,
                              request.userId,
                            )
                          }
                          className="btn-primary"
                          disabled={
                            league?.status ===
                            'paused'
                          }
                        >
                          <UserCheck size={16} />
                          Aceptar
                        </button>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        )}

      {/* Roster */}
      <div className="card">
        <div className="flex flex-col gap-3 border-b border-neutral-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Users
              size={20}
              className="text-neutral-400"
            />

            <h2 className="text-lg font-semibold text-neutral-900">
              Plantilla
            </h2>

            <span className="badge bg-neutral-100 text-neutral-600">
              {players?.length ?? 0}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {canManageRoster &&
              league?.status !== 'paused' && (
                <button
                  type="button"
                  onClick={() =>
                    setShowAddModal(true)
                  }
                  className="btn-primary text-sm"
                >
                  <UserPlus size={16} />
                  Añadir jugador
                </button>
              )}

            {canRequestToJoin &&
              !hasPendingRequest &&
              league?.status !== 'paused' && (
                <button
                  type="button"
                  onClick={() =>
                    setShowJoinModal(true)
                  }
                  className="btn-primary text-sm"
                >
                  <UserRoundPlus size={16} />
                  Solicitar unirse
                </button>
              )}

            {hasPendingRequest && (
              <span className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                Solicitud pendiente
              </span>
            )}
          </div>
        </div>

        {players && players.length > 0 ? (
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((player) => (
              <div
                key={player.id}
                className="relative group"
              >
                <PlayerCard
                  player={player}
                  team={team}
                />

                {canManageRoster && (
                  <button
                    type="button"
                    onClick={() =>
                      handlePlayerRemoved(
                        player.id,
                      )
                    }
                    className="absolute right-2 top-2 rounded-lg bg-white/80 p-1.5 text-error-500 opacity-0 transition-opacity hover:bg-error-50 group-hover:opacity-100"
                    title="Eliminar jugador"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Users size={32} />}
            title="Sin jugadores"
            message="Añade jugadores a la plantilla para empezar a registrar estadísticas."
          />
        )}
      </div>

      {showAddModal && (
        <AddPlayerModal
          teamId={team.id}
          onClose={() =>
            setShowAddModal(false)
          }
          onSaved={handlePlayerAdded}
        />
      )}

      {showJoinModal && user && (
        <JoinTeamModal
          teamId={team.id}
          leagueId={team.leagueId}
          userId={user.id}
          onClose={() =>
            setShowJoinModal(false)
          }
          onSent={() => {
            setShowJoinModal(false);
            setRefreshKey(
              (key) => key + 1,
            );
          }}
        />
      )}

      {approvalRequest && (
        <ApproveTeamRequestModal
          open
          onClose={() =>
            setApprovalRequest(null)
          }
          onSave={
            handleConfirmApproveRequest
          }
          memberName={
            requestUsers.find(
              (requestUser) =>
                requestUser.id ===
                approvalRequest.userId,
            )?.name ?? 'Usuario'
          }
          teamName={team.name}
        />
      )}
    </div>
  );
}

function AddPlayerModal({
  teamId,
  onClose,
  onSaved,
}: {
  teamId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [position, setPosition] =
    useState<Position>('Delantero');
  const [jerseyNumber, setJerseyNumber] =
    useState('10');
  const [error, setError] =
    useState<string | null>(null);
  const [submitting, setSubmitting] =
    useState(false);

  const handleSubmit = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    const number = Number(jerseyNumber);

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
      await playerService.addPlayer({
        teamId,
        name: name.trim(),
        position,
        jerseyNumber: number,
      });

      onSaved();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al añadir jugador.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Añadir jugador"
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
            type="submit"
            form="add-player-form"
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? (
              <Spinner />
            ) : (
              'Añadir'
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
        id="add-player-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div>
          <label
            className="label"
            htmlFor="player-name"
          >
            Nombre del jugador
          </label>

          <input
            id="player-name"
            type="text"
            className="input"
            placeholder="Nombre completo"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            disabled={submitting}
            required
          />
        </div>

        <div>
          <label
            className="label"
            htmlFor="player-position"
          >
            Posición
          </label>

          <select
            id="player-position"
            className="input"
            value={position}
            onChange={(event) =>
              setPosition(
                event.target.value as Position,
              )
            }
            disabled={submitting}
          >
            {positions.map(
              (positionOption) => (
                <option
                  key={positionOption}
                  value={positionOption}
                >
                  {positionOption}
                </option>
              ),
            )}
          </select>
        </div>

        <div>
          <label
            className="label"
            htmlFor="player-number"
          >
            Número de camiseta
          </label>

          <input
            id="player-number"
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
            required
          />
        </div>
      </form>
    </Modal>
  );
}

function JoinTeamModal({
  teamId,
  leagueId,
  userId,
  onClose,
  onSent,
}: {
  teamId: string;
  leagueId: string;
  userId: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [message, setMessage] = useState('');
  const [error, setError] =
    useState<string | null>(null);
  const [submitting, setSubmitting] =
    useState(false);

  const handleSubmit = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    setSubmitting(true);
    setError(null);

    try {
      await joinRequestService.createTeamRequest(
        teamId,
        leagueId,
        userId,
        message.trim(),
      );

      onSent();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo enviar la solicitud.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Solicitar unirse al equipo"
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
            form="join-team-form"
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? (
              <Spinner />
            ) : (
              'Enviar solicitud'
            )}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg bg-error-50 border border-error-200 px-4 py-3 text-sm text-error-700">
          {error}
        </div>
      )}

      <form
        id="join-team-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div>
          <label
            className="label"
            htmlFor="join-team-message"
          >
            Mensaje
          </label>

          <textarea
            id="join-team-message"
            className="input min-h-28 resize-y"
            value={message}
            onChange={(event) =>
              setMessage(
                event.target.value,
              )
            }
            placeholder="Escribe un mensaje para el capitán o administrador..."
            disabled={submitting}
          />
        </div>
      </form>
    </Modal>
  );
}

function ApproveTeamRequestModal({
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
    useState<Position>('Delantero');

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

    const number = Number(jerseyNumber);

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
          : 'No se pudo aprobar la solicitud.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Aceptar solicitud"
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
            form="approve-team-request-form"
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? (
              <Spinner />
            ) : (
              'Aceptar y añadir'
            )}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg bg-error-50 border border-error-200 px-4 py-3 text-sm text-error-700">
          {error}
        </div>
      )}

      <form
        id="approve-team-request-form"
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
            htmlFor="approval-position"
          >
            Posición
          </label>

          <select
            id="approval-position"
            className="input"
            value={position}
            onChange={(event) =>
              setPosition(
                event.target.value as Position,
              )
            }
            disabled={submitting}
          >
            {positions.map(
              (positionOption) => (
                <option
                  key={positionOption}
                  value={positionOption}
                >
                  {positionOption}
                </option>
              ),
            )}
          </select>
        </div>

        <div>
          <label
            className="label"
            htmlFor="approval-jersey"
          >
            Número de camiseta
          </label>

          <input
            id="approval-jersey"
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