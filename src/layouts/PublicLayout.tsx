import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="absolute top-0 left-0 right-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-2">
            <Trophy size={24} className="text-primary-600" />
            <span className="font-display text-xl font-bold text-white">ProLeagueStats</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link to="/login" className="text-sm font-medium text-white/90 hover:text-white transition-colors">
              Iniciar sesión
            </Link>
            <Link to="/register" className="btn bg-white text-neutral-900 hover:bg-neutral-100">
              Crear cuenta
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
