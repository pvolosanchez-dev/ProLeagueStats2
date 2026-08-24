import { useState } from 'react';
import { useAuth } from '@/hooks';
import { authService } from '@/services';
import { Avatar, RoleBadge, Spinner } from '@/components';
import {
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
} from '@/utils/roles';
import { formatDate } from '@/utils/date';
import {
  Shield,
  Mail,
  Calendar,
  Pencil,
  Save,
  X,
  Image,
} from 'lucide-react';

export function ProfilePage() {
  const { user } = useAuth();

  const [editing, setEditing] =
    useState(false);

  const [name, setName] =
    useState(user?.name ?? '');

  const [avatarUrl, setAvatarUrl] =
    useState(user?.avatarUrl ?? '');

  const [avatarColor, setAvatarColor] =
    useState(
      user?.avatarColor ?? '#0ea5e9',
    );

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  if (!user) return null;

  const handleStartEditing = () => {
    setName(user.name);
    setAvatarUrl(
      user.avatarUrl ?? '',
    );
    setAvatarColor(
      user.avatarColor,
    );
    setError(null);
    setEditing(true);
  };

  const handleCancel = () => {
    setName(user.name);
    setAvatarUrl(
      user.avatarUrl ?? '',
    );
    setAvatarColor(
      user.avatarColor,
    );
    setError(null);
    setEditing(false);
  };

  const handleSave = async () => {
    const trimmedName =
      name.trim();

    if (!trimmedName) {
      setError(
        'El nombre no puede estar vacío.',
      );
      return;
    }

    if (
      trimmedName.length < 2
    ) {
      setError(
        'El nombre debe tener al menos 2 caracteres.',
      );
      return;
    }

    if (
      trimmedName.length > 30
    ) {
      setError(
        'El nombre no puede superar los 30 caracteres.',
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await authService.updateProfile(
        user.id,
        {
          name: trimmedName,
          avatarUrl:
            avatarUrl.trim() || null,
          avatarColor,
        },
      );

      /*
       * Recargar para que useAuth
       * refleje inmediatamente los cambios.
       */
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar el perfil.',
      );
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Mi perfil
          </h1>

          <p className="mt-1 text-sm text-neutral-500">
            Personaliza la información que verán los demás.
          </p>
        </div>

        {!editing && (
          <button
            type="button"
            onClick={
              handleStartEditing
            }
            className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
          >
            <Pencil size={16} />
            Editar
          </button>
        )}
      </div>

      {/* Profile card */}
      <div className="card p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <Avatar
            user={user}
            size="lg"
          />

          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-neutral-900">
              {user.name}
            </h2>

            <div className="mt-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <RoleBadge
                role={user.role}
              />

              <span className="text-sm text-neutral-500">
                {ROLE_LABELS[user.role]}
              </span>
            </div>

            <p className="mt-2 text-sm text-neutral-500">
              {
                ROLE_DESCRIPTIONS[
                  user.role
                ]
              }
            </p>
          </div>
        </div>
      </div>

      {/* Editor */}
      {editing && (
        <div className="card p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-neutral-900">
              Personalización
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Cambia cómo aparece tu perfil en la liga.
            </p>
          </div>

          <div className="space-y-5">
            {/* Name */}
            <div>
              <label
                htmlFor="profile-name"
                className="mb-2 block text-sm font-medium text-neutral-700"
              >
                Nombre de usuario
              </label>

              <input
                id="profile-name"
                type="text"
                value={name}
                maxLength={30}
                onChange={(event) =>
                  setName(
                    event.target.value,
                  )
                }
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                placeholder="Tu nombre"
              />

              <p className="mt-1 text-xs text-neutral-400">
                {name.length}/30
              </p>
            </div>

            {/* Avatar URL */}
            <div>
              <label
                htmlFor="avatar-url"
                className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-700"
              >
                <Image size={16} />
                Foto o GIF
              </label>

              <input
                id="avatar-url"
                type="url"
                value={avatarUrl}
                onChange={(event) =>
                  setAvatarUrl(
                    event.target.value,
                  )
                }
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                placeholder="https://ejemplo.com/mi-foto.gif"
              />

              <p className="mt-1 text-xs text-neutral-400">
                Puedes usar una URL directa a una imagen o GIF.
              </p>
            </div>

            {/* Preview */}
            <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-400">
                Vista previa
              </p>

              <div className="flex items-center gap-3">
                <Avatar
                  user={{
                    name:
                      name.trim() ||
                      user.name,
                    avatarColor,
                    avatarUrl:
                      avatarUrl.trim() ||
                      null,
                  }}
                  size="lg"
                />

                <div>
                  <p className="font-semibold text-neutral-900">
                    {name.trim() ||
                      user.name}
                  </p>

                  <p className="text-sm text-neutral-500">
                    Tu perfil
                  </p>
                </div>
              </div>
            </div>

            {/* Fallback color */}
            <div>
              <label
                htmlFor="avatar-color"
                className="mb-2 block text-sm font-medium text-neutral-700"
              >
                Color del avatar
              </label>

              <div className="flex items-center gap-3">
                <input
                  id="avatar-color"
                  type="color"
                  value={
                    avatarColor
                  }
                  onChange={(event) =>
                    setAvatarColor(
                      event.target
                        .value,
                    )
                  }
                  className="h-10 w-14 cursor-pointer rounded border border-neutral-200 bg-white p-1"
                />

                <span className="text-sm text-neutral-500">
                  {avatarColor}
                </span>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={
                  handleCancel
                }
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
              >
                <X size={16} />
                Cancelar
              </button>

              <button
                type="button"
                onClick={
                  handleSave
                }
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Spinner size="sm" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Guardar cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details */}
      <div className="card divide-y divide-neutral-100">
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
            <Mail
              size={18}
              className="text-neutral-500"
            />
          </div>

          <div className="flex-1">
            <p className="text-xs text-neutral-400">
              Correo electrónico
            </p>

            <p className="text-sm font-medium text-neutral-900">
              {user.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
            <Shield
              size={18}
              className="text-neutral-500"
            />
          </div>

          <div className="flex-1">
            <p className="text-xs text-neutral-400">
              Rol
            </p>

            <p className="text-sm font-medium text-neutral-900">
              {
                ROLE_LABELS[
                  user.role
                ]
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
            <Calendar
              size={18}
              className="text-neutral-500"
            />
          </div>

          <div className="flex-1">
            <p className="text-xs text-neutral-400">
              Miembro desde
            </p>

            <p className="text-sm font-medium text-neutral-900">
              {formatDate(
                user.createdAt,
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}