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
  const { leagueId } = useParams<{ leagueId: string }>();

  const navigate = useNavigate();
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>('standings');
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showCreateMatch, setShowCreateMatch] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [leagueActionLoading, setLeagueActionLoading] = useState(false);
  const [assigningMember, setAssigningMember] = useState<{ userId: string; teamId: string } | null>(null);

  const { data: league, loading: leagueLoading, error: leagueError } = useAsync(
    () => leagueService.getLeagueById(leagueId!),
    [leagueId],
  );

  const { data: allTeams, loading: teamsLoading } = useAsync(
    () => teamService.getTeams(),
    [],
  );

  const { data: allMatches, loading: matchesLoading } = useAsync(
    () => matchService.getMatches(),
    [],
  );

  const { data: membership, loading: membershipLoading } = useAsync(
    () => (leagueId && user
      ? memberService.getMemberByUser(leagueId, user.id)
      : Promise.resolve(null)),
    [leagueId, user?.id],
  );

  const { data: leagueMembers, loading: leagueMembersLoading } = useAsync(
    () => leagueId
      ? memberService.getMembersByLeague(leagueId)
      : Promise.resolve([]),
    [leagueId],
  );

  const { data: leagueUsers, loading: leagueUsersLoading } = useAsync(
    () => (leagueMembers && leagueMembers.length > 0
      ? authService.getUsersByIds(leagueMembers.map((member) => member.userId))
      : Promise.resolve([])),
    [leagueMembers],
  );

  const { data: leagueRequests, loading: leagueRequestsLoading } = useAsync(
    () => leagueId
      ? joinRequestService.getLeagueRequestsByLeague(leagueId)
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
    return <ErrorState message={leagueError} />;
  }

  if (!league) {
    return <ErrorState message="Liga no encontrada" />;
  }

  const teams = allTeams?.filter((team) => team.leagueId === league.id) ?? [];
  const matches = allMatches?.filter((match) => match.leagueId === league.id) ?? [];
  const standings = calculateStandings(teams.map((team) => team.id), matches);

  const currentRole: Role | null = membership?.status === 'active' ? membership.role : null;
  const isOwner = currentRole === 'owner';
  const isAdmin = currentRole === 'owner' || currentRole === 'admin';

  const pendingLeagueRequests = leagueRequests?.filter((request) => request.status === 'pending') ?? [];

  const handleApproveLeagueRequest = async (requestId: string, userId: string) => {
    try {
      const existingMember = await memberService.getMemberByUser(league.id, userId);

      if (!existingMember) {
        await memberService.createMember(league.id, userId, 'player', null);
      }

      const resolved = await joinRequestService.resolveLeagueRequest(requestId, 'approved');

      if (!resolved) {
        throw new Error('La solicitud no pudo marcarse como aprobada.');
      }

      window.location.reload();
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : 'No se pudo aprobar la solicitud.',
      );
    }
  };

  const handleRejectLeagueRequest = async (requestId: string) => {
    try {
      const resolved = await joinRequestService.resolveLeagueRequest(requestId, 'rejected');

      if (!resolved) {
        throw new Error('La solicitud no pudo marcarse como rechazada.');
      }

      window.location.reload();
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : 'No se pudo rechazar la solicitud.',
      );
    }
  };

  const handleTogglePause = async () => {
    if (!user || !isOwner) return;

    try {
      setLeagueActionLoading(true);
      await leagueService.togglePause(league.id, user.id);
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

  const handleDeleteLeague = async () => {
    if (!user || !isOwner) return;

    try {
      setLeagueActionLoading(true);
      await leagueService.deleteLeague(league.id, user.id);
      navigate('/dashboard/leagues');
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : 'No se pudo eliminar la liga.',
      );
    } finally {
      setLeagueActionLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* League detail UI continues here */}
      {pendingLeagueRequests.length > 0 && isAdmin && (
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold">Solicitudes pendientes</h2>
          <div className="mt-3 space-y-2">
            {pendingLeagueRequests.map((request) => {
              const requestUser = leagueUsers?.find((item) => item.id === request.userId);
              return (
                <div key={request.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div>
                    <div className="font-medium">{requestUser?.name ?? request.userId}</div>
                    {request.message && <div className="text-sm opacity-70">{request.message}</div>}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void handleApproveLeagueRequest(request.id, request.userId)}>
                      Aceptar
                    </button>
                    <button type="button" onClick={() => void handleRejectLeagueRequest(request.id)}>
                      Rechazar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
