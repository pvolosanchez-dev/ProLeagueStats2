import { ArrowLeft, UserRound } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAsync } from '@/hooks';
import { authService, memberService, leagueService, teamService } from '@/services';
import { Avatar, ErrorState, LoadingState, TeamBadge } from '@/components';

export function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const { data: profile, loading: profileLoading, error: profileError } = useAsync(
    () => (userId ? authService.getUserById(userId) : Promise.resolve(null)),
    [userId],
  );

  const { data: memberships, loading: membershipsLoading } = useAsync(
    () => (userId ? memberService.getMembershipsByUser(userId) : Promise.resolve([])),
    [userId],
  );

  const { data: leagues, loading: leaguesLoading } = useAsync(
    () => leagueService.getLeagues(),
    [],
  );

  const { data: teams, loading: teamsLoading } = useAsync(
    () => teamService.getTeams(),
    [],
  );

  if (profileLoading || membershipsLoading || leaguesLoading || teamsLoading) {
    return <LoadingState />;
  }

  if (profileError) {
    return <ErrorState message={profileError} />;
  }

  if (!profile) {
    return <ErrorState message="Usuario no encontrado" />;
  }

  const membershipDetails = (memberships ?? [])
    .map((membership) => ({
      membership,
      league: (leagues ?? []).find((league) => league.id === membership.leagueId),
      team: membership.teamId
        ? (teams ?? []).find((team) => team.id === membership.teamId)
        : null,
    }))
    .filter((item) => item.league);

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
      >
        <ArrowLeft size={16} />
        Volver
      </button>

      <section className="card overflow-hidden">
        <div className="h-28 bg-neutral-900" />
        <div className="px-6 pb-6">
          <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="rounded-full border-4 border-white bg-white">
              <Avatar user={profile} size="lg" />
            </div>
            <div className="pb-1">
              <h1 className="text-2xl font-bold text-neutral-900">{profile.name}</h1>
              <p className="text-sm text-neutral-500">@{profile.username}</p>
            </div>
          </div>

          {profile.bio && (
            <p className="mt-5 text-sm leading-6 text-neutral-700">{profile.bio}</p>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-neutral-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">ID</p>
              <p className="mt-1 break-all font-mono text-sm text-neutral-800">{profile.id}</p>
            </div>
            <div className="rounded-lg bg-neutral-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Miembro desde</p>
              <p className="mt-1 text-sm text-neutral-800">
                {new Date(profile.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="border-b border-neutral-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <UserRound size={20} className="text-neutral-400" />
            <h2 className="text-lg font-semibold text-neutral-900">Ligas y equipos</h2>
          </div>
        </div>

        {membershipDetails.length === 0 ? (
          <div className="p-6 text-sm text-neutral-500">Este usuario todavía no pertenece a ninguna liga activa.</div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {membershipDetails.map(({ membership, league, team }) => (
              <div key={membership.id} className="flex items-center gap-4 p-5">
                {team ? (
                  <TeamBadge
                    name={team.name}
                    shortName={team.shortName}
                    color={team.color}
                    logoUrl={team.logoUrl}
                    size="md"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-neutral-100" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-neutral-900">{league?.name}</p>
                  <p className="text-sm text-neutral-500">
                    {team?.name ?? 'Sin equipo'} · {membership.role}
                  </p>
                </div>
                {team && (
                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard/teams/${team.id}`)}
                    className="btn-secondary text-sm"
                  >
                    Ver equipo
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
