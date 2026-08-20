import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/layouts';
import { useAuth } from '@/hooks';
import { Spinner } from '@/components';

const demoAccounts = [
  { label: 'Propietario', email: 'owner@proleague.demo' },
  { label: 'Administrador', email: 'admin@proleague.demo' },
  { label: 'Capitán', email: 'captain@proleague.demo' },
  { label: 'Jugador', email: 'player@proleague.demo' },
];

export function LoginPage() {
  const { login, loginAsDemo } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setError(null);
    setSubmitting(true);
    try {
      await loginAsDemo(demoEmail);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Bienvenido de vuelta" subtitle="Inicia sesión para acceder a tu panel">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-error-50 border border-error-200 px-4 py-3 text-sm text-error-700">
            {error}
          </div>
        )}

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
            autoComplete="email"
          />
        </div>

        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            className="input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? <Spinner /> : 'Iniciar sesión'}
        </button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs text-neutral-400">Cuentas de demostración</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {demoAccounts.map((account) => (
            <button
              key={account.email}
              onClick={() => handleDemoLogin(account.email)}
              disabled={submitting}
              className="btn-secondary text-xs"
            >
              {account.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-neutral-500">
        ¿No tienes cuenta?{' '}
        <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700">
          Regístrate aquí
        </Link>
      </p>
    </AuthLayout>
  );
}
