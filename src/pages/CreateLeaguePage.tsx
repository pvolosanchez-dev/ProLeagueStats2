
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ImagePlus, Trophy } from 'lucide-react';
import { useAuth } from '@/hooks';
import { leagueService } from '@/services';
import {
  FORMAT_DESCRIPTIONS,
  FORMAT_LABELS,
  LeagueFormat,
  Sport,
} from '@/types';

const sports: Sport[] = ['Fútbol', 'Baloncesto', 'Voleibol'];

const formats: LeagueFormat[] = [
  'league',
  'league-playoff',
  'league-knockout',
  'custom',
];

export function CreateLeaguePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sport, setSport] = useState<Sport>('Fútbol');
  const [color, setColor] = useState('#2563eb');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [format, setFormat] = useState<LeagueFormat>('league');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogoChange = (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('La imagen no puede superar 2 MB.');
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setLogoUrl(typeof reader.result === 'string' ? reader.result : null);
      setError(null);
    };

    reader.onerror = () => {
      setError('No se pudo cargar la imagen.');
    };

    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!user) {
      setError('Debes iniciar sesión para crear una liga.');
      return;
    }

    if (!name.trim()) {
      setError('Escribe un nombre para la liga.');
      return;
    }

    if (name.trim().length < 3) {
      setError('El nombre de la liga debe tener al menos 3 caracteres.');
      return;
    }

    try {
      setSubmitting(true);

      const league = await leagueService.createLeague({
        name,
        description,
        sport,
        color,
        logoUrl,
        isPublic,
        inviteCode: inviteCode.trim() || null,
        format,
        ownerId: user.id,
      });

      navigate(`/dashboard/leagues/${league.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo crear la liga.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <button
        type="button"
        onClick={() => navigate('/dashboard/leagues')}
        className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft size={16} />
        Volver a ligas
      </button>

      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          Crear liga
        </h1>

        <p className="mt-1 text-sm text-neutral-500">
          Configura tu competición y conviértete automáticamente en su
          propietario.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="card p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-primary-600" />
            <h2 className="font-semibold text-neutral-900">
              Información de la liga
            </h2>
          </div>

          <div>
            <label className="label">Nombre</label>

            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Liga Nacional"
              maxLength={80}
            />
          </div>

          <div>
            <label className="label">Descripción</label>

            <textarea
              className="input min-h-28 resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe brevemente tu competición..."
              maxLength={500}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Deporte</label>

              <select
                className="input"
                value={sport}
                onChange={(e) => setSport(e.target.value as Sport)}
              >
                {sports.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Color principal</label>

              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border border-neutral-200 bg-white p-1"
                />

                <input
                  className="input flex-1"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#2563eb"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Logo</label>

            <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-neutral-300 p-4 hover:bg-neutral-50">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-neutral-100">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo de la liga"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImagePlus size={24} className="text-neutral-400" />
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-neutral-800">
                  Seleccionar imagen
                </p>

                <p className="text-xs text-neutral-500">
                  PNG, JPG o WEBP. Máximo 2 MB.
                </p>
              </div>

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  handleLogoChange(e.target.files?.[0] ?? null)
                }
              />
            </label>
          </div>
        </section>

        <section className="card p-6 space-y-5">
          <h2 className="font-semibold text-neutral-900">
            Privacidad e invitaciones
          </h2>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="mt-1 h-4 w-4"
            />

            <span>
              <span className="block text-sm font-medium text-neutral-900">
                Liga pública
              </span>

              <span className="block text-xs text-neutral-500">
                Los usuarios podrán encontrarla en el explorador de ligas.
              </span>
            </span>
          </label>

          <div>
            <label className="label">
              Código de invitación
            </label>

            <input
              className="input uppercase"
              value={inviteCode}
              onChange={(e) =>
                setInviteCode(
                  e.target.value.toUpperCase().replace(/\s/g, '')
                )
              }
              placeholder="Se generará automáticamente si lo dejas vacío"
              maxLength={12}
            />
          </div>
        </section>

        <section className="card p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-neutral-900">
              Formato de competición
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Puedes cambiar estas reglas más adelante mediante la
              administración de la liga.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {formats.map((item) => {
              const selected = item === format;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFormat(item)}
                  className={`rounded-xl border p-4 text-left transition ${
                    selected
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-neutral-900">
                      {FORMAT_LABELS[item]}
                    </span>

                    <span
                      className={`h-4 w-4 rounded-full border-2 ${
                        selected
                          ? 'border-primary-600 bg-primary-600'
                          : 'border-neutral-300'
                      }`}
                    />
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                    {FORMAT_DESCRIPTIONS[item]}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard/leagues')}
            className="btn-secondary"
            disabled={submitting}
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Creando...' : 'Crear liga'}
          </button>
        </div>
      </form>
    </div>
  );
}