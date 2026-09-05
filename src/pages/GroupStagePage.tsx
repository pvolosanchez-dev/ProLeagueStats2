import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, RefreshCw, Trophy } from 'lucide-react';
import { useAuth } from '@/hooks';
import { groupStageService, leagueService, matchService, seasonService, teamService } from '@/services';
import type { GroupStageConfig, League, Season, Team } from '@/types';
import type { GroupStage } from '@/services/groupStageService';

export function GroupStagePage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [league, setLeague] = useState<League | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [groups, setGroups] = useState<GroupStage[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [groupMatches, setGroupMatches] = useState(0);
  const [finishedMatches, setFinishedMatches] = useState(0);
  const [standings, setStandings] = useState<Record<string, Awaited<ReturnType<typeof groupStageService.getGroupStandings>>>>({});

  const config = league?.groupStageConfig as GroupStageConfig | null;
  const configuredGroups = config?.groupCount ?? 4;

  const load = async () => {
    if (!leagueId) return;
    try {
      setLoading(true);
      setError(null);
      const [leagueData, seasonData, teamData] = await Promise.all([
        leagueService.getLeagueById(leagueId),
        seasonService.getActiveSeason(leagueId),
        teamService.getTeamsByLeague(leagueId),
      ]);
      if (!leagueData) throw new Error('Liga no encontrada.');
      if (!seasonData) throw new Error('No existe una temporada activa.');
      setLeague(leagueData);
      setSeason(seasonData);
      setTeams(teamData);
      const groupData = await groupStageService.getGroups(seasonData.id);
      setGroups(groupData);

      const nextAssignments: Record<string, string[]> = {};
      for (const group of groupData) nextAssignments[group.id] = await groupStageService.getGroupTeamIds(group.id);
      setAssignments(nextAssignments);

      if (groupData.length) {
        const matches = await matchService.getMatchesByLeague(leagueId);
        const groupOnly = matches.filter((match) => match.seasonId === seasonData.id && match.phase === 'group');
        setGroupMatches(groupOnly.length);
        setFinishedMatches(groupOnly.filter((match) => match.status === 'finished').length);
        const tableEntries = await Promise.all(groupData.map(async (group) => [group.id, await groupStageService.getGroupStandings(group.id)] as const));
        setStandings(Object.fromEntries(tableEntries));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la fase de grupos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [leagueId]);

  const assignedTeamIds = useMemo(() => new Set(Object.values(assignments).flat()), [assignments]);
  const allAssigned = groups.length > 0 && groups.every((group) => (assignments[group.id] ?? []).length >= 2) && assignedTeamIds.size === groups.reduce((sum, group) => sum + (assignments[group.id] ?? []).length, 0);
  const groupStageDone = groupMatches > 0 && groupMatches === finishedMatches;

  const createGroups = async () => {
    if (!leagueId || !season || !user || !config) return;
    try {
      setWorking(true); setError(null); setMessage(null);
      const created = await groupStageService.createGroups(leagueId, season.id, user.id, config);
      setGroups(created);
      const next: Record<string, string[]> = {};
      created.forEach((group) => { next[group.id] = []; });
      setAssignments(next);
      setMessage('Grupos creados. Ahora asigna los equipos.');
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudieron crear los grupos.'); }
    finally { setWorking(false); }
  };

  const saveAssignments = async () => {
    if (!leagueId || !season || !user) return;
    try {
      setWorking(true); setError(null); setMessage(null);
      await groupStageService.assignTeams(leagueId, season.id, user.id, assignments);
      setMessage('Equipos asignados correctamente.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudieron guardar los equipos.'); }
    finally { setWorking(false); }
  };

  const generateMatches = async () => {
    if (!leagueId || !season || !user) return;
    try {
      setWorking(true); setError(null); setMessage(null);
      await groupStageService.generateGroupMatches(leagueId, season.id, user.id);
      await load();
      setMessage('Partidos de todos los grupos generados.');
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudieron generar los partidos.'); }
    finally { setWorking(false); }
  };

  const generateKnockout = async () => {
    if (!leagueId || !season || !user) return;
    try {
      setWorking(true); setError(null); setMessage(null);
      await groupStageService.generateKnockout(leagueId, season.id, user.id);
      await load();
      setMessage('Eliminación generada automáticamente.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Todavía no se puede generar la eliminación.'); }
    finally { setWorking(false); }
  };

  const moveTeam = (teamId: string, targetGroupId: string) => {
    setAssignments((current) => {
      const next: Record<string, string[]> = {};
      Object.entries(current).forEach(([groupId, ids]) => { next[groupId] = ids.filter((id) => id !== teamId); });
      next[targetGroupId] = [...(next[targetGroupId] ?? []), teamId];
      return next;
    });
  };

  if (loading) return <div className="p-6 text-sm text-neutral-500">Cargando fase de grupos...</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      <button type="button" onClick={() => navigate(`/dashboard/leagues/${leagueId}`)} className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-800"><ArrowLeft size={16} /> Volver a la liga</button>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="flex items-center gap-2"><Trophy size={22} className="text-primary-600" /><h1 className="text-2xl font-bold text-neutral-900">Fase de grupos</h1></div><p className="mt-1 text-sm text-neutral-500">{league?.name} · {season?.name}</p></div><button type="button" onClick={() => void load()} className="btn-secondary inline-flex items-center gap-2"><RefreshCw size={16} /> Actualizar</button></div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}

      {!groups.length ? (
        <section className="card space-y-4 p-6"><div><h2 className="font-semibold text-neutral-900">1. Elegir grupos</h2><p className="mt-1 text-sm text-neutral-500">La configuración de esta liga define {configuredGroups} grupos y {config?.qualifiersPerGroup ?? 2} clasificados por grupo.</p></div><button type="button" onClick={() => void createGroups()} disabled={working} className="btn-primary">{working ? 'Creando...' : `Crear ${configuredGroups} grupos`}</button></section>
      ) : (
        <>
          <section className="card space-y-4 p-6"><div><h2 className="font-semibold text-neutral-900">2. Asignar equipos</h2><p className="mt-1 text-sm text-neutral-500">Cada equipo debe pertenecer a un solo grupo. El administrador decide la distribución.</p></div><div className="grid gap-4 md:grid-cols-2">{groups.map((group) => <div key={group.id} className="rounded-xl border border-neutral-200 p-4"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-neutral-900">{group.name}</h3><span className="text-xs text-neutral-500">{(assignments[group.id] ?? []).length} equipos</span></div><div className="space-y-2">{teams.filter((team) => (assignments[group.id] ?? []).includes(team.id)).map((team) => <div key={team.id} className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-sm"><span>{team.name}</span><select className="input w-auto py-1 text-xs" value={group.id} onChange={(e) => moveTeam(team.id, e.target.value)}><option value={group.id}>{group.name}</option>{groups.filter((other) => other.id !== group.id).map((other) => <option key={other.id} value={other.id}>{other.name}</option>)}</select></div>)}</div></div>)}</div><div className="flex justify-end"><button type="button" onClick={() => void saveAssignments()} disabled={working || !allAssigned} className="btn-primary">{working ? 'Guardando...' : 'Guardar asignación'}</button></div></section>

          <section className="card space-y-4 p-6"><div><h2 className="font-semibold text-neutral-900">3. Generar partidos</h2><p className="mt-1 text-sm text-neutral-500">Se crea un todos-contra-todos dentro de cada grupo. Los partidos quedan en la fase de grupos.</p></div><button type="button" onClick={() => void generateMatches()} disabled={working || !allAssigned || groupMatches > 0} className="btn-primary">{groupMatches > 0 ? 'Partidos generados' : 'Generar partidos'}</button></section>

          {groupMatches > 0 && <section className="card space-y-4 p-6"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><div><h2 className="font-semibold text-neutral-900">4. Clasificación</h2><p className="mt-1 text-sm text-neutral-500">Partidos terminados: {finishedMatches}/{groupMatches}</p></div>{groupStageDone ? <span className="inline-flex items-center gap-2 text-sm font-medium text-green-700"><CheckCircle2 size={18} /> Todos los grupos terminados</span> : <span className="text-sm text-neutral-500">Faltan partidos por terminar</span>}</div><div className="grid gap-4 md:grid-cols-2">{groups.map((group) => <div key={group.id} className="overflow-hidden rounded-xl border border-neutral-200"><div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 font-semibold">{group.name}</div><div className="divide-y divide-neutral-100">{(standings[group.id] ?? []).map((row, index) => <div key={row.teamId} className="flex items-center justify-between px-4 py-3 text-sm"><div className="flex items-center gap-3"><span className="w-5 text-neutral-400">{index + 1}</span><span className="font-medium">{row.teamId}</span></div><span className="font-semibold">{row.points} pts</span></div>)}</div></div>)}</div>{groupStageDone && <div className="flex justify-end"><button type="button" onClick={() => void generateKnockout()} disabled={working} className="btn-primary">{working ? 'Generando...' : 'Generar eliminación'}</button></div>}</section>}
        </>
      )}
    </div>
  );
}