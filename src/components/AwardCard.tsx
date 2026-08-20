import { AwardCandidate } from '@/types';
import { TeamBadge } from './TeamBadge';

interface AwardCardProps {
  candidate: AwardCandidate;
  showBreakdown?: boolean;
}

export function AwardCard({ candidate, showBreakdown = false }: AwardCardProps) {
  const isTop3 = candidate.rank <= 3;
  const rankColors = ['#f59e0b', '#94a3b8', '#b45309'];

  return (
    <div className={`card p-4 ${isTop3 ? 'ring-2' : ''}`} style={isTop3 ? { boxShadow: `0 0 0 2px ${rankColors[candidate.rank - 1]}` } : {}}>
      <div className="flex items-center gap-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
          style={{ backgroundColor: isTop3 ? rankColors[candidate.rank - 1] : '#f1f5f9', color: isTop3 ? 'white' : '#64748b' }}
        >
          {candidate.rank}
        </div>
        <TeamBadge name={candidate.teamName} shortName={candidate.teamName} color={candidate.teamColor} size="sm" />
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-neutral-900">{candidate.playerName}</h4>
          <p className="truncate text-xs text-neutral-500">{candidate.teamName}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-primary-700">{candidate.performancePoints}</p>
          <p className="text-xs text-neutral-400">pts</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-lg bg-neutral-50 py-1.5">
          <p className="font-bold text-neutral-900">{candidate.goals}</p>
          <p className="text-xs text-neutral-400">Goles</p>
        </div>
        <div className="rounded-lg bg-neutral-50 py-1.5">
          <p className="font-bold text-neutral-900">{candidate.assists}</p>
          <p className="text-xs text-neutral-400">Asist.</p>
        </div>
        <div className="rounded-lg bg-neutral-50 py-1.5">
          <p className="font-bold text-neutral-900">{candidate.mvpAwards}</p>
          <p className="text-xs text-neutral-400">MVP</p>
        </div>
      </div>

      {showBreakdown && candidate.pointBreakdown.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-neutral-100 pt-3">
          {candidate.pointBreakdown.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-neutral-500">{item.label}</span>
              <span className="font-medium text-neutral-700">+{item.points}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
