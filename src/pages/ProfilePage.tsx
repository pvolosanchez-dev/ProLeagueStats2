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
  Upload,
  Image,
  Film,
} from 'lucide-react';

const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;
const MAX_GIF_BYTES = 2 * 1024 * 1024;

function readFileAsDataUrl(file: File, maxBytes: number): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Solo puedes subir archivos de imagen.');
  }

  if (file.size > maxBytes) {
    throw new Error(
      `El archivo es demasiado grande. El máximo permitido es ${Math.round(maxBytes / 1024 / 1024)} MB.`,
    );
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('No se pudo leer la imagen.'));
        return;
      }

      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(new Error('No se pudo leer la imagen.'));
    };

    reader.readAsDataURL(file);
  });
}

export function ProfilePage() {
  const { user } = useAuth();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [profileGifUrl, setProfileGifUrl] = useState(user?.profileGifUrl ?? '');
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor ?? '#0ea5e9');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const handleStartEditing = () => {
    setName(user.name);
    setUsername(user.username);
    setAvatarUrl(user.avatarUrl ?? '');
    setProfileGifUrl(user.profileGifUrl ?? '');
    setAvatarColor(user.avatarColor);
    setError(null);
    setEditing(true);
  };

  const handleCancel = () => {
    setName(user.name);
    setUsername(user.username);
    setAvatarUrl(user.avatarUrl ?? '');
    setProfileGifUrl(user.profileGifUrl ?? '');
    setAvatarColor(user.avatarColor);
    setError(null);
    setEditing(false);
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'photo' | 'gif',
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    try {
      const dataUrl = await readFileAsDataUrl(
        file,
        type === 'gif' ? MAX_GIF_BYTES : MAX_IMAGE_BYTES,
      );

      if (type === 'gif') {
        if (file.type !== 'image/gif') {
          throw new Error('Para el GIF debes seleccionar un archivo .gif.');
        }

        setProfileGifUrl(dataUrl);
      } else {
        setAvatarUrl(dataUrl);
      }

      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar la imagen.',
      );
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedUsername = username.trim().toLowerCase();

    if (!trimmedName) {
      setError('El nombre no puede estar vacío.');
      return;
    }

    if (trimmedName.length > 40) {
      setError('El nombre no puede superar 40 caracteres.');
      return;
    }

    if (!/^[a-z0-9_]+$/.test(trimmedUsername) || trimmedUsername.length < 3) {
      setError('El username debe tener entre 3 y 20 caracteres y solo usar letras, números y _.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await authService.updateProfile(user.id, {
        name: trimmedName,
        username: trimmedUsername,
        avatarUrl: avatarUrl.trim() || null,
        profileGifUrl: profileGifUrl.trim() || null,
        avatarColor,
      });

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
          <h1 className="text-2xl font-bold text-neutral-900">Mi perfil</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Personaliza cómo apareces dentro de ProLeagueStats.
          </p>
        </div>

        {!editing && (
          <button
            type="button"
            onClick={handleStartEditing}
            className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            <Pencil size={16} />
            Editar
          </button>
        )}
      </div>

      <div className="card p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <Avatar user={user} size="lg" />

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-neutral-900">
              {user.name}
            </h2>
            <p className="mt-1 text-sm font-medium text-primary-600">
              @{user.username}
            </p>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <RoleBadge role={user.role} />
              <span className="text-sm text-neutral-500">
                {ROLE_LABELS[user.role]}
              </span>
            </div>

            <p className="mt-2 text-sm text-neutral-500">
              {ROLE_DESCRIPTIONS[user.role]}
            </p>
          </div>
        </div>
      </div>

      {editing && (
        <div className="card p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-neutral-900">Personalización</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Puedes usar imágenes desde tu dispositivo o URLs directas.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label htmlFor="profile-name" className="mb-2 block text-sm font-medium text-neutral-700">
                Nombre visible
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                maxLength={40}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                placeholder="Tu nombre"
              />
            </div>

            <div>
              <label htmlFor="profile-username" className="mb-2 block text-sm font-medium text-neutral-700">
                Nombre de usuario
              </label>
              <div className="flex items-center rounded-lg border border-neutral-200 bg-white focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100">
                <span className="pl-3 text-sm text-neutral-400">@</span>
                <input
                  id="profile-username"
                  type="text"
                  value={username}
                  maxLength={20}
                  onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm outline-none"
                  placeholder="usuario"
                />
              </div>
              <p className="mt-1 text-xs text-neutral-400">
                Solo letras, números y guiones bajos.
              </p>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-700">
                <Upload size={16} />
                Foto de perfil
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => handleImageUpload(event, 'photo')}
                className="block w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              />
              <input
                type="url"
                value={avatarUrl.startsWith('data:') ? '' : avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                placeholder="O pega una URL directa"
              />
              <p className="mt-1 text-xs text-neutral-400">
                Máximo 1.5 MB al subir desde el dispositivo.
              </p>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-700">
                <Film size={16} />
                GIF de perfil
              </label>
              <input
                type="file"
                accept="image/gif"
                onChange={(event) => handleImageUpload(event, 'gif')}
                className="block w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              />
              <input
                type="url"
                value={profileGifUrl.startsWith('data:') ? '' : profileGifUrl}
                onChange={(event) => setProfileGifUrl(event.target.value)}
                className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                placeholder="O pega una URL directa a un GIF"
              />
              <p className="mt-1 text-xs text-neutral-400">
                Máximo 2 MB al subir desde el dispositivo. El GIF tiene prioridad sobre la foto.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-400">
                Vista previa
              </p>
              <div className="flex items-center gap-3">
                <Avatar
                  user={{
                    ...user,
                    name: name.trim() || user.name,
                    avatarUrl: avatarUrl.trim() || null,
                    profileGifUrl: profileGifUrl.trim() || null,
                    avatarColor,
                  }}
                  size="lg"
                />
                <div>
                  <p className="font-semibold text-neutral-900">
                    {name.trim() || user.name}
                  </p>
                  <p className="text-sm text-primary-600">
                    @{username || user.username}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="avatar-color" className="mb-2 block text-sm font-medium text-neutral-700">
                Color de respaldo
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="avatar-color"
                  type="color"
                  value={avatarColor}
                  onChange={(event) => setAvatarColor(event.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border border-neutral-200 bg-white p-1"
                />
                <span className="text-sm text-neutral-500">{avatarColor}</span>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                <X size={16} />
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
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

        <div className="flex items-center gap-3 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
            <Image size={18} className="text-neutral-500" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-neutral-400">Identidad pública</p>
            <p className="text-sm font-medium text-neutral-900">@{user.username}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
