import { TeamBadge } from './TeamBadge';
import { Avatar } from './Avatar';
import { RoleBadge } from './RoleBadge';
import { User, LeagueMember, Team } from '@/types';

interface MemberTableProps {
  members: LeagueMember[];
  users: User[];
  teams: Team[];
  currentUserId: string;
  canManageAdmin: boolean;
  canManageCaptain: boolean;
  canExpel: boolean;
  onAssignAdmin: (userId: string) => void;
  onRemoveAdmin: (userId: string) => void;
  onAssignCaptain: (userId: string) => void;
  onRemoveCaptain: (userId: string) => void;
  onExpel: (userId: string) => void;
}

export function MemberTable({
  members,
  users,
  teams,
  currentUserId,
  canManageAdmin,
  canManageCaptain,
  canExpel,
  onAssignAdmin,
  onRemoveAdmin,
  onAssignCaptain,
  onRemoveCaptain,
  onExpel,
}: MemberTableProps) {
  const userMap = new Map(users.map((u) => [u.id, u]));
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wider text-neutral-500">
            <th className="py-3 pl-4 pr-2 font-semibold">Usuario</th>
            <th className="px-2 py-3 font-semibold">ID</th>
            <th className="px-2 py-3 font-semibold">Equipo</th>
            <th className="px-2 py-3 font-semibold">Rol</th>
            <th className="px-2 py-3 font-semibold">Estado</th>
            <th className="px-2 py-3 pr-4 text-right font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => {
            const user = userMap.get(member.userId);
            const team = member.teamId ? teamMap.get(member.teamId) : null;
            const isSelf = member.userId === currentUserId;
            const isOwner = member.role === 'owner';

            return (
              <tr key={member.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                <td className="py-3 pl-4 pr-2">
                  <div className="flex items-center gap-2.5">
                    {user && <Avatar user={user} size="sm" />}
                    <div>
                      <p className="font-medium text-neutral-900">{user?.name ?? 'Usuario desconocido'}</p>
                      <p className="text-xs text-neutral-400">{user?.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-3">
                  <code className="text-xs text-neutral-400">{member.userId.slice(0, 12)}</code>
                </td>
                <td className="px-2 py-3">
                  {team ? (
                    <div className="flex items-center gap-2">
                      <TeamBadge name={team.name} shortName={team.shortName} color={team.color} size="sm" />
                      <span className="text-neutral-700">{team.shortName}</span>
                    </div>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </td>
                <td className="px-2 py-3">
                  <RoleBadge role={member.role} />
                </td>
                <td className="px-2 py-3">
                  {member.status === 'active' ? (
                    <span className="badge bg-success-100 text-success-700">Activo</span>
                  ) : (
                    <span className="badge bg-error-100 text-error-700">Expulsado</span>
                  )}
                </td>
                <td className="px-2 py-3 pr-4">
                  <div className="flex justify-end gap-1">
                    {isOwner || isSelf ? (
                      <span className="text-xs text-neutral-400">—</span>
                    ) : (
                      <>
                        {canManageAdmin && member.role === 'player' && (
                          <button
                            onClick={() => onAssignAdmin(member.userId)}
                            className="rounded-md px-2 py-1 text-xs font-medium text-secondary-600 hover:bg-secondary-50"
                            title="Convertir en Admin"
                          >
                            → Admin
                          </button>
                        )}
                        {canManageAdmin && member.role === 'admin' && (
                          <button
                            onClick={() => onRemoveAdmin(member.userId)}
                            className="rounded-md px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                            title="Quitar Admin"
                          >
                            Quitar Admin
                          </button>
                        )}
                        {canManageCaptain && (
                          <>
                            {member.role !== 'captain' && member.teamId && (
                              <button
                                onClick={() => onAssignCaptain(member.userId)}
                                className="rounded-md px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50"
                              >
                                → Capitán
                              </button>
                            )}
                            {member.role === 'captain' && (
                              <button
                                onClick={() => onRemoveCaptain(member.userId)}
                                className="rounded-md px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                              >
                                Quitar Cap.
                              </button>
                            )}
                          </>
                        )}
                        {canExpel && (
                          <button
                            onClick={() => onExpel(member.userId)}
                            className="rounded-md px-2 py-1 text-xs font-medium text-error-600 hover:bg-error-50"
                          >
                            Expulsar
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
