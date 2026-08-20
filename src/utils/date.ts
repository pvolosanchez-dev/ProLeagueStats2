export const CURRENT_DATE = '2026-08-19T00:00:00.000Z';

export function addDays(dateIso: string, days: number): string {
  const date = new Date(dateIso);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function isPast(dateIso: string): boolean {
  return new Date(dateIso).getTime() < new Date(CURRENT_DATE).getTime();
}

export function formatDate(dateIso: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateIso));
}

export function formatDateTime(dateIso: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateIso));
}
