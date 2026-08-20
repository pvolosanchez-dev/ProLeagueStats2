import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ArrowLeft } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <Trophy size={28} className="text-primary-600" />
            <span className="font-display text-2xl font-bold text-neutral-900">ProLeagueStats</span>
          </Link>
        </div>

        <div className="card p-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
          <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
          >
            <ArrowLeft size={16} />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
