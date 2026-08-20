import { ReactNode, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Trophy, Menu, X, LayoutDashboard, LogOut, User as UserIcon, Plus, Bell, Search } from 'lucide-react';
import { useAuth } from '@/hooks';
import { Avatar, NotificationBell } from '@/components';

interface DashboardLayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: '/dashboard', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/dashboard/leagues', label: 'Mis Ligas', icon: Trophy, end: false },
  { to: '/dashboard/leagues/create', label: 'Crear Liga', icon: Plus, end: false },
  { to: '/dashboard/leagues', label: 'Unirse a Liga', icon: Search, end: false },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 lg:hidden">
        <Link to="/dashboard" className="flex items-center gap-2">
          <Trophy size={22} className="text-primary-600" />
          <span className="font-display text-lg font-bold text-neutral-900">ProLeagueStats</span>
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'fixed inset-y-0 left-0 z-40 w-64' : 'hidden'
          } shrink-0 border-r border-neutral-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64`}
        >
          <div className="flex w-64 flex-col">
            <div className="flex items-center gap-2 border-b border-neutral-200 px-5 py-4">
              <Trophy size={22} className="text-primary-600" />
              <Link to="/dashboard" className="font-display text-lg font-bold text-neutral-900">
                ProLeagueStats
              </Link>
            </div>

            <nav className="flex-1 space-y-1 px-3 py-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                    }`
                  }
                >
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="border-t border-neutral-200 p-3">
              <div className="flex items-center gap-3 rounded-lg px-3 py-2">
                <Avatar user={user} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900">{user.name}</p>
                  <p className="truncate text-xs text-neutral-400">{user.email}</p>
                </div>
              </div>
              <div className="mt-1 space-y-1">
                <Link
                  to="/dashboard/profile"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                >
                  <UserIcon size={18} />
                  Mi perfil
                </Link>
                <Link
                  to="/dashboard/notifications"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                >
                  <Bell size={18} />
                  Notificaciones
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-error-600 hover:bg-error-50 transition-colors"
                >
                  <LogOut size={18} />
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-neutral-900/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
