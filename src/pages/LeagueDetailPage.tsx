import { useState, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, CalendarDays, Users, BarChart3 } from 'lucide-react';
import { useAsync } from '@/hooks';
import { leagueService, teamService, matchService } from '@/services';
import { LoadingState, ErrorState, StandingsTable, MatchCard, TeamBadge, Modal, Spinner } from '@/components';
import { calculateStandings } from '@/utils/standings';
import { Match, Team } from '@/types';

type Tab = 'standings' | 'matches' | 'teams';

export function LeagueDetailPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('standings');
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  const { data: league, loading: leagueLoading, error: leagueError } = useAsync(
    () => leagueService.getLeagueById(leagueId!),
    [leagueId],
  );
  const { data: allTeams, loading: teamsLoading } = useAsync(() => teamService.getTeams(), []);
  const { data: allMatches, loading: matchesLoading } = useAsync(() => matchService.getMatches(), []);

  if (leagueLoading || teamsLoading || matchesLoading) return <LoadingState />;
  if (leagueError) return <ErrorState message={leagueError} />;
  if (!league) return <ErrorState message="Liga no encontrada" />;

  const teams = allTeams?.filter((t) => t.leagueId === league.id) ?? [];
  const matches = allMatches?.filter((m) => m.leagueId === league.id) ?? [];
  const standings = calculateStandings(teams.map((t) => t.id), matches);

  const tabs: { id: Tab; label: string; icon: typeof Trophy }[] = [
    { id: 'standings', label: 'Tabla', icon: BarChart3 },
    { id: 'matches', label: 'Partidos', icon: CalendarDays },
    { id: 'teams', label: 'Equipos', icon: Users },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      <button
        onClick={() => navigate('/dashboard/leagues')}
        className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
      >
        <ArrowLeft size={16} />
        Volver a ligas
      </button>

      {/* League header */}
      <div className="card overflow-hidden">
        <div className="h-3" style={{ backgroundColor: league.color }} />
        <div className="flex items-start gap-4 p-6">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-xl"
            style={{ backgroundColor: league.color }}
          >
            <Trophy size={30} className="text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-neutral-900">{league.name}</h1>
            <p className="text-sm text-neutral-500">{league.season} · {league.sport}</p>
            <p className="mt-2 text-sm text-neutral-600">{league.description}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-t border-neutral-200 px-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'standings' && (
        <div className="card overflow-hidden">
          <StandingsTable standings={standings} teams={teams} />
        </div>
      )}

      {tab === 'matches' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              teams={teams}
              onEditScore={(m) => setEditingMatch(m)}
            />
          ))}
        </div>
      )}

      {tab === 'teams' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => navigate(`/dashboard/teams/${team.id}`)}
              className="card p-5 text-left transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <TeamBadge name={team.name} shortName={team.shortName} color={team.color} size="lg" />
                <div>
                  <h3 className="font-semibold text-neutral-900">{team.name}</h3>
                  <p className="text-sm text-neutral-500">{team.city}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Score edit modal placeholder */}
      {editingMatch && (
        <ScoreEditModal
          match={editingMatch}
          teams={teams}
          onClose={() => setEditingMatch(null)}
          onSaved={() => {
            setEditingMatch(null);
            // Force re-render by navigating
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

function ScoreEditModal({
  match,
  teams,
  onClose,
  onSaved,
}: {
  match: Match;
  teams: Team[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const home = teams.find((t) => t.id === match.homeTeamId);
  const away = teams.find((t) => t.id === match.awayTeamId);
  const [homeScore, setHomeScore] = useState(match.homeScore?.toString() ?? '0');
  const [awayScore, setAwayScore] = useState(match.awayScore?.toString() ?? '0');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await matchService.updateScore({
        matchId: match.id,
        homeScore: parseInt(homeScore, 10),
        awayScore: parseInt(awayScore, 10),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar resultado.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Registrar resultado"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleSubmit} className="btn-primary" disabled={submitting}>
            {submitting ? <Spinner /> : 'Guardar'}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg bg-error-50 border border-error-200 px-4 py-3 text-sm text-error-700">
          {error}
        </div>
      )}
      <div className="flex items-center justify-around gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          {home && <TeamBadge name={home.name} shortName={home.shortName} color={home.color} size="lg" />}
          <span className="text-sm font-medium text-neutral-700">{home?.shortName}</span>
          <input
            type="number"
            min={0}
            max={20}
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            className="input w-20 text-center text-2xl font-bold"
          />
        </div>
        <span className="text-xl font-bold text-neutral-300">vs</span>
        <div className="flex flex-col items-center gap-2">
          {away && <TeamBadge name={away.name} shortName={away.shortName} color={away.color} size="lg" />}
          <span className="text-sm font-medium text-neutral-700">{away?.shortName}</span>
          <input
            type="number"
            min={0}
            max={20}
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            className="input w-20 text-center text-2xl font-bold"
          />
        </div>
      </div>
    </Modal>
  );
}
