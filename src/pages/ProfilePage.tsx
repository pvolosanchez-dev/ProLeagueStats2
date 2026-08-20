import { useAuth } from '@/hooks';
import { Avatar, RoleBadge } from '@/components';
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/utils/roles';
import { formatDate } from '@/utils/date';
import { Shield, Mail, Calendar } from 'lucide-react';

export function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Mi perfil</h1>
        <p className="mt-1 text-sm text-neutral-500">Información de tu cuenta</p>
      </div>

      {/* Profile card */}
      <div className="card p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <Avatar user={user} size="lg" />
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-neutral-900">{user.name}</h2>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <RoleBadge role={user.role} />
              <span className="text-sm text-neutral-500">{ROLE_LABELS[user.role]}</span>
            </div>
            <p className="mt-2 text-sm text-neutral-500">{ROLE_DESCRIPTIONS[user.role]}</p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="card divide-y divide-neutral-100">
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
            <Mail size={18} className="text-neutral-500" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-neutral-400">Correo electrónico</p>
            <p className="text-sm font-medium text-neutral-900">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
            <Shield size={18} className="text-neutral-500" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-neutral-400">Rol</p>
            <p className="text-sm font-medium text-neutral-900">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
            <Calendar size={18} className="text-neutral-500" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-neutral-400">Miembro desde</p>
            <p className="text-sm font-medium text-neutral-900">{formatDate(user.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-xl bg-primary-50 border border-primary-100 p-5">
        <p className="text-sm text-primary-800">
          Esta es una versión de demostración con autenticación simulada. Los datos se guardan
          localmente en tu navegador y la aplicación está preparada para conectarse a un backend real
          en el futuro sin cambios en la interfaz.
        </p>
      </div>
    </div>
  );
}
