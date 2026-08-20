import { useState, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, UserPlus, Trash2 } from 'lucide-react';
import { useAsync } from '@/hooks';
import { teamService, playerService } from '@/services';
import { LoadingState, ErrorState, TeamBadge, PlayerCard, Modal, Spinner, EmptyState } from '@/components';
import { Position } from '@/types';

const positions: Position[] = ['Portero', 'Defensa', 'Mediocampista', 'Delantero'];

export function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: team, loading: teamLoading, error: teamError } = useAsync(
    () => teamService.getTeamById(teamId!),
    [teamId, refreshKey],
  );
  const { data: players, loading: playersLoading } = useAsync(
    () => playerService.getPlayersByTeam(teamId!),
    [teamId, refreshKey],
  );

  if (teamLoading || playersLoading) return <LoadingState />;
  if (teamError) return <ErrorState message={teamError} />;
  if (!team) return <ErrorState message="Equipo no encontrado" />;

  const handlePlayerAdded = () => {
    setShowAddModal(false);
    setRefreshKey((k) => k + 1);
  };

  const handlePlayerRemoved = async (playerId: string) => {
    await playerService.removePlayer(playerId);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
      >
        <ArrowLeft size={16} />
        Volver
      </button>

      {/* Team header */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <TeamBadge name={team.name} shortName={team.shortName} color={team.color} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{team.name}</h1>
            <p className="text-sm text-neutral-500">{team.city}</p>
          </div>
        </div>
      </div>

      {/* Roster */}
      <div className="card">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-neutral-400" />
            <h2 className="text-lg font-semibold text-neutral-900">Plantilla</h2>
            <span className="badge bg-neutral-100 text-neutral-600">{players?.length ?? 0}</span>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm">
            <UserPlus size={16} />
            Añadir jugador
          </button>
        </div>

        {players && players.length > 0 ? (
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((player) => (
              <div key={player.id} className="relative group">
                <PlayerCard player={player} team={team} />
                <button
                  onClick={() => handlePlayerRemoved(player.id)}
                  className="absolute right-2 top-2 rounded-lg bg-white/80 p-1.5 text-error-500 opacity-0 transition-opacity hover:bg-error-50 group-hover:opacity-100"
                  title="Eliminar jugador"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Users size={32} />}
            title="Sin jugadores"
            message="Añade jugadores a la plantilla para empezar a registrar estadísticas."
          />
        )}
      </div>

      {showAddModal && (
        <AddPlayerModal teamId={team.id} onClose={() => setShowAddModal(false)} onSaved={handlePlayerAdded} />
      )}
    </div>
  );
}

function AddPlayerModal({
  teamId,
  onClose,
  onSaved,
}: {
  teamId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [position, setPosition] = useState<Position>('Delantero');
  const [jerseyNumber, setJerseyNumber] = useState('10');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await playerService.addPlayer({
        teamId,
        name,
        position,
        jerseyNumber: parseInt(jerseyNumber, 10),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al añadir jugador.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Añadir jugador"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleSubmit} className="btn-primary" disabled={submitting}>
            {submitting ? <Spinner /> : 'Añadir'}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg bg-error-50 border border-error-200 px-4 py-3 text-sm text-error-700">
          {error}
        </div>
      )}
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="player-name">Nombre del jugador</label>
          <input
            id="player-name"
            type="text"
            className="input"
            placeholder="Nombre completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="player-position">Posición</label>
          <select
            id="player-position"
            className="input"
            value={position}
            onChange={(e) => setPosition(e.target.value as Position)}
          >
            {positions.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="player-number">Número de camiseta</label>
          <input
            id="player-number"
            type="number"
            min={1}
            max={99}
            className="input"
            value={jerseyNumber}
            onChange={(e) => setJerseyNumber(e.target.value)}
            required
          />
        </div>
      </div>
    </Modal>
  );
}
