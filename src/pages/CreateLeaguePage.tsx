import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ImagePlus, Trophy } from 'lucide-react';
import { useAuth } from '@/hooks';
import { leagueService } from '@/services';
import { FORMAT_DESCRIPTIONS, FORMAT_LABELS, GroupStageConfig, LeagueFormat, PlayoffFormatConfig } from '@/types';

const SPORT = 'Fútbol';
const formats: LeagueFormat[] = ['league', 'league-playoff', 'league-knockout', 'group-knockout', 'custom'];

export function CreateLeaguePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#2563eb');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [format, setFormat] = useState<LeagueFormat>('league');
  const [playoffFormat, setPlayoffFormat] = useState<PlayoffFormatConfig>({ quarterfinal: 'single-match', semifinal: 'single-match', final: 'single-match' });
  const [groupCount, setGroupCount] = useState(4);
  const [qualifiersPerGroup, setQualifiersPerGroup] = useState(2);
  const [groupPlayoffFormat, setGroupPlayoffFormat] = useState<'single-match' | 'home-and-away'>('single-match');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogoChange = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('El archivo debe ser una imagen.'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('La imagen no puede superar 2 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => { setLogoUrl(typeof reader.result === 'string' ? reader.result : null); setError(null); };
    reader.onerror = () => setError('No se pudo cargar la imagen.');
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!user) { setError('Debes iniciar sesión para crear una liga.'); return; }
    if (name.trim().length < 3) { setError('El nombre de la liga debe tener al menos 3 caracteres.'); return; }
    const knockoutTeams = groupCount * qualifiersPerGroup;
    if (format === 'group-knockout' && knockoutTeams !== 8) { setError('Para generar automáticamente cuartos, semifinales y final debes tener exactamente 8 clasificados.'); return; }
    try {
      setSubmitting(true);
      const groupStageConfig: GroupStageConfig | null = format === 'group-knockout' ? { groupCount, teamsPerGroup: null, qualifiersPerGroup, knockoutTeams, playoffFormat: groupPlayoffFormat } : null;
      const league = await leagueService.createLeague({ name, description, sport: SPORT, color, logoUrl, isPublic, inviteCode: inviteCode.trim() || null, format, playoffFormat: format === 'league-playoff' || format === 'group-knockout' ? playoffFormat : { quarterfinal: 'single-match', semifinal: 'single-match', final: 'single-match' }, groupStageConfig, ownerId: user.id });
      navigate(format === 'group-knockout' ? `/dashboard/leagues/${league.id}/group-stage` : `/dashboard/leagues/${league.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la liga.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <button type="button" onClick={() => navigate('/dashboard/leagues')} className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-800"><ArrowLeft size={16} /> Volver a ligas</button>
      <div><h1 className="text-2xl font-bold text-neutral-900">Crear liga</h1><p className="mt-1 text-sm text-neutral-500">Configura tu competición y conviértete automáticamente en su propietario.</p></div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <section className="card space-y-5 p-6">
          <div className="flex items-center gap-2"><Trophy size={18} className="text-primary-600" /><h2 className="font-semibold text-neutral-900">Información de la liga</h2></div>
          <div><label className="label" htmlFor="league-name">Nombre</label><input id="league-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Liga Nacional" maxLength={80} disabled={submitting} /></div>
          <div><label className="label" htmlFor="league-description">Descripción</label><textarea id="league-description" className="input min-h-28 resize-y" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe brevemente tu competición..." maxLength={500} disabled={submitting} /></div>
          <div className="rounded-xl border border-primary-100 bg-primary-50 p-4"><div className="flex items-center gap-3"><Trophy size={20} className="text-primary-600" /><div><p className="text-sm font-semibold text-neutral-900">Deporte</p><p className="text-sm text-neutral-600">Fútbol</p><p className="mt-1 text-xs text-neutral-500">Competición de fútbol en Rocket League.</p></div></div></div>
          <div><label className="label" htmlFor="league-color">Color principal</label><div className="flex items-center gap-3"><input id="league-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-14 cursor-pointer rounded border border-neutral-200 bg-white p-1" disabled={submitting} /><input className="input flex-1" value={color} onChange={(e) => setColor(e.target.value)} disabled={submitting} /></div></div>
          <div><label className="label" htmlFor="league-logo">Logo</label><label htmlFor="league-logo" className="flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-neutral-300 p-4 hover:bg-neutral-50"><div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-neutral-100">{logoUrl ? <img src={logoUrl} alt="Logo de la liga" className="h-full w-full object-cover" /> : <ImagePlus size={24} className="text-neutral-400" />}</div><div><p className="text-sm font-medium text-neutral-800">Seleccionar imagen</p><p className="text-xs text-neutral-500">PNG, JPG o WEBP. Máximo 2 MB.</p></div><input id="league-logo" type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)} disabled={submitting} /></label></div>
        </section>
        <section className="card space-y-5 p-6">
          <h2 className="font-semibold text-neutral-900">Privacidad e invitaciones</h2>
          <label className="flex items-start gap-3"><input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="mt-1 h-4 w-4" disabled={submitting} /><span><span className="block text-sm font-medium text-neutral-900">Liga pública</span><span className="block text-xs text-neutral-500">Los usuarios podrán encontrarla en el explorador de ligas.</span></span></label>
          <div><label className="label" htmlFor="invite-code">Código de invitación</label><input id="invite-code" className="input uppercase" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase().replace(/\s/g, ''))} placeholder="Se generará automáticamente si lo dejas vacío" maxLength={12} disabled={submitting} /></div>
        </section>
        <section className="card space-y-5 p-6">
          <div><h2 className="font-semibold text-neutral-900">Formato de competición</h2><p className="mt-1 text-sm text-neutral-500">Elige cómo se desarrollará la temporada.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">{formats.map((item) => <button key={item} type="button" onClick={() => setFormat(item)} className={`rounded-xl border p-4 text-left transition ${item === format ? 'border-primary-600 bg-primary-50' : 'border-neutral-200 hover:border-neutral-300'}`} disabled={submitting}><div className="flex items-center justify-between gap-3"><span className="font-medium text-neutral-900">{FORMAT_LABELS[item]}</span><span className={`h-4 w-4 rounded-full border-2 ${item === format ? 'border-primary-600 bg-primary-600' : 'border-neutral-300'}`} /></div><p className="mt-2 text-xs leading-relaxed text-neutral-500">{FORMAT_DESCRIPTIONS[item]}</p></button>)}</div>
          {format === 'group-knockout' && <div className="space-y-5 rounded-xl border border-primary-200 bg-primary-50/50 p-5"><div><h3 className="text-sm font-semibold text-neutral-900">Fase de grupos + eliminación</h3><p className="mt-1 text-xs text-neutral-600">Grupos → clasificación → cuartos → semifinales → final → campeón.</p></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="label" htmlFor="group-count">Número de grupos</label><select id="group-count" className="input" value={groupCount} onChange={(e) => setGroupCount(Number(e.target.value))} disabled={submitting}><option value={2}>2 grupos</option><option value={4}>4 grupos</option><option value={8}>8 grupos</option></select></div><div><label className="label" htmlFor="qualifiers">Clasificados por grupo</label><select id="qualifiers" className="input" value={qualifiersPerGroup} onChange={(e) => setQualifiersPerGroup(Number(e.target.value))} disabled={submitting}><option value={1}>1 equipo</option><option value={2}>2 equipos</option><option value={4}>4 equipos</option></select></div></div><div className="rounded-lg border border-neutral-200 bg-white p-3 text-sm"><span className="font-medium">Clasificados totales: {knockoutTeams}</span><span className="ml-2 text-neutral-500">{knockoutTeams === 8 ? '✓ Listos para cuartos' : 'Debes tener exactamente 8'}</span></div><div><p className="label">Formato de eliminación</p><div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setGroupPlayoffFormat('single-match')} className={`rounded-xl border p-3 text-left ${groupPlayoffFormat === 'single-match' ? 'border-primary-600 bg-primary-50' : 'border-neutral-200'}`} disabled={submitting}><span className="text-sm font-medium">Partido único</span><p className="mt-1 text-xs text-neutral-500">Cada cruce se decide en un partido.</p></button><button type="button" onClick={() => setGroupPlayoffFormat('home-and-away')} className={`rounded-xl border p-3 text-left ${groupPlayoffFormat === 'home-and-away' ? 'border-primary-600 bg-primary-50' : 'border-neutral-200'}`} disabled={submitting}><span className="text-sm font-medium">Ida y vuelta</span><p className="mt-1 text-xs text-neutral-500">Cada cruce se decide por marcador global.</p></button></div></div></div>}
        </section>
        <div className="flex justify-end gap-3"><button type="button" onClick={() => navigate('/dashboard/leagues')} className="btn-secondary" disabled={submitting}>Cancelar</button><button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Creando...' : 'Crear liga'}</button></div>
      </form>
    </div>
  );
}