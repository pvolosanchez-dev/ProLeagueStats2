import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} size={20} />;
}

export function LoadingState({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <Spinner className="text-primary-500" />
      <p className="text-sm text-neutral-500">{message}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16">
      <p className="text-sm text-error-600 font-medium">{message}</p>
    </div>
  );
}

export function EmptyState({ title, message, icon }: { title: string; message: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      {icon && <div className="text-neutral-300 mb-2">{icon}</div>}
      <p className="text-sm font-semibold text-neutral-700">{title}</p>
      <p className="text-sm text-neutral-500 max-w-sm">{message}</p>
    </div>
  );
}
