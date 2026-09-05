import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Plus, RefreshCw, Trophy, Users } from 'lucide-react';
import { useAuth } from '@/hooks';
import { groupStageService, leagueService, matchService, seasonService, teamService } from '@/services';
import type { GroupStageConfig, League, Season, Team } from '@/types';
import type { GroupStage } from '@/services/groupStageService';

const emptyTeamForm = { name: '', shortName: '', city: '', color: '#111827', description: '', logoUrl: '', bannerUrl: '' };

export function GroupStagePage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [league, setLeague] = useState<League | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [groups, setGroups] = useState<GroupStage[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [standings, setStandings] = useState<Record<string, Awaited<ReturnType<typeof groupStageService.getGroupStandings>>>>({});
  const [groupMatches, setGroupMatches] = useState(0);
  const [finishedMatches, setFinishedMatches] = useState(0);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teamForm, setTeamForm] = useState(emptyTeamForm);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const config = league?.groupStageConfig as GroupStageConfig | null;
  const teamMap = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const assigned = useMemo(() => new Set(Object.values(assignments).flat()), [assignments]);
  const allAssigned = groups.length > 0 && groups.every((group) => (assignments[group.id] ?? []).length >= 2) && assigned.size === teams.length;

  const load = async () => {
    if (!leagueId) return;
    try {
      setLoading(true); setError(null);
      const [leagueData, seasonData, teamData] = await Promise.all([leagueService.getLeagueById(leagueId), seasonService.getActiveSeason(leagueId), teamService.getTeamsByLeague(leagueId)]);
      if (!leagueData) throw new Error('Liga no encontrada.');
      if (!seasonData) throw new Error('No existe una temporada activa.');
      setLeague(leagueData); setSeason(seasonData); setTeams(teamData);
      const groupData = await groupStageService.getGroups(seasonData.id);
      setGroups(groupData);
      const nextAssignments: Record<string, string[]> = {};
      for (const group of groupData) nextAssignments[group.id] = await groupStageService.getGroupTeamIds(group.id);
      setAssignments(nextAssignments);
      if (groupData.length) {
        const matches = await matchService.getMatchesByLeague(leagueId);
        const groupOnly = matches.filter((match) => match.seasonId === seasonData.id && match.phase === 'group');
        setGroupMatches(groupOnly.length); setFinishedMatches(groupOnly.filter((match) => match.status === 'finished').length);
        const entries = await Promise.all(groupData.map(async (group) => [group.id, await groupStageService.getGroupStandings(group.id)] as const));
        setStandings(Object.fromEntries(entries));
      } else { setGroupMatches(0); setFinishedMatches(0); setStandings({}); }
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cargar la fase de grupos.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [leagueId]);

  const createGroups = async () => {
    if (!leagueId || !season || !user || !config) return;
    try { setWorking(true); setError(null); const created = await groupStageService.createGroups(leagueId, season.id, user.id, config); setGroups(created); setAssignments(Object.fromEntries(created.map((group) => [group.id, []]))); setMessage('Grupos creados. Ahora crea y distribuye tus equipos.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudieron crear los grupos.'); }
    finally { setWorking(false); }
  };

  const createTeam = async () => {
    if (!leagueId || !user) return;
    if (!teamForm.name.trim() || !teamForm.shortName.trim() || !teamForm.city.trim()) { setError('Completa nombre, nombre corto y ciudad.'); return; }
    try {
      setWorking(true); setError(null);
      const team = await teamService.createTeam({ leagueId, name: teamForm.name, shortName: teamForm.shortName, city: teamForm.city, color: teamForm.color, logoUrl: teamForm.logoUrl || null, description: teamForm.description, bannerUrl: teamForm.bannerUrl || null }, user.id);
      setTeams((current) => [...current, team]);
      setTeamForm(emptyTeamForm); setShowCreateTeam(false); setMessage(`${team.name} fue creado. Ahora puedes asignarlo a un grupo.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo crear el equipo.'); }
    finally { setWorking(false); }
  };

  const saveAssignments = async () => {
    if (!leagueId || !season || !user) return;
    try { setWorking(true); setError(null); await groupStageService.assignTeams(leagueId, season.id, user.id, assignments); setMessage('Equipos asignados correctamente.'); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudieron guardar los equipos.'); }
    finally { setWorking(false); }
  };

  const generateMatches = async () => {
    if (!leagueId || !season || !user) return;
    try { setWorking(true); setError(null); await groupStageService.generateGroupMatches(leagueId, season.id, user.id); setMessage('Partidos de grupos generados.'); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudieron generar los partidos.'); }
    finally { setWorking(false); }
  };

  const generateKnockout = async () => {
    if (!leagueId || !season || !user) return;
    try { setWorking(true); setError(null); await groupStageService.generateKnockout(leagueId, season.id, user.id); setMessage('Eliminación generada automáticamente.'); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Todavía no se puede generar la eliminación.'); }
    finally { setWorking(false); }
  };

  const assignTeam = (teamId: string, groupId: string) => setAssignments((current) => { const next: Record<string, string[]> = {}; Object.entries(current).forEach(([id, ids]) => { next[id] = ids.filter((value) => value !== teamId); }); next[groupId] = [...(next[groupId] ?? []), teamId]; return next; });
  const removeFromGroup = (teamId: string, groupId: string) => setAssignments((current) => ({ ...current, [groupId]: (current[groupId] ?? []).filter((id) => id !== teamId) }));

  if (loading) return <div className="p-6 text-sm text-neutral-500">Cargando fase de grupos...</div>;

  return <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
    <button type="button" onClick={() => navigate(`/dashboard/leagues/${leagueId}`)} className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-800"><ArrowLeft size={16} /> Volver a la liga</button>
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="flex items-center gap-2"><Trophy size={22} className="text-primary-600" /><h1 className="text-2xl font-bold text-neutral-900">Fase de grupos</h1></div><p className="mt-1 text-sm text-neutral-500">{league?.name} · {season?.name}</p></div><button type="button" onClick={() => void load()} className="btn-secondary inline-flex items-center gap-2"><RefreshCw size={16} /> Actualizar</button></div>
    {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {message && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}

    {!groups.length ? <section className="card space-y-4 p-6"><h2 className="font-semibold text-neutral-900">1. Elegir grupos</h2><p className="text-sm text-neutral-500">Esta liga está configurada con {config?.groupCount ?? 4} grupos y {config?.qualifiersPerGroup ?? 2} clasificados por grupo.</p><button type="button" onClick={() => void createGroups()} disabled={working} className="btn-primary">{working ? 'Creando...' : 'Crear grupos'}</button></section> : <>
      <section className="card space-y-4 p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="font-semibold text-neutral-900">2. Crear y personalizar equipos</h2><p className="mt-1 text-sm text-neutral-500">Crea tus equipos primero. Después aparecerán disponibles para colocarlos en un grupo.</p></div><button type="button" onClick={() => setShowCreateTeam((value) => !value)} className="btn-primary inline-flex items-center justify-center gap-2"><Plus size={16} /> Crear equipo</button></div>
        {showCreateTeam && <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-4"><div className="grid gap-3 md:grid-cols-2"><input className="input" placeholder="Nombre del equipo" value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} /><input className="input" placeholder="Nombre corto (máx. 4)" maxLength={4} value={teamForm.shortName} onChange={(e) => setTeamForm({ ...teamForm, shortName: e.target.value })} /><input className="input" placeholder="Ciudad" value={teamForm.city} onChange={(e) => setTeamForm({ ...teamForm, city: e.target.value })} /><input className="input" type="color" value={teamForm.color} onChange={(e) => setTeamForm({ ...teamForm, color: e.target.value })} /><input className="input md:col-span-2" placeholder="URL del logo (opcional)" value={teamForm.logoUrl} onChange={(e) => setTeamForm({ ...teamForm, logoUrl: e.target.value })} /><input className="input md:col-span-2" placeholder="URL del banner (opcional)" value={teamForm.bannerUrl} onChange={(e) => setTeamForm({ ...teamForm, bannerUrl: e.target.value })} /><textarea className="input min-h-24 md:col-span-2" placeholder="Descripción (opcional)" value={teamForm.description} onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })} /></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowCreateTeam(false)} className="btn-secondary">Cancelar</button><button type="button" onClick={() => void createTeam()} disabled={working} className="btn-primary">{working ? 'Creando...' : 'Guardar equipo'}</button></div></div>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{teams.map((team) => <div key={team.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3"><div className="h-10 w-10 overflow-hidden rounded-full bg-neutral-100 flex items-center justify-center text-sm font-bold" style={{ border: `3px solid ${team.color || '#111827'}` }}>{team.logoUrl ? <img src={team.logoUrl} alt="" className="h-full w-full object-cover" /> : <span>{team.shortName?.slice(0, 3) || team.name.slice(0, 3).toUpperCase()}</span>}</div><div className="min-w-0"><p className="truncate font-medium text-neutral-900">{team.name}</p><p className="text-xs text-neutral-500">{team.city} · {team.shortName}</p></div></div>)}</div>
      </section>

      <section className="card space-y-4 p-6"><div><h2 className="font-semibold text-neutral-900">3. Asignar equipos a grupos</h2><p className="mt-1 text-sm text-neutral-500">Cada equipo puede estar en un solo grupo. Puedes moverlo de grupo antes de guardar.</p></div><div className="grid gap-4 md:grid-cols-2">{groups.map((group) => <div key={group.id} className="rounded-xl border border-neutral-200 overflow-hidden"><div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 font-semibold">{group.name}</div><div className="min-h-28 space-y-2 p-3">{(assignments[group.id] ?? []).map((teamId) => { const team = teamMap.get(teamId); return <div key={teamId} className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2"><span className="text-sm font-medium">{team?.name ?? teamId}</span><button type="button" onClick={() => removeFromGroup(teamId, group.id)} className="text-xs text-red-600">Quitar</button></div>; })}{!(assignments[group.id] ?? []).length && <p className="py-5 text-center text-xs text-neutral-400">Sin equipos</p>}</div></div>)}</div><div className="rounded-xl border border-dashed border-neutral-300 p-4"><div className="mb-3 flex items-center gap-2 text-sm font-medium"><Users size={16} /> Equipos sin asignar</div><div className="flex flex-wrap gap-2">{teams.filter((team) => !assigned.has(team.id)).map((team) => <div key={team.id} className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2"><span className="text-sm">{team.name}</span><select className="input h-8 py-1 text-xs" value="" onChange={(e) => e.target.value && assignTeam(team.id, e.target.value)}><option value="">Asignar...</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></div>)}{!teams.filter((team) => !assigned.has(team.id)).length && <p className="text-sm text-green-700">Todos los equipos están asignados.</p>}</div></div><div className="flex justify-end"><button type="button" onClick={() => void saveAssignments()} disabled={working || !allAssigned} className="btn-primary">{working ? 'Guardando...' : 'Guardar asignación'}</button></div></section>

      <section className="card space-y-4 p-6"><div><h2 className="font-semibold text-neutral-900">4. Generar partidos</h2><p className="mt-1 text-sm text-neutral-500">Se genera un todos-contra-todos dentro de cada grupo.</p></div><button type="button" onClick={() => void generateMatches()} disabled={working || !allAssigned || groupMatches > 0} className="btn-primary">{groupMatches ? 'Partidos generados' : 'Generar partidos'}</button></section>
      {groupMatches > 0 && <section className="card space-y-4 p-6"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><div><h2 className="font-semibold text-neutral-900">5. Clasificación de grupos</h2><p className="mt-1 text-sm text-neutral-500">Partidos terminados: {finishedMatches}/{groupMatches}</p></div>{groupMatches === finishedMatches ? <span className="inline-flex items-center gap-2 text-sm font-medium text-green-700"><CheckCircle2 size={18} /> Todos los grupos terminados</span> : <span className="text-sm text-neutral-500">Faltan partidos por terminar</span>}</div><div className="grid gap-4 md:grid-cols-2">{groups.map((group) => <div key={group.id} className="overflow-hidden rounded-xl border border-neutral-200"><div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 font-semibold">{group.name}</div><div className="divide-y divide-neutral-100">{(standings[group.id] ?? []).map((row, index) => <div key={row.teamId} className="flex items-center justify-between px-4 py-3 text-sm"><div className="flex items-center gap-3"><span className="w-5 text-neutral-400">{index + 1}</span><span className="font-medium">{teamMap.get(row.teamId)?.name ?? row.teamId}</span></div><span className="font-semibold">{row.points} pts</span></div>)}</div></div>)}</div>{groupMatches === finishedMatches && <div className="flex justify-end"><button type="button" onClick={() => void generateKnockout()} disabled={working} className="btn-primary">{working ? 'Generando...' : 'Generar eliminación'}</button></div>}</section>}
    </>}
  </div>;
}
