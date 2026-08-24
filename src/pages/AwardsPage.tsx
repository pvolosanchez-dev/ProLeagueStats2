import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Trophy, Medal, Target, Award } from 'lucide-react';
import { useAsync } from '@/hooks';
import { awardServiceV2, leagueService } from '@/services';
import { LoadingState, ErrorState } from '@/components';

export function AwardsPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [section, setSection] = useState<'ballon' | 'boot' | 'puskas' | 'stats'>('ballon');

  const { data: league, loading: leagueLoading, error: leagueError } = useAsync(
    () => leagueService.getLeagueById(leagueId!),
    [leagueId],
  );

  const seasonId = league?.seasonId ?? null;
  const { data: ballon, loading: ballonLoading } = useAsync(
    () => seasonId && leagueId ? awardServiceV2.getBallonDorCandidates(leagueId, seasonId) : Promise.resolve([]),
    [leagueId, seasonId],
  );
  const { data: boot, loading: bootLoading } = useAsync(
    () => seasonId && leagueId ? awardServiceV2.getGoldenBootCandidates(leagueId, seasonId) : Promise.resolve([]),
    [leagueId, seasonId],
  );
  const { data: puskas, loading: puskasLoading } = useAsync(
    () => seasonId && leagueId ? awardServiceV2.getPuskasNominations(leagueId, seasonId) : Promise.resolve([]),
    [leagueId, seasonId],
  );
  const { data: performance, loading: performanceLoading } = useAsync(
    () => seasonId && leagueId ? awardServiceV2.getAllPlayerPerformance(leagueId, seasonId) : Promise.resolve([]),
    [leagueId, seasonId],
  );

  if (leagueLoading || ballonLoading || bootLoading || puskasLoading || performanceLoading) return <LoadingState />;
  if (leagueError) return <ErrorState message={leagueError} />;
  if (!league) return <ErrorState message="Liga no encontrada" />;
  if (!seasonId) {
    return <div className="card p-8 text-center text-sm text-neutral-500">Esta liga todavía no tiene una temporada activa.</div>;
  }

  const tabs = [
    { id: 'ballon' as const, label: 'Balón de Oro', icon: Trophy },
    { id: 'boot' as const, label: 'Bota de Oro', icon: Medal },
    { id: 'puskas' as const, label: 'Puskás', icon: Target },
    { id: 'stats' as const, label: 'Rendimiento', icon: Award },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Reconocimientos</h1>
        <p className="mt-1 text-sm text-neutral-500">Premios y rendimiento individual de la temporada.</p>
      </div>

      <div className="card overflow-hidden">
        <div className="flex gap-1 overflow-x-auto border-b border-neutral-200 px-4">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" onClick={() => setSection(item.id)} className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium ${section === item.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}>
                <Icon size={16} />{item.label}
              </button>
            );
          })}
        </div>

        {section === 'ballon' && (
          <div className="p-4 sm:p-6">
            <div className="mb-4 rounded-lg border border-amber-100 bg-amber-50 p-4">
              <p className="font-semibold text-amber-900">Top 20 Balón de Oro</p>
              <p className="mt-1 text-xs text-amber-800">Durante la temporada se muestra únicamente la puntuación de cada candidato. La puntuación no determina automáticamente al ganador.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead><tr className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-400"><th className="px-3 py-3">Pos.</th><th className="px-3 py-3">Jugador</th><th className="px-3 py-3">Equipo</th><th className="px-3 py-3 text-right">Puntos</th></tr></thead>
                <tbody>{ballon.map((candidate) => <tr key={candidate.playerId} className="border-b border-neutral-100"><td className="px-3 py-3 font-bold">{candidate.rank}</td><td className="px-3 py-3 font-medium text-neutral-900">{candidate.playerName}</td><td className="px-3 py-3 text-neutral-500">{candidate.teamName}</td><td className="px-3 py-3 text-right font-bold text-primary-700">{candidate.performancePoints}</td></tr>)}</tbody>
              </table>
              {ballon.length === 0 && <p className="py-8 text-center text-sm text-neutral-500">Todavía no hay jugadores con estadísticas.</p>}
            </div>
          </div>
        )}

        {section === 'boot' && (
          <div className="p-4 sm:p-6">
            <div className="mb-4 rounded-lg border border-primary-100 bg-primary-50 p-4"><p className="font-semibold text-neutral-900">Top 15 Bota de Oro</p><p className="mt-1 text-xs text-neutral-600">Se ordena por goles y después asistencias. El primer lugar será el ganador al finalizar la temporada.</p></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead><tr className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-400"><th className="px-3 py-3">Pos.</th><th className="px-3 py-3">Jugador</th><th className="px-3 py-3">Equipo</th><th className="px-3 py-3 text-right">Goles</th><th className="px-3 py-3 text-right">Pases</th><th className="px-3 py-3 text-right">Puntos</th></tr></thead><tbody>{boot.map((candidate) => <tr key={candidate.playerId} className="border-b border-neutral-100"><td className="px-3 py-3 font-bold">{candidate.rank}</td><td className="px-3 py-3 font-medium text-neutral-900">{candidate.playerName}</td><td className="px-3 py-3 text-neutral-500">{candidate.teamName}</td><td className="px-3 py-3 text-right font-semibold">{candidate.goals}</td><td className="px-3 py-3 text-right">{candidate.assists}</td><td className="px-3 py-3 text-right font-bold text-primary-700">{candidate.performancePoints}</td></tr>)}</tbody></table>{boot.length === 0 && <p className="py-8 text-center text-sm text-neutral-500">Todavía no hay jugadores con estadísticas.</p>}</div>
          </div>
        )}

        {section === 'puskas' && (
          <div className="p-4 sm:p-6">
            <div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4"><p className="font-semibold text-neutral-900">Nominados al Puskás</p><p className="mt-1 text-xs text-neutral-500">Los videos se registran en Discord. Aquí se muestra el jugador y su nominación.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">{puskas.map((nomination) => <div key={nomination.id} className="rounded-xl border border-neutral-200 p-4"><p className="font-semibold text-neutral-900">{nomination.playerName}</p><p className="mt-1 text-sm text-neutral-500">Nominado a Puskás · video en Discord</p>{nomination.isWinner && <p className="mt-3 text-sm font-semibold text-amber-700">🏆 Ganador del Puskás</p>}</div>)}</div>{puskas.length === 0 && <p className="py-8 text-center text-sm text-neutral-500">Todavía no hay nominaciones.</p>}
          </div>
        )}

        {section === 'stats' && (
          <div className="p-4 sm:p-6">
            <div className="mb-4"><p className="font-semibold text-neutral-900">Rendimiento de todos los jugadores</p><p className="mt-1 text-xs text-neutral-500">Todos aparecen ordenados por goles, pases y MVPs. No hay límite de jugadores.</p></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-sm"><thead><tr className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-400"><th className="px-3 py-3">Pos.</th><th className="px-3 py-3">Jugador</th><th className="px-3 py-3">Equipo</th><th className="px-3 py-3 text-right">Goles</th><th className="px-3 py-3 text-right">Pases</th><th className="px-3 py-3 text-right">MVP</th></tr></thead><tbody>{performance.map((candidate) => <tr key={candidate.playerId} className="border-b border-neutral-100"><td className="px-3 py-3 font-bold">{candidate.rank}</td><td className="px-3 py-3 font-medium text-neutral-900">{candidate.playerName}</td><td className="px-3 py-3 text-neutral-500">{candidate.teamName}</td><td className="px-3 py-3 text-right">{candidate.goals}</td><td className="px-3 py-3 text-right">{candidate.assists}</td><td className="px-3 py-3 text-right">{candidate.mvpAwards}</td></tr>)}</tbody></table>{performance.length === 0 && <p className="py-8 text-center text-sm text-neutral-500">Todavía no hay jugadores registrados.</p>}</div>
          </div>
        )}
      </div>
    </div>
  );
}
