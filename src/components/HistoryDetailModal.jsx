import { buildAvatarSrc } from '../utils/avatar'
import CommentThread from './CommentThread'

const TX_LABELS = {
  chore_approved: 'Chore Approved',
  reward_contribution: 'Reward Contribution',
  reward_refund: 'Reward Refund',
  adjustment_reward: 'Reward',
  adjustment_penalty: 'Penalty'
}

const TX_COLORS = {
  chore_approved: 'text-green-400',
  reward_contribution: 'text-red-400',
  reward_refund: 'text-amber-400',
  adjustment_reward: 'text-green-400',
  adjustment_penalty: 'text-red-400'
}

const TX_EMOJI = {
  chore_approved: '✅',
  reward_contribution: '🎁',
  reward_refund: '↩️',
  adjustment_reward: '⭐',
  adjustment_penalty: '⚠️'
}

export default function HistoryDetailModal({ item, kind, onClose }) {
  if (kind === 'transaction') return <TxDetail tx={item} onClose={onClose} />
  if (kind === 'missed') return <MissedDetail assignment={item} onClose={onClose} />
  return null
}

function Shell({ title, emoji, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-[28rem] bg-slate-800 rounded-2xl p-5 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl shrink-0">{emoji}</span>
            <span className="font-semibold truncate">{title}</span>
          </div>
          <button onClick={onClose} className="text-white/50 active:text-white/80 text-lg shrink-0">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function TxDetail({ tx, onClose }) {
  const isChore = tx.source === 'chore_approved'
  const title = tx.reference_title ?? TX_LABELS[tx.source]
  const emoji = TX_EMOJI[tx.source] ?? '•'

  return (
    <Shell title={title} emoji={emoji} onClose={onClose}>
      <div className="flex flex-col gap-2">
        <Row label="Type" value={TX_LABELS[tx.source] ?? tx.source} />
        {tx.child_name && (
          <Row label="Child" valueNode={
            <div className="flex items-center gap-2">
              <span className="text-sm">{tx.child_name}</span>
              {tx.child_avatar && (
                <img src={buildAvatarSrc(tx.child_avatar)} alt={tx.child_name} className="w-6 h-6 rounded-full" />
              )}
            </div>
          } />
        )}
        <Row label="Date" value={new Date(tx.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} />
        <Row label="Points" valueNode={
          <span className={`font-semibold ${TX_COLORS[tx.source] ?? 'text-white/60'}`}>
            {tx.amount > 0 ? '+' : ''}{tx.amount} pts
          </span>
        } />
      </div>

      {isChore && tx.reference_id && (
        <CommentThread assignmentId={tx.reference_id} />
      )}
    </Shell>
  )
}

function MissedDetail({ assignment, onClose }) {
  const title = assignment.chore_title
  const emoji = assignment.emoji || '🚫'
  const isOverdue = assignment.status === 'assigned'

  return (
    <Shell title={title} emoji={emoji} onClose={onClose}>
      <div className="flex flex-col gap-2">
        <Row label="Status" valueNode={
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
            isOverdue ? 'bg-amber-500/30 text-amber-200' : 'bg-red-500/20 text-red-300'
          }`}>
            {isOverdue ? 'Overdue' : 'Dismissed'}
          </span>
        } />
        {assignment.child_name && (
          <Row label="Child" valueNode={
            <div className="flex items-center gap-2">
              <span className="text-sm">{assignment.child_name}</span>
              {assignment.child_avatar && (
                <img src={buildAvatarSrc(assignment.child_avatar)} alt={assignment.child_name} className="w-6 h-6 rounded-full" />
              )}
            </div>
          } />
        )}
        <Row label="Assigned" value={new Date(assignment.assigned_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} />
        {assignment.points != null && (
          <Row label="Points" valueNode={<span className="text-white/40 line-through">{assignment.points} pts</span>} />
        )}
      </div>

      <CommentThread assignmentId={assignment.id} />
    </Shell>
  )
}

function Row({ label, value, valueNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-white/40 uppercase tracking-wider">{label}</span>
      {valueNode ?? <span className="text-sm">{value}</span>}
    </div>
  )
}
