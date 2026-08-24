import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarDays, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAsync, useAuth } from '@/hooks';
import { matchService, memberService, scheduleService, seasonService, teamService } from '@/services';
import { ErrorState, LoadingState } from '@/components';

export function SchedulePage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user } = useAuth();
  const [legs, setLegs] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: membership, loading: membershipLoading } = useAsync(
    () => leagueId && user ? memberService.getMemberByUser(leagueId, user.id) : Promise.resolve(null),
    [leagueId, user?.id],
  );

  const { data: season, loading: seasonLoading } = useAsync(
    () => leagueId ? seasonService.getActiveSeason(leagueId) : Promise.resolve(null),
    [leagueId, refreshKey],
  );

  const { data: teams, loading: teamsLoading } = useAsync(
    () => leagueId ? teamService.getTeamsByLeague(leagueId) : Promise.resolve([]),
    [leagueId, refreshKey],
  );

  const { data: matches, loading: matchesLoading } = useAsync(
    () => leagueId ? matchService.getMatches() : Promise.resolve([]),
    [leagueId, refreshKey],
  );

  if (membershipLoading || seasonLoading || teamsLoading || matchesLoading) {
    return <LoadingState />;
  }

  const isAdmin = membership?.status === 'active' && (membership.role === 'owner' || membership.role === 'admin');

  if (!isAdmin) {
    return <ErrorState message="Solo el propietario o administrador puede generar el calendario." />;
  }

  if (!leagueId) {
    return <ErrorState message="Liga no encontrada." />;
  }

  const regularMatches = (matches ?? []).filter(
    (match) => match.leagueId === leagueId && match.seasonId === season?.id && match.phase === 'regular',
  );

  const rounds = new Set(regularMatches.map((match) => match.round)).size;
  const expectedRounds = teams && teams.length % 2 === 0 ? teams.length - 1 : teams.length;
  const expectedMatches = teams && teams.length >= 2 ? (teams.length * (teams.length - 1) * legs) / 2 : 0;
  const alreadyGenerated = regularMatches.length > 0;

  const handleGenerate = async () => {
    if (!user || !season) return;

    const confirmText = alreadyGenerated
      ? 'Ya existe un calendario para esta temporada. No se generará otro.'
      : `Se generarán ${expectedMatches} partidos en ${expectedRounds * legs} jornadas. ¿Continuar?`;

    if (alreadyGenerated) {
      setErrorMessage(confirmText);
      setMessage(null);
      return;
    }

    if (!window.confirm(confirmText)) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      setMessage(null);
      const generated = await scheduleService.generateSeasonSchedule(leagueId, season.id, user.id, legs);
      setMessage(`Calendario generado correctamente: ${generated.length} partidos en ${expectedRounds * legs} jornadas.`);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo generar el calendario.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Generar calendario</h1>
        <p className="mt-1 text-sm text-neutral-500">Crea automáticamente todos los partidos de la fase regular.</p>
      </div>

      {!season && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">No hay una temporada activa</p>
              <p className="mt-1">Activa una temporada antes de generar su calendario.</p>
            </div>
          </div>
        </div>
      )}

      {season && (
        <>
          <div className="card p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                <CalendarDays size={24} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Temporada activa</p>
                <h2 className="mt-1 text-lg font-bold text-neutral-900">{season.name}</h2>
                <p className="mt-1 text-sm text-neutral-500">{teams?.length ?? 0} equipos · {regularMatches.length} partidos generados · {rounds} jornadas</p>
              </div>
            </div>
          </div>

          <div className="card p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Formato del calendario</h2>
              <p className="mt-1 text-sm text-neutral-500">El sistema usa todos contra todos y, si eliges ida y vuelta, invierte la localía en la segunda vuelta.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setLegs(1)} className={`rounded-xl border p-4 text-left transition-colors ${legs === 1 ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 hover:border-neutral-300'}`}>
                <p className="font-semibold text-neutral-900">Una vuelta</p>
                <p className="mt-1 text-sm text-neutral-500">Cada equipo juega contra todos una vez.</p>
              </button>
              <button type="button" onClick={() => setLegs(2)} className={`rounded-xl border p-4 text-left transition-colors ${legs === 2 ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 hover:border-neutral-300'}`}>
                <p className="font-semibold text-neutral-900">Ida y vuelta</p>
                <p className="mt-1 text-sm text-neutral-500">Cada enfrentamiento se juega dos veces con localías invertidas.</p>
              </button>
            </div>

            <div className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-600">
              <p><strong>{teams?.length ?? 0}</strong> equipos · <strong>{expectedRounds * legs}</strong> jornadas · <strong>{expectedMatches}</strong> partidos</p>
              {teams && teams.length % 2 !== 0 && <p className="mt-1">Al haber un número impar de equipos, cada jornada tendrá un descanso (BYE).</p>}
            </div>

            {message && (
              <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                <p>{message}</p>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                <p>{errorMessage}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading || !season || (teams?.length ?? 0) < 2 || alreadyGenerated}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <RefreshCw size={17} className="animate-spin" /> : <CalendarDays size={17} />}
              {alreadyGenerated ? 'Calendario ya generado' : loading ? 'Generando calendario...' : 'Generar calendario automáticamente'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
