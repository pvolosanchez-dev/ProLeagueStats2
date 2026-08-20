import { NavLink } from 'react-router-dom';
import { BarChart3, CalendarDays, Users, Trophy, Award, UsersRound, Settings, LayoutDashboard } from 'lucide-react';

interface LeagueNavProps {
  leagueId: string;
  isAdmin: boolean;
}

const baseItems = [
  { to: '', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: 'teams', label: 'Equipos', icon: Users, end: false },
  { to: 'players', label: 'Jugadores', icon: UsersRound, end: false },
  { to: 'calendar', label: 'Calendario', icon: CalendarDays, end: false },
  { to: 'standings', label: 'Tabla', icon: BarChart3, end: false },
  { to: 'stats', label: 'Estadísticas', icon: Trophy, end: false },
  { to: 'awards', label: 'Premios', icon: Award, end: false },
  { to: 'members', label: 'Miembros', icon: UsersRound, end: false },
];

const adminItems = [
  { to: 'admin', label: 'Administración', icon: Settings, end: false },
];

export function LeagueNav({ leagueId, isAdmin }: LeagueNavProps) {
  const items = isAdmin ? [...baseItems, ...adminItems] : baseItems;

  return (
    <div className="card overflow-x-auto">
      <div className="flex gap-1 px-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to ? `/dashboard/leagues/${leagueId}/${item.to}` : `/dashboard/leagues/${leagueId}`}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`
            }
          >
            <item.icon size={16} />
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
