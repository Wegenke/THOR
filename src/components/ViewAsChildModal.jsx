import { useQuery } from '@tanstack/react-query'
import { buildAvatarSrc } from '../utils/avatar'
import { viewChildDashboard } from '../api/dashboard'

const STATUS_LABELS = {
  assigned: 'Ready to start',
  in_progress: 'In progress',
  paused: 'Paused',
  parent_paused: 'Paused by parent',
  submitted: 'Waiting for review',
  rejected: 'Rejected — needs attention'
}

export default function ViewAsChildModal({ child, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'view-child', child.id],
    queryFn: () => viewChildDashboard(child.id)
  })

  const assignments = data?.assignments ?? []
  const rewards = data?.rewards ?? []

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/95">

      {/* Header */}
      <div className="flex items-center px-6 py-3 border-b border-white/10 gap-4">
        <div className="flex items-center gap-3">
          {child.avatar && (
            <img src={buildAvatarSrc(child.avatar)} alt={child.name} className="w-10 h-10 rounded-full" />
          )}
          <span className="text-lg font-semibold text-white">{child.nick_name || child.name}</span>
          <span className="bg-amber-500/20 text-amber-300 text-xs px-2 py-0.5 rounded-full">Viewing as</span>
        </div>
        <div className="flex-1" />
        <span className="bg-white/10 px-3 py-1 rounded-full text-sm font-medium text-white">
          {data?.points_balance ?? '—'} pts
        </span>
        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/10 text-sm font-medium text-white active:bg-white/20">
          Exit
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        {isLoading ? null : (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto">

            {/* Chores */}
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider px-1">
                Chores ({assignments.length})
              </h2>
              {assignments.length === 0 ? (
                <div className="text-white/30 text-sm text-center py-8">No active chores</div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {assignments.map(a => (
                    <div key={a.id} className="bg-white/15 rounded-xl p-4 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{a.emoji}</span>
                          <div>
                            <div className="font-semibold text-sm leading-tight text-white">{a.chore_title}</div>
                            <div className="text-white/50 text-xs mt-0.5">{STATUS_LABELS[a.status] ?? a.status}</div>
                          </div>
                        </div>
                        <div className="text-white text-sm font-semibold whitespace-nowrap">{a.points} pts</div>
                      </div>
                      {a.frequency && (
                        <div className="text-xs text-white/40">🔁 {a.frequency.charAt(0).toUpperCase() + a.frequency.slice(1)}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Rewards */}
            {rewards.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider px-1">
                  Rewards ({rewards.length})
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {rewards.map(r => (
                    <div key={r.id} className="bg-white/15 rounded-xl p-4 flex flex-col gap-1">
                      <div className="font-semibold text-sm text-white truncate">{r.name}</div>
                      <div className="text-xs text-white/40">
                        {r.my_contribution} / {r.points_required} pts
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-indigo-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min(100, (r.my_contribution / r.points_required) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>
        )}
      </div>

    </div>
  )
}
