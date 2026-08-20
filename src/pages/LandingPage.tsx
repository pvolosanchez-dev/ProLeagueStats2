import { Link } from 'react-router-dom';
import { Trophy, BarChart3, Users, CalendarDays, ShieldCheck, Zap, ArrowRight } from 'lucide-react';
import { PublicLayout } from '@/layouts';

const features = [
  {
    icon: BarChart3,
    title: 'Estadísticas en tiempo real',
    description: 'Tabla de posiciones, goleadores y rendimiento de cada jugador actualizados tras cada jornada.',
  },
  {
    icon: CalendarDays,
    title: 'Calendario automático',
    description: 'Generación de fixture de doble vuelta con un clic. Organiza toda la temporada en segundos.',
  },
  {
    icon: Users,
    title: 'Gestión de plantillas',
    description: 'Registra jugadores, asigna capitanes y mantén los datos de cada equipo siempre al día.',
  },
  {
    icon: ShieldCheck,
    title: 'Roles y permisos',
    description: 'Propietario, administrador, capitán y jugador: cada rol ve y gestiona lo que le corresponde.',
  },
  {
    icon: Zap,
    title: 'Resultados instantáneos',
    description: 'Captura marcadores y la tabla, las estadísticas y las posiciones se recalculan al momento.',
  },
  {
    icon: Trophy,
    title: 'Múltiples ligas',
    description: 'Administra varias competiciones en paralelo, cada una con sus equipos y calendario propio.',
  },
];

export function LandingPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-900 pt-32 pb-24">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />
        <div className="relative mx-auto max-w-6xl px-6 text-center">
          <span className="badge bg-white/10 text-white border border-white/20 backdrop-blur-sm mb-6">
            <Zap size={12} className="mr-1" />
            Gestión deportiva profesional
          </span>
          <h1 className="font-display text-4xl font-extrabold text-white sm:text-5xl lg:text-6xl leading-tight">
            La plataforma completa para
            <span className="block text-accent-400">administrar tu liga</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-primary-100 leading-relaxed">
            ProLeagueStats te da control total sobre ligas, equipos, calendarios y estadísticas.
            Diseñada para federaciones, clubes y organizadores que quieren profesionalizar su gestión.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register" className="btn bg-white text-primary-700 hover:bg-neutral-100 shadow-lg px-6 py-3 text-base">
              Crear cuenta gratis
              <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-sm px-6 py-3 text-base">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-bold text-neutral-900">
            Todo lo que necesitas para dirigir tu liga
          </h2>
          <p className="mt-3 text-neutral-500 max-w-2xl mx-auto">
            Desde el calendario hasta la tabla de posiciones, pasando por plantillas y resultados.
            Una sola plataforma, sin hojas de cálculo.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="card p-6 transition-shadow hover:shadow-md">
              <div className="mb-4 inline-flex rounded-lg bg-primary-50 p-3">
                <feature.icon size={24} className="text-primary-600" />
              </div>
              <h3 className="text-base font-semibold text-neutral-900">{feature.title}</h3>
              <p className="mt-2 text-sm text-neutral-500 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-neutral-900 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-3xl font-bold text-white">
            ¿Listo para profesionalizar tu liga?
          </h2>
          <p className="mt-3 text-neutral-400">
            Crea tu cuenta en segundos y empieza a gestionar tu competición hoy mismo.
          </p>
          <Link to="/register" className="btn bg-primary-600 text-white hover:bg-primary-700 shadow-lg mt-8 px-6 py-3 text-base">
            Comenzar ahora
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-primary-600" />
            <span className="font-display font-bold text-neutral-900">ProLeagueStats</span>
          </div>
          <p className="text-sm text-neutral-400">© 2026 ProLeagueStats. Todos los derechos reservados.</p>
        </div>
      </footer>
    </PublicLayout>
  );
}
