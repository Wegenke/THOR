import { useQuery } from '@tanstack/react-query'
import { buildAvatarSrc } from '../utils/avatar'
import { viewChildDashboard } from '../api/dashboard'
import StatsBlock from './StatsBlock'

const ITEM_CAP = 5

const STATUS_LABELS = {
  in_progress: 'In progress',
  paused: 'Paused',
  parent_paused: 'Paused by parent'
}

export default function ChildOverlay({ child, onNavigate, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'view-child', child.id],
    queryFn: () => viewChildDashboard(child.id)
  })

  const assignments = data?.assignments ?? []
  const rewards = data?.rewards ?? []

  const pending = assignments.filter(a => a.status === 'submitted')
  const activePaused = assignments.filter(a => ['in_progress', 'paused', 'parent_paused'].includes(a.status))
  const funded = rewards
    .filter(r => r.status === 'funded' && (r.created_by === child.id || r.my_contribution > 0))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  const navigateAndClose = (tab, opts) => {
    onNavigate?.(tab, opts)
    onClose()
  }

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
        {!isLoading && (
          <div className="flex flex-col gap-4 max-w-3xl mx-auto">

            {/* Stats — tap → History (filtered to this child) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigateAndClose('history', { childId: child.id })}
              className="cursor-pointer active:opacity-80"
            >
              <StatsBlock childId={child.id} />
            </div>

            <Section
              title="⏳ Pending Approvals"
              items={pending}
              renderItem={a => <AssignmentItem assignment={a} />}
              onClick={() => navigateAndClose('dashboard')}
            />

            <Section
              title="🏃 Active / Paused"
              items={activePaused}
              renderItem={a => <AssignmentItem assignment={a} showStatus />}
              onClick={() => navigateAndClose('chores', { childName: child.name })}
            />

            <Section
              title="🎁 Funded Rewards"
              items={funded}
              renderItem={r => <RewardItem reward={r} />}
              onClick={() => navigateAndClose('rewards', { childId: child.id })}
            />

          </div>
        )}
      </div>

    </div>
  )
}

function Section({ title, items, renderItem, onClick }) {
  const visible = items.slice(0, ITEM_CAP)
  const overflow = items.length - visible.length

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      className="bg-white/5 rounded-xl p-4 flex flex-col gap-3 cursor-pointer active:bg-white/10"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white/40 uppercase tracking-wider">
          {title} ({items.length})
        </span>
        <span className="text-white/30 text-lg leading-none">→</span>
      </div>
      {items.length === 0 ? (
        <div className="text-white/30 text-sm text-center py-2">Nothing here</div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {visible.map(item => (
              <div key={item.id}>{renderItem(item)}</div>
            ))}
          </div>
          {overflow > 0 && (
            <span className="text-xs text-white/40 text-center">+{overflow} more</span>
          )}
        </>
      )}
    </div>
  )
}

function AssignmentItem({ assignment, showStatus }) {
  return (
    <div className="bg-white/5 rounded-lg px-3 py-2 flex items-center gap-3">
      <span className="text-2xl shrink-0">{assignment.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{assignment.chore_title}</div>
        {showStatus && (
          <div className="text-xs text-white/40">{STATUS_LABELS[assignment.status] ?? assignment.status}</div>
        )}
      </div>
      <span className="text-sm font-semibold text-white/70 whitespace-nowrap shrink-0">{assignment.points} pts</span>
    </div>
  )
}

function RewardItem({ reward }) {
  return (
    <div className="bg-white/5 rounded-lg px-3 py-2 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{reward.name}</div>
        <div className="text-xs text-white/40">contributed {reward.my_contribution} pts</div>
      </div>
      <span className="text-sm font-semibold text-white/70 whitespace-nowrap shrink-0">{reward.points_required} pts</span>
    </div>
  )
}
