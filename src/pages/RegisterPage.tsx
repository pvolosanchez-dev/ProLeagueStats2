import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/layouts';
import { useAuth } from '@/hooks';
import { Spinner } from '@/components';
import { Role } from '@/types';
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/utils/roles';

const roles: Role[] = ['owner', 'admin', 'captain', 'player'];

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('player');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(name, email, password, role);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Crea tu cuenta" subtitle="Únete y empieza a gestionar tu liga">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-error-50 border border-error-200 px-4 py-3 text-sm text-error-700">
            {error}
          </div>
        )}

        <div>
          <label className="label" htmlFor="name">Nombre completo</label>
          <input
            id="name"
            type="text"
            className="input"
            placeholder="Tu nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
          />
        </div>

        <div>
          <label className="label" htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            type="email"
            className="input"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            className="input"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        <div>
          <span className="label">Rol</span>
          <div className="grid grid-cols-2 gap-2">
            {roles.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`rounded-lg border px-3 py-2.5 text-left transition-all ${
                  role === r
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/20'
                    : 'border-neutral-300 bg-white hover:border-neutral-400'
                }`}
              >
                <span className="block text-sm font-semibold text-neutral-900">{ROLE_LABELS[r]}</span>
                <span className="block text-xs text-neutral-500">{ROLE_DESCRIPTIONS[r]}</span>
              </button>
            ))}
          </div>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? <Spinner /> : 'Crear cuenta'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
          Inicia sesión
        </Link>
      </p>
    </AuthLayout>
  );
}
