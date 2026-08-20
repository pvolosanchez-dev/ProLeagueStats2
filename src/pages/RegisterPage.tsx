import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/layouts';
import { useAuth } from '@/hooks';
import { Spinner } from '@/components';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await register(name, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo crear la cuenta.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Crea tu cuenta"
      subtitle="Únete y empieza a gestionar tu liga"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-error-50 border border-error-200 px-4 py-3 text-sm text-error-700">
            {error}
          </div>
        )}

        <div>
          <label className="label" htmlFor="name">
            Nombre completo
          </label>

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
          <label className="label" htmlFor="email">
            Correo electrónico
          </label>

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
          <label className="label" htmlFor="password">
            Contraseña
          </label>

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

        <div className="rounded-lg border border-primary-100 bg-primary-50 px-4 py-3">
          <p className="text-sm font-medium text-primary-900">
            Tu rol se asigna automáticamente
          </p>

          <p className="mt-1 text-xs text-primary-700">
            Al registrarte serás un jugador. Cuando crees una liga,
            automáticamente te convertirás en su propietario.
          </p>
        </div>

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={submitting}
        >
          {submitting ? <Spinner /> : 'Crear cuenta'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        ¿Ya tienes cuenta?{' '}
        <Link
          to="/login"
          className="font-semibold text-primary-600 hover:text-primary-700"
        >
          Inicia sesión
        </Link>
      </p>
    </AuthLayout>
  );
}